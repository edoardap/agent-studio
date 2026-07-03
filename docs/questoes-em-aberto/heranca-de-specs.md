# Herança de Specs entre Agentes

Este documento detalha as opções de design para permitir que **um agente herde a spec de outro agente** na Fábrica de Agentes, e a recomendação de implementação.

> Relacionado: [`tradeoffs-armazenamento-spec.md`](./tradeoffs-armazenamento-spec.md) (como a spec é armazenada),
> [`tradeoffs-armazenamento-templates.md`](./tradeoffs-armazenamento-templates.md) (copy-on-write de template)
> e [`../glossario-conceitos.md`](../glossario-conceitos.md) (Template vs. Spec vs. Runtime).

## Contexto

A spec de um agente é composta por camadas cognitivas (Identity, Behavior, Security, Context,
Memory, Planning, Action, Response — ver [`../camadas-da-spec.md`](../camadas-da-spec.md)). Surgiu a
pergunta: **é possível um agente herdar a spec de outro? Ele herdaria a spec por completo ou
camada a camada? E como isso se comporta ao longo do tempo (versões, atualização do "pai")?**

Importante distinguir **herança de spec** de dois conceitos próximos que já existem no projeto:

| Conceito | O que é | Onde já aparece |
|---|---|---|
| **Template master → agente** | Esqueleto de prompt compartilhado por uma *família*; o agente instancia uma cópia. | `tradeoffs-armazenamento-templates.md` (copy-on-write) |
| **Herança agente → agente** | Um agente reusa a **spec** (valores) de outro agente-base. | **Este documento** |
| **Composição / sub-agentes** | Um agente **chama** outro em runtime (orquestração). | Fora do escopo do piloto |

Herança de spec é sobre **reaproveitar configuração**, não sobre orquestração em runtime.

---

## Achado da indústria (2025/2026)

Pesquisa sobre plataformas de agentes (OpenAI Agents SDK, Google ADK, Bedrock Agents, LangGraph,
CrewAI, AutoGen, Dify, Copilot Studio, Letta Agent File) revelou um padrão claro:

> **Quase nenhuma plataforma relevante faz "herança viva" de spec.** Elas fazem
> **cópia-na-criação** (template → fork). ADK/CrewAI oferecem *composição* (sub-agentes por
> referência), que é coisa diferente de herdar configuração.

Isso é coerente com a recomendação que o projeto **já adotou** para templates
(`tradeoffs-armazenamento-templates.md`): copy-on-write + referência de auditoria. Herança entre
agentes é o mesmo padrão, um nível acima. Quando alguém quer herança declarativa de verdade, o
análogo canônico é o **overlay do Kustomize** (base + override), com semântica de merge explícita
(RFC 7386 / JSON Merge Patch).

---

## As duas semânticas de herança

### Modelo 1 — Herança da spec inteira (fork completo)
O agente-filho nasce como **cópia integral** do `config_json` do pai; a partir daí o usuário edita
o que quiser. É o copy-on-write puro, idêntico ao clonar.

**Prós**
- Simples e previsível; isolamento total (mudar o pai nunca afeta o filho).
- Snapshot trivial — é literalmente um insert de uma linha.

**Contras**
- Sem atualização em massa: melhorias no pai **não** chegam aos filhos.
- A "relação" pai→filho é só histórica; não há reuso vivo de camadas.

### Modelo 2 — Herança por camada (overlay: base + override) ⭐
O filho **referencia** o pai e sobrescreve apenas **camadas/campos específicos**; o restante é
*deep-merge* do pai. Ex.: um **"Agente Base Corporativo"** define `Security` + `Behavior` da
empresa inteira; cada filho herda essas duas camadas e só preenche `Identity`, `Action`, `Response`.

**Prós**
- Combina 1:1 com a arquitetura **em camadas** da spec — é o caso de uso mais natural que a
  modelagem em camadas habilita.
- **Governança central:** política de segurança/tom padronizada numa camada herdada por todos.
- Muda a camada `Security` do pai → os filhos podem receber (quando re-resolvidos).

**Contras**
- Exige **semântica de merge bem definida**.
- Risco de **efeito cascata** se a resolução for "viva" (mudar o pai altera filhos em produção sem
  aviso) — o mesmo risco que `tradeoffs-armazenamento-templates.md` já teme.

---

## Semântica de merge (obrigatória se usar o Modelo 2)

Decidir explicitamente, seguindo RFC 7386 (JSON Merge Patch):

| Regra | Decisão recomendada |
|---|---|
| **Objetos (camadas)** | Deep-merge: o filho sobrescreve só os campos que declara; o resto vem do pai. |
| **Arrays** (`tools`, `knowledge_bases`, `key_facts_to_remember`) | **Substituem** (a lista do filho troca a do pai — não concatena). Concatenação gera duplicatas silenciosas. |
| **`null`** | Significa **"apagar o campo herdado"** (voltar ao default). |
| **Ausência de campo** | Herda do pai (sem override). |

> A decisão "arrays substituem" é a mais segura para tools/bases: evita um filho acumular
> ferramentas do pai que ele não deveria ter.

---

## Interseção crítica: herança × versionamento

Esta é a regra que evita o pesadelo de produção:

> **Nunca deixe um filho vivo apontar para `pai@latest`.** Fixe (`pin`) `pai@N` e **congele** a
> spec resolvida no momento do deploy — filosofia de *lockfile*.

- O pai evolui (`v2`, `v3`) sem impactar filhos já publicados.
- O filho só recebe as mudanças do pai quando é **re-resolvido explicitamente** (ex.: botão
  "Atualizar a partir do pai"), gerando uma nova versão do filho.
- Isso elimina o efeito cascata e mantém agentes de produção estáveis.

---

## Recomendação de Design

**Adotar a semântica do Modelo 2 (por camada), mas materializar como Modelo 1 (copy-on-write) na
hora de construir/deployar.** Em detalhe:

1. **Na Fábrica**, o filho pode referenciar `parent_agent_id` e guardar apenas um `overrides_json`
   (as camadas/campos que ele muda).
2. **No build**, o compilador **resolve** pai + filho (aplicando a semântica de merge acima) e
   **congela a spec resolvida** no `config_json` do filho — exatamente o copy-on-write já usado
   para template master.
3. `parent_agent_id` + `overrides_json` ficam apenas para **linhagem/auditoria e re-resolução
   manual**, **nunca** para execução em runtime (o runtime lê sempre a `config_json` resolvida).
4. O filho **pina a versão do pai** (`parent_version`) e só atualiza por ação explícita.

### Esboço de modelo de dados

```sql
agents (
  id UUID PK,
  tenant_id UUID,
  name TEXT,
  status TEXT,
  master_template_key TEXT,       -- copy-on-write do template (ver doc de templates)
  parent_agent_id UUID NULL,      -- HERANÇA: linhagem do agente-base
  parent_version INT NULL,        -- versão PINADA do pai (nunca @latest)
  overrides_json JSONB NULL,      -- só as camadas/campos sobrescritos pelo filho
  config_json JSONB,              -- SPEC RESOLVIDA E CONGELADA (pai+filho) + "schema_version"
  created_at, updated_at
)
```

> `config_json` é sempre a spec **já resolvida** — o runtime não faz merge. O merge acontece só na
> construção/edição, na camada de aplicação (mesmo lugar da validação Zod).

### Fluxo resumido

1. Usuário escolhe "herdar de \<Agente Base\>" ao criar um agente.
2. A Fábrica carrega a spec do pai (versão pinada) como base; o usuário edita algumas camadas.
3. Ao **Construir**, o compilador faz o merge (pai@N + overrides) → `config_json` resolvida.
4. Mudou o pai depois? O filho continua estável até alguém clicar "Atualizar a partir do pai",
   que re-resolve e gera nova versão do filho.

---

## Escopo no piloto

- Herança **não é requisito** do documento "Spec to Agent" original (assim como clonar — ver
  [`../lacunas-conceituais.md`](../lacunas-conceituais.md), item 6). É evolução arquitetural.
- Para o piloto atual (estado em memória, sem backend), basta deixar a **modelagem preparada**:
  a spec já é um objeto único, então herança por copy-on-write é aditiva e não exige retrabalho.
- Implementação real fica para quando o backend (`ai-agents`) ganhar persistência e versionamento.
