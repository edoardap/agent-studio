# Implementation Plan: Copilot-Driven Agent Specification

We will transform the Creator Agent chat into an intelligent Copilot. The right-hand panel becomes the single source of truth, remaining fully editable by the user. The chat will analyze free-form inputs, populate the spec, automatically switch active tabs, and visually highlight updated fields.

---

## Proposed Changes

### [State & Context]

#### [MODIFY] [context/AppContext.tsx](file:///home/eduarda/agent-factory-studio/app_build/src/context/AppContext.tsx)
- Keep `creatorSpec` as the single source of truth.
- Expose `lastUpdatedFields: Record<string, string[]>` in the context to store which fields were updated by the AI in the last transaction.
- Upgrade `sendMessageToCreator` to:
  - Act as a Copilot: parse user intents and free-form requests.
  - Automatically populate relevant layered fields (Identity, Behavior, etc.) depending on the message context.
  - Pivot the active tab (`creatorStep`) automatically to focus the user's attention on the updated layer.
  - Set `lastUpdatedFields` with the keys of modified properties.
  - Analyze the current state of `creatorSpec` (checking for manual edits by the user) to customize prompts (e.g. referencing user edits).
  - Ask targeted, contextual questions for missing specifications instead of sequential form prompts.

---

### [Components & Styling]

#### [MODIFY] [Factory.tsx](file:///home/eduarda/agent-factory-studio/app_build/src/pages/Factory.tsx)
- Listen to changes in `lastUpdatedFields`.
- Maintain a local state `activeHighlights: Record<string, boolean>` that triggers when a field changes.
- Wrap inputs with dynamic class wrappers: if a field is in `activeHighlights`, add an `.updated-glow` animation class and render a small, pill-shaped `"Atualizado"` badge.
- Implement a `setTimeout` of 3 seconds to clear the active highlight, providing a smooth fade-out transition.

#### [MODIFY] [Factory.css](file:///home/eduarda/agent-factory-studio/app_build/src/pages/Factory.css)
Add CSS rules for:
- `.updated-glow`: A pulsing border glow animation (using a light green `#10b981` shadow).
- `.updated-badge`: A small, absolute-positioned label with a fade-in/fade-out transition.

---

## Verification Plan

### Automated Tests
- Run `npm run build` inside `app_build/` to verify type safety and import cleanups.

### Manual Verification
- Start the app, describe a complex agent in free-form Portuguese (e.g. "Quero um robô de testes que leia planilhas"), and verify:
  1. The right panel switches tabs to "Identidade" and "Ações".
  2. The extracted fields highlight in green with a temporary "Atualizado" badge.
  3. The progress bar recalculates.
- Manually change a field in the form (e.g. change the agent name), type something in chat, and verify the Copilot acknowledges the updated name.
