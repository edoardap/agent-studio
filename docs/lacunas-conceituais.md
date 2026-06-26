# Lacunas Conceituais — Spec & Protótipo "Spec to Agent"

> Lista para acompanhamento. Cada item diz **de quem é a falha** (documento da spec
> vs. protótipo), o que está errado e a recomendação.
> Para o glossário dos termos, ver `glossario-conceitos.md`.
> Para a correção formal da taxonomia, ver `nota-correcao-spec.md`.

## Resumo

| # | Lacuna | Falha de | Severidade |
|---|--------|----------|------------|
| 1 | Seção 8 ≠ Seção 10 (camadas divergentes) | **Documento** | Alta |
| 2 | Camada de Memória ausente na spec configurável | **Documento + Protótipo** | Alta |
| 3 | "Criar template" vs "selecionar template" confundidos | **Protótipo** | ✅ Resolvido |
| 4 | Seleção de template é cega (sem preview/descrição) | **Protótipo** | ✅ Resolvido |
| 5 | Template master não faz nada (cosmético) | **Protótipo** | ✅ Resolvido |
| 6 | Não há editar/clonar spec de agente existente | **Protótipo** | Média |
| 7 | Preview do prompt compilado só existe no chat | **Protótipo** | Baixa |
| 8 | Barra de progresso mede aba, não completude | **Protótipo** | Baixa |
| 9 | Tenant não filtra agentes | **Protótipo** | Baixa |
| 10 | Amigabilidade para o perfil não-técnico (dono/representante) | **Produto** | 🔵 Em discussão |

---

## 1. Seção 8 ≠ Seção 10 — taxonomia de camadas divergente
**Falha do documento.**
- Seção 8 lista: `Policy · Identity · Context · Memory · Planning · Action · Response`.
- Seção 10 lista: `Identity · Behavior · Security · Context · Planning · Action · Response`.
- Divergem em `Policy`/`Memory` (só na 8) e `Behavior`/`Security` (só na 10).
- **Consequência:** quem implementa não sabe qual lista é a verdadeira.
- **Recomendação:** taxonomia canônica única. Detalhe completo em `nota-correcao-spec.md`.

## 2. Camada de Memória ausente como bloco configurável
**Falha do documento (Seção 10) + protótipo.**
- A Seção 15 define a estratégia de memória (janela de 6–10 msgs, summary, state), mas
  `Memory` não aparece como bloco da spec na Seção 10 nem como passo na Fábrica.
- Hoje a memória só existe no **runtime** (painel do `ChatAgent`), nunca é configurável.
- **Recomendação:** adicionar bloco `memory` na spec e um passo "Memória" no stepper:
  `recent_window_size`, `enable_summary`, `key_facts_to_remember`.

## 3. "Criar template" vs "selecionar template" — atividades confundidas
**Falha do protótipo.** *(o ponto que mais gera confusão)*
- Existem DUAS atividades distintas que o protótipo mistura:
  1. **Autorar um template master** (curador, raro) → tela Templates Master.
  2. **Construir um agente** (usuário, frequente) → Fábrica: só deveria **selecionar** um
     template e preencher a spec.
- O defeito: na tela de **Identidade** da Fábrica, a opção **"Personalizado..."** dá a
  impressão de criar um template, mas **só define um nome órfão** — não cria esqueleto,
  não cria nada reutilizável.
- A conversa com o copiloto preenche a **spec**, **não** cria template.
- **Recomendação:**
  - No fluxo de construir agente: **apenas selecionar** um template existente (sem "criar").
  - Remover/repensar o "Personalizado" inline — ou trocá-lo por "Começar do template base genérico".
  - Criar template fica exclusivamente na tela Templates Master.
- ✅ **Resolvido:** o "Personalizado..." foi removido do passo Identidade; o seletor agora lista
  apenas templates existentes. Adicionado um atalho "Criar ou editar templates em Templates
  Master" que leva à tela de autoria (ativando o modo Avançado).

## 4. Seleção de template é cega
**Falha do protótipo.**
- Ao escolher um template na Identidade, o usuário não vê descrição, finalidade nem
  preview da estrutura. Está escolhendo às cegas.
- **Recomendação:** ao selecionar um template, mostrar sua descrição + preview do esqueleto;
  idealmente **pré-preencher os formulários da spec** com defaults daquela família.
  (Esse pré-preenchimento É o real valor de escolher um template pronto.)
- ✅ **Resolvido:** ao selecionar um template, o passo Identidade agora mostra a **descrição** e
  um botão "Ver esqueleto do prompt" (preview do `promptSkeleton`). Cada template ganhou
  `specDefaults`, que **pré-preenche apenas os campos vazios** da spec (sem sobrescrever o que o
  usuário já digitou), com destaque visual ("glow") nos campos preenchidos.

## 5. Template master é cosmético
**Falha do protótipo.**
- Trocar de template (Vendas → Suporte) não muda nada na spec nem no prompt — só troca um
  rótulo (`master_template_key`).
- A Seção 7.1 diz que o template "define a estrutura base"; isso não se reflete.
- **Recomendação:** o template selecionado deve alimentar o preview do prompt compilado
  (o `promptSkeleton` já existe na tela Templates Master) e, opcionalmente, pré-preencher a spec.
- ✅ **Resolvido:** o prompt compilado (modal "Inspecionar Prompt") agora **usa o esqueleto do
  template master** do agente e preenche as lacunas `{{...}}` com os valores da spec + runtime.
  Trocar de template muda de fato o prompt final, não só o rótulo. (Pré-preenchimento da spec já
  feito na lacuna #4.)

## 6. Sem editar/clonar spec de agente existente
**Falha do protótipo.**
- A spec pede `PUT /agents/{id}` (Seção 13) e o critério de aceite #2 ("agentes diferentes
  trocando só a spec"). Hoje só dá pra criar e deletar.
- **Recomendação:** ações "Editar spec" e "Duplicar" no card do agente (carregam a spec de
  volta na Fábrica). Demonstra literalmente o critério de aceite central do piloto.

## 7. Preview do prompt compilado só no chat
**Falha do protótipo.**
- O modal "Inspecionar Prompt" existe na conversa, mas não na Fábrica.
- **Recomendação:** botão "Pré-visualizar prompt" na Fábrica, usando template + spec atual.
  Reforça o critério 4.2 ("a compilação funciona").

## 8. Barra de progresso enganosa
**Falha do protótipo.**
- Calcula `(passo_atual / 7)`, ou seja, mede em qual aba você está, não o quanto preencheu.
- **Recomendação:** medir completude real via `getMissingLayers()` (já existe no contexto).

## 9. Tenant não filtra agentes
**Falha do protótipo.**
- Multi-tenant (RNF-01) está só no visual; trocar de tenant não filtra a lista de agentes.
- **Recomendação:** marcar cada agente com `tenant_id` e filtrar a lista por tenant ativo.

---

## 10. Amigabilidade para o perfil não-técnico — 🔵 EM DISCUSSÃO (decisão pendente)
**Questão de produto, não fechada.** Registrada para discussão futura.

**Contexto:** o usuário que **constrói** um agente provavelmente é um dono/representante da
empresa (não-técnico), enquanto quem **autora templates** e mexe no motor é um curador/engenheiro.
Esses dois perfis mapeiam no toggle **Simples / Avançado**:

| Perfil | Quem | O que faz | Modo |
|---|---|---|---|
| Dono / representante | Não-técnico | Constrói agentes (escolhe tipo + conversa) | Simples |
| Curador / engenheiro | Técnico | Autora templates, JSON, prompt | Avançado |

**Sub-pontos a decidir (NÃO implementados — aguardando decisão):**
- **(2) Linguagem de negócio no modo Simples:** "Template Master" viraria **"Que tipo de agente?"**
  (Vendas / Suporte / Boas-vindas / Começar do zero). Termos como "Template Master", "Compilador",
  "AGENT_SYSTEM" e o esqueleto do prompt ficariam só no modo Avançado.
- **(3) Conversa como caminho principal no Simples:** priorizar o chat com o copiloto e esconder
  afordâncias técnicas (Ver JSON, rótulos crus de camada) atrás do Avançado.

**Decisão pendente:** se/quando tornar o protótipo mais amigável para o não-técnico. Pode impactar
a percepção do piloto, então fica como ponto de discussão antes de implementar.

> ✅ **Já implementado deste tema:** opção **"Começar do zero"** (template base genérico, esqueleto
> neutro, sem defaults) — resposta arquitetural para "e se o usuário não quiser um template pronto?".
> Conceitualmente sempre há um esqueleto; "do zero" = template base + copiloto preenche.

---

## Observação geral
O protótipo está **mais estruturado que o backend real** (`ai-agents`), que hoje não tem 7
camadas, nem `state_json`/`summary`, nem registro de templates. Isso **não é problema** — o
piloto existe para validar a visão *antes* do backend evoluir. As lacunas acima são sobre
deixar essa visão **clara e coerente**, não sobre alinhar com o backend atual.
