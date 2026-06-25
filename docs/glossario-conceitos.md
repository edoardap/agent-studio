# Glossário de Conceitos — "Spec to Agent" (Agent Factory)

> Objetivo: deixar claro **o que é cada peça** do conceito e como elas se encaixam.
> Leitura recomendada antes de mexer na Fábrica ou na tela de Templates Master.

## Mapa mental (a frase que resume tudo)

> **Template master** (esqueleto fixo) **+ Spec** (valores variáveis) **+ Runtime** (dados vivos)
> → o **Compilador** junta os três → produz o **AGENT_SYSTEM** → vai pro **LLM**.

```
┌─────────────────┐   ┌──────────────┐   ┌──────────────┐
│ TEMPLATE MASTER │ + │     SPEC      │ + │   RUNTIME    │
│ (esqueleto fixo)│   │ (config_json) │   │ (conversa)   │
└────────┬────────┘   └──────┬───────┘   └──────┬───────┘
         └───────────────────┴──────────────────┘
                             │
                      ┌──────▼───────┐
                      │  COMPILADOR  │  ("Spec to Agent")
                      └──────┬───────┘
                             │
                    ┌────────▼─────────┐
                    │   AGENT_SYSTEM   │ → LLM → resposta
                    │ (prompt final)   │
                    └──────────────────┘
```

---

## Termos

### 1. Template Master
**O que é:** o **esqueleto fixo** do prompt, compartilhado por uma *família* de agentes (ex.: todos os agentes de vendas). Contém a estrutura, a ordem das seções e o texto que é igual para todos — com **lacunas** (`{{...}}`) onde a spec entra.

**Analogia:** uma carta-modelo com espaços em branco.

**O que NÃO é:** não é o agente, não é o conteúdo específico. Trocar de template muda a *estrutura base*, não os dados.

**Quem cria:** curador/engenheiro, de forma deliberada e rara.

**Onde vive:**
- **Protótipo:** tela **Templates Master** (modo Avançado) → campo `promptSkeleton`.
- **Backend real (`ai-agents`):** arquivos YAML em `resources/prompts/*.yaml` (campo `prompt:`), renderizados via Jinja2. Não há registro/lookup por chave — cada agente aponta para um `PROMPT_PATH` fixo.

**Exemplo de esqueleto:**
```
Você é {{identity.agent_name}}, da {{context.company_name}}.
Regras de tom: {{behavior.behaviour_rules}}
Ferramentas: {{action.tools}}
```

---

### 2. Spec (especificação do agente / `config_json`)
**O que é:** os **valores variáveis** que definem UM agente específico — o que preenche as lacunas do template + o comportamento configurável. Organizada nas camadas cognitivas (Identity, Behavior, Security, Context, Memory, Planning, Action, Response).

**Analogia:** o que você escreve nos espaços em branco da carta-modelo.

**Quem cria:** o usuário de negócio, ao construir um agente — manualmente nos formulários **ou** conversando com o copiloto (que preenche os campos pra você).

**Ponto crucial:** criar a spec **não cria** um template. A spec sempre roda *sobre* um template existente.

**Onde vive:**
- **Protótipo:** `AgentSpec` em `types/index.ts`, editada na **Fábrica**.
- **Backend real:** hoje não existe um `AgentSpec` unificado — é metadata JSON + parâmetros por agente. (O protótipo está à frente do backend aqui, de propósito.)

---

### 3. Runtime (estado vivo da conversa)
**O que é:** os dados que só existem **durante uma conversa real** e mudam a cada mensagem: a mensagem atual do usuário, o histórico recente, o `summary` e o `state_json`.

**Analogia:** o contexto do atendimento de agora — quem está falando, o que já foi dito, em que ponto da conversa estamos.

**Onde vive:**
- **Protótipo:** painel de observabilidade do `ChatAgent` (`state_json`, `summary_text`, mensagens).
- **Backend real:** reconstruído a partir da tabela de mensagens (não há `state_json`/`summary` persistidos — o protótipo, de novo, está à frente).

---

### 4. Compilador ("Spec to Agent")
**O que é:** o componente que **junta** template + spec + runtime e produz o prompt final. É a peça central do piloto (seção 14 da spec).

**Analogia:** a impressora que pega a carta-modelo, preenche os espaços com seus dados e imprime a carta final.

**O que ele faz, em ordem:** carrega o template master → interpreta a spec → injeta contexto da conversa → insere summary → insere histórico recente → insere a mensagem atual → gera o prompt padronizado.

**Onde vive:**
- **Protótipo:** simulado no modal "Inspecionar Prompt" do `ChatAgent` (monta o texto a partir da spec + estado).
- **Backend real:** distribuído na inicialização do agente (`agents/lang.py` + `agents/prompt.py`), não há um "compilador" único.

---

### 5. AGENT_SYSTEM (prompt compilado)
**O que é:** o **resultado** do compilador — o prompt de sistema final, pronto pra enviar ao LLM. É o template com todas as lacunas preenchidas + os dados de runtime anexados.

**Analogia:** a carta final, impressa e pronta pra enviar.

**Onde ver no protótipo:** botão "Inspecionar Prompt" na tela de conversa com o agente.

---

### 6. Camadas cognitivas
**O que é:** a forma de organizar a spec em blocos lógicos (Identity, Behavior, Security, Context, Memory, Planning, Action, Response). Não viram tabelas no piloto — são estrutura lógica dentro do `config_json`.

> ⚠️ Há uma inconsistência no documento da spec sobre QUAIS são as 7 camadas.
> Ver `lacunas-conceituais.md` e `nota-correcao-spec.md`.

---

### 7. `state_json` e `summary_text`
- **`state_json`:** estado resumido e estruturado da conversa (fase atual, intenção do usuário, objetivo do agente, próxima ação). Muda a cada turno.
- **`summary_text`:** resumo em texto livre do que aconteceu na conversa, para dar contexto ao LLM sem mandar todo o histórico.

Ambos fazem parte do **runtime**, não da spec.

---

### 8. Tenant (multi-tenancy)
**O que é:** o "cliente"/organização dona dos agentes e conversas. Tudo é isolado por `tenant_id` (RNF-01).

**Onde vive:**
- **Protótipo:** `TenantSelector` no topo (hoje só visual — não filtra os agentes ainda).
- **Backend real:** `tenant_id` flui por todas as camadas (FK em threads/mensagens, relação N:N agente↔tenant).

---

## Tabela resumo: onde cada peça é criada e por quem

| Peça | Quem cria | Onde (protótipo) | Frequência |
|---|---|---|---|
| Template master | Curador | Tela Templates Master (Avançado) | Raro |
| Spec | Usuário de negócio | Fábrica (formulários + copiloto) | A cada novo agente |
| Runtime | Automático | Gerado durante a conversa | A cada mensagem |
| AGENT_SYSTEM | Compilador (automático) | Inspecionar Prompt | A cada execução |
