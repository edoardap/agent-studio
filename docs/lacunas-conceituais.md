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
| 6 | Não há editar/clonar spec de agente existente | **Protótipo** | ✅ Editar resolvido · clonar pendente |
| 7 | Preview do prompt compilado só existe no chat | **Protótipo** | ✅ Resolvido |
| 8 | Barra de progresso mede aba, não completude | **Protótipo** | ✅ Resolvido |
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

## 6. Sem editar (e, opcionalmente, clonar) spec de agente existente
**Falha do protótipo.** *(distinguir o que é requisito do que é conveniência)*

**Editar spec — É REQUISITO do documento Spec to Agent:**
- A Seção 13 pede `PUT /agents/{id}` — *"Atualiza a spec do agente."*
- A Seção 4.4 lista *"editor de spec"* como caminho de evolução.
- O critério de aceite #2 ("agentes diferentes trocando só a spec") é demonstrado editando.
- Hoje o protótipo só **cria** e **deleta** — não dá pra carregar a spec de um agente de volta
  na Fábrica e ajustar.
- **Recomendação:** ação "Editar spec" no card do agente (carrega a spec na Fábrica e faz o
  `createAgentFromSpec` virar um "salvar alterações" quando há um agente em edição).
- ✅ **Resolvido:** botão de **editar** (lápis) no card do agente chama `editAgentSpec(id)`, que carrega
  a spec (cópia profunda), o template master e o canal de volta na Fábrica e liga o modo edição
  (`editingAgentId`). Nesse modo a Fábrica mostra um banner "Editando a spec de …", o botão vira
  **"Salvar Alterações"** e o `createAgentFromSpec` **atualiza o agente no lugar** (preservando id,
  `createdAt`, integrações, modelo e status), em vez de criar um novo — equivalente ao `PUT /agents/{id}`.
  Há "Cancelar Edição" para descartar. — `AppContext.tsx`, `AgentCard.tsx`, `AgentsList.tsx`, `Factory.tsx`

**Clonar/duplicar spec — NÃO está no documento (conveniência opcional):**
- Clonar **não** é citado no Spec to Agent. O que existe perto é *"diff entre specs"* e
  *"versionamento avançado"*, ambos **explicitamente Fora do escopo** (Seção 5).
- Faz sentido conceitualmente (duplicar → mudar 2 campos → salvar = literalmente "agente diferente
  trocando só a spec"), mas é **UX de conveniência**, não requisito do piloto.
- **Recomendação:** tratar como "nice to have" de baixa prioridade; só implementar depois do
  "Editar spec", que é o que o documento realmente cobra.

## 7. Preview do prompt compilado só no chat
**Falha do protótipo.**
- O modal "Inspecionar Prompt" existe na conversa, mas não na Fábrica.
- **Recomendação:** botão "Pré-visualizar prompt" na Fábrica, usando template + spec atual.
  Reforça o critério 4.2 ("a compilação funciona").
- ✅ **Resolvido:** adicionado o botão **"Pré-visualizar prompt"** na Fábrica, que abre um modal com o
  prompt compilado a partir do **esqueleto do template selecionado + a spec atual**. A rotina de
  compilação foi extraída para `utils/promptCompiler.ts` (`compilePromptSkeleton`) e agora é
  **compartilhada** entre a Fábrica e o chat (`ChatAgent`), então as duas telas nunca divergem.
  Como na Fábrica ainda não há conversa, os blocos de runtime (`{{state_json}}`, `{{user_message}}`
  etc.) aparecem como placeholders "injetado em tempo de execução".

## 8. Barra de progresso enganosa
**Falha do protótipo.**
- Calcula `(passo_atual / 7)`, ou seja, mede em qual aba você está, não o quanto preencheu.
- **Recomendação:** medir completude real via `getMissingLayers()` (já existe no contexto).
- ✅ **Resolvido:** a barra agora usa `getCompletionPercent()` (camadas preenchidas / 7) em
  `utils/promptCompiler.ts`. Os checkmarks do stepper também passaram a refletir a **completude real**
  de cada camada (via `getLayerStatuses()`), não mais a posição da aba. O botão **"Construir Agente"**
  só é habilitado quando **todas as 7 camadas** estão completas — mas a **navegação entre camadas
  continua livre** e um aviso lista quais camadas ainda faltam.

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
  - ✅ **Parcialmente implementado:** na tela de conversa com o agente, os cards de **Estado**
    (`state_json`) e **Resumo** (`summary_text`) e o botão **"Inspecionar Prompt"** — todos
    artefatos de runtime/debug do motor — passaram a aparecer **só no Modo Avançado**. No Simples a
    conversa fica limpa para o usuário final. Não foram removidos: continuam servindo de
    observability para o perfil curador/engenheiro e provam o critério 4.3.

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
