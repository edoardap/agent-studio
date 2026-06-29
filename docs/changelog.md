# Changelog — Agent Studio (protótipo)

## (não commitado) — Lacunas #7 e #8: preview do prompt na Fábrica, progresso por completude e gate de construção

> Resolve os pontos **#7** e **#8** de [`lacunas-conceituais.md`](./lacunas-conceituais.md), parte do **#6**
> (editar spec) e parte do **#10** (esconder afordâncias técnicas no Simples + caminho de conversa).

### Conversa: histórico multi-conversa + observability como debug

- **Histórico de conversas por agente** — o modelo passou a suportar **N conversas por agente**
  (antes era 1 fixa por `agentId`). Novo `activeConversationId` no contexto, com `openAgentChat`
  (abre a conversa mais recente do agente) e `startNewConversation` (cria uma nova). O painel lateral
  do chat lista o histórico (título + prévia), com busca, e clicar troca a conversa ativa.
  O botão **"Nova conversa"** (que era um `alert` morto) agora funciona. — `context/AppContext.tsx`,
  `pages/ChatAgent.tsx` (+`.css`), `pages/AgentsList.tsx`
- **Histórico no padrão do data-studio** — usando `monest-tests/data-studio`
  (`components/chat/ConversationList.tsx`) como referência: o histórico fica **abaixo das Bases de
  Conhecimento** (não acima), as conversas são **agrupadas** por "Fixadas / Hoje / Últimos 7 dias /
  Este mês / Antigas", e dá pra **fixar/desafixar** uma conversa (`toggleConversationPin` + campo
  `pinned` no tipo `Conversation`), com o botão de pin aparecendo no hover. — `context/AppContext.tsx`,
  `types/index.ts`, `pages/ChatAgent.tsx` (+`.css`)
- **Estado/Resumo + "Inspecionar Prompt" viraram debug do Avançado (#10, sub-ponto 3)** — os cards
  `state_json`/`summary_text` e o inspetor de prompt são artefatos de runtime/debug do motor, não
  features de usuário final. Agora só aparecem no **Modo Avançado** (perfil curador/engenheiro); no
  **Simples** a conversa fica limpa. Não foram removidos — continuam provando o critério 4.3
  (runtime opera com estado/summary/histórico). — `pages/ChatAgent.tsx`



- **Compilador compartilhado** — a rotina que preenche `{{camada.campo}}` / `{{token}}` no esqueleto
  do template foi extraída para **`utils/promptCompiler.ts`** (`compilePromptSkeleton`) e agora é
  usada tanto pelo chat (`ChatAgent`) quanto pela Fábrica, sem duplicação. — `utils/promptCompiler.ts`,
  `pages/ChatAgent.tsx`
- **Preview do prompt na Fábrica (#7)** — novo botão **"Pré-visualizar prompt"** abre um modal com o
  prompt compilado a partir do template selecionado + a spec atual. Como ainda não há conversa, os
  blocos de runtime aparecem como placeholders "injetado em tempo de execução". — `pages/Factory.tsx`
- **Progresso por completude real (#8)** — a barra usa `getCompletionPercent()` (camadas preenchidas
  / 7) em vez de `(passo_atual / 7)`. Os checkmarks do stepper passam a refletir a completude real de
  cada camada via `getLayerStatuses()`. — `utils/promptCompiler.ts`, `components/dashboard/StepProgress.tsx`,
  `pages/Factory.tsx`
- **Gate de construção** — "Construir Agente" só habilita quando as 7 camadas estão completas; um aviso
  lista o que falta. **A navegação entre camadas continua livre** (clique em qualquer passo do stepper).
  — `pages/Factory.tsx`, `pages/Factory.css`
- `getMissingLayers()` saiu de dentro do `AppContext` e passou a vir do util compartilhado.
  — `context/AppContext.tsx`
- **Navegação linear por camada** — botões **"Voltar"** e **"Continuar →"** no rodapé do formulário,
  para avançar/recuar uma camada por vez. O "Continuar" mostra um ✓ quando a camada atual está
  completa e fica discreto (sem bloquear) quando ainda falta — os tabs do stepper continuam
  permitindo pular livremente. Na última camada (Resposta) vira **"Revisar JSON"**. — `pages/Factory.tsx`,
  `pages/Factory.css`
- **Editar spec de agente existente (#6, parte "editar")** — botão de lápis no card do agente carrega a
  spec de volta na Fábrica (`editAgentSpec`). No modo edição há banner "Editando a spec de …", o botão
  vira **"Salvar Alterações"** e o agente é **atualizado no lugar** (preserva id, `createdAt`, integrações,
  modelo e status) — equivalente ao `PUT /agents/{id}` da Seção 13. "Cancelar Edição" descarta.
  Clonar/duplicar permanece como conveniência opcional (não está no documento). — `context/AppContext.tsx`,
  `components/dashboard/AgentCard.tsx` (+`.css`), `pages/AgentsList.tsx`, `pages/Factory.tsx` (+`.css`)

---

## Commit `13b380c` — "feat: criacao da parte mais avancada do prototipo e criacao do template master"

> 19 arquivos · +2082 / −252. Resumo das mudanças agrupadas por tema.
> Conceitos citados (template master, spec, runtime, compilador, AGENT_SYSTEM) estão
> explicados em [`glossario-conceitos.md`](./glossario-conceitos.md).

---

### 1. Modo Simples / Avançado (agora funcional)
Antes o toggle "Simples/Avançado" no menu lateral era estado local morto — não fazia nada.

- O estado `isAdvanced` foi movido para o `AppContext` e **persiste em `localStorage`**
  (`agentstudio.mode`). — `AppContext.tsx`, `Sidebar.tsx`
- No modo **Avançado**, o menu lateral revela a seção **"Motor (Avançado)"** com:
  - **Templates Master** (funcional)
  - Catálogo de Tools / Governança / Auditoria & Logs (marcados "em breve", desabilitados)
  — `Sidebar.tsx`, `Sidebar.css`

### 2. Template Master virou um conceito real
Antes os templates eram 3 strings fixas no JSX, sem nada por trás.

- Novo tipo **`MasterTemplate`** (`key`, `name`, `icon`, `description`, `promptSkeleton`,
  `specDefaults?`). — `types/index.ts`
- `promptSkeleton`: o **esqueleto do prompt** (`AGENT_SYSTEM`) com placeholders
  `{{camada.campo}}` (spec) e `{{state_json}}` / `{{recent_messages}}` / `{{user_message}}`
  (runtime). — `AppContext.tsx`
- 4 templates iniciais: **Vendas, Suporte, Onboarding** (com `specDefaults`) e
  **"Começar do zero"** (esqueleto neutro, sem defaults). — `AppContext.tsx`
- Estado + ações no contexto: `masterTemplates`, `updateMasterTemplate`, `addMasterTemplate`.

### 3. Nova tela: Templates Master (autoria de templates)
Onde o template master é **criado/editado** — atividade do curador, no modo Avançado.

- Lista de templates (cards), editor de nome/descrição e do **esqueleto do prompt**, botão
  "Novo" e legenda dos placeholders disponíveis. — `pages/Templates.tsx`, `pages/Templates.css`
- Rota registrada em `App.tsx` e breadcrumb em `TenantSelector.tsx`.

### 4. Fábrica: seleção de template mais clara e útil
- O seletor de template agora lê de `masterTemplates` (antes hardcoded). — `Factory.tsx`
- Removido o **"Personalizado..."** que criava um nome de template órfão (não criava nada).
- Ao selecionar um template, aparece a **descrição** + botão **"Ver esqueleto do prompt"**
  (preview do `promptSkeleton`).
- **Pré-preenchimento da spec:** `selectCreatorTemplate` preenche **apenas campos vazios** com
  os `specDefaults` do template (não sobrescreve o que o usuário digitou) e destaca os campos
  preenchidos. — `AppContext.tsx`, `Factory.tsx`
- Atalho "Criar ou editar templates em Templates Master" (ativa o Avançado e navega). 
- Estilos do card de dica/preview. — `Factory.css`

### 5. Card de agente: botões reorganizados
- O toggle de **ativar/inativar** saiu de cima do botão "Disponibilizar" e foi para o
  **cabeçalho do card**, com rótulo "Ativo/Inativo" (verde quando ativo). — `AgentCard.tsx`,
  `AgentCard.css`
- Linha de ações inferior ficou limpa: `Conversar` · `Disponibilizar` · 🗑️ deletar.

### 6. Observabilidade do chat + inspetor de prompt compilado
- Painel lateral do chat com cartões de **Estado da Conversa** (`state_json`) e **Resumo**
  (`summary_text`), com efeito de destaque ("glow") quando atualizam. — `ChatAgent.tsx`,
  `ChatAgent.css`
- Modal **"Inspecionar Prompt"** que mostra o `AGENT_SYSTEM` compilado (template + spec +
  estado + summary + janela recente de mensagens). — `ChatAgent.tsx`, `ChatAgent.css`

### 7. Documentação conceitual (novos arquivos em `docs/`)
- [`glossario-conceitos.md`](./glossario-conceitos.md) — o que é cada peça (template_master,
  spec, runtime, compilador, AGENT_SYSTEM, camadas, state_json/summary, tenant).
- [`lacunas-conceituais.md`](./lacunas-conceituais.md) — 10 lacunas (spec vs. protótipo),
  severidade e status (inclui itens já resolvidos e o ponto #10 em discussão).
- [`nota-correcao-spec.md`](./nota-correcao-spec.md) — correção da contradição
  Seção 8 ↔ Seção 10 do documento da spec.

### 8. Correções pontuais
- Bug do "Reiniciar Especificações": resetava o template para um valor órfão
  (`'sales_agent_v1'`) → agora usa o primeiro template real. — `AppContext.tsx`
- `AgentCard.tsx`: removido parâmetro não usado que quebrava o `tsc -b`.

---

### Lacunas resolvidas neste commit
- **#3** "Criar" vs "selecionar" template (seleção pura no fluxo de build + autoria separada).
- **#4** Seleção de template deixou de ser cega (descrição + preview + pré-preenchimento).

### Pendências conhecidas (ver `lacunas-conceituais.md`)
- **#10** Amigabilidade para o perfil não-técnico — 🔵 em discussão.
- #5 a #9 (template alimentar o preview do prompt, editar/clonar spec, preview na Fábrica,
  barra de progresso por completude, filtro por tenant).
