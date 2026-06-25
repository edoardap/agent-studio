# Changelog — Agent Studio (protótipo)

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
