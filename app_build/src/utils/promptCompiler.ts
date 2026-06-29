import type { AgentSpec } from '../types';

/**
 * Compilador "Spec to Agent" (simulado).
 *
 * Pega o ESQUELETO de um template master e preenche as lacunas:
 *  - `{{camada.campo}}` → valor da spec (ex.: {{identity.agent_name}})
 *  - `{{token}}`        → valor de runtime injetado na execução
 *                         (ex.: {{state_json}}, {{user_message}})
 *
 * É a mesma rotina usada na inspeção do prompt no chat (ChatAgent) e
 * na pré-visualização da Fábrica (Factory). Mantida em um único lugar
 * para que os dois nunca divirjam.
 */
export const compilePromptSkeleton = (
  skeleton: string,
  spec: AgentSpec,
  runtimeValues: Record<string, string>,
): string =>
  skeleton.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
    if (path in runtimeValues) return runtimeValues[path];

    const value = path
      .split('.')
      .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), spec);

    if (value === undefined || value === null || value === '') {
      return `«${path} não preenchido»`;
    }
    if (Array.isArray(value)) {
      return value.length ? value.map(v => `- ${v}`).join('\n') : '(nenhuma)';
    }
    return String(value);
  });

/**
 * Placeholders de runtime para a pré-visualização na Fábrica, onde ainda
 * não existe uma conversa. Deixa explícito que esses blocos só são
 * preenchidos quando o agente roda de verdade.
 */
export const PREVIEW_RUNTIME_VALUES: Record<string, string> = {
  state_json: '«injetado pelo compilador em tempo de execução»',
  summary_text: '«injetado pelo compilador em tempo de execução»',
  recent_messages: '«injetado pelo compilador em tempo de execução»',
  user_message: '«injetado pelo compilador em tempo de execução»',
};

/** Uma camada da spec e se ela já está "completa" o suficiente para construir. */
export interface LayerStatus {
  /** Índice do passo no stepper (0..6). */
  index: number;
  /** Rótulo exibido (igual ao label do StepProgress). */
  label: string;
  complete: boolean;
}

/**
 * Completude real da spec, camada por camada (na ordem do stepper).
 * É a fonte única de verdade para a barra de progresso, os checkmarks
 * do stepper e o bloqueio do botão "Construir Agente".
 */
export const getLayerStatuses = (spec: AgentSpec): LayerStatus[] => [
  { index: 0, label: 'Identidade', complete: !!spec.identity.agent_name && !!spec.identity.agent_profile },
  { index: 1, label: 'Comportamento', complete: !!spec.behavior.behaviour_rules },
  { index: 2, label: 'Segurança', complete: !!spec.security.security_rules },
  { index: 3, label: 'Contexto', complete: !!spec.context.segment },
  { index: 4, label: 'Planejamento', complete: !!spec.planning.roteiro },
  { index: 5, label: 'Ações', complete: spec.action.tools.length > 0 },
  { index: 6, label: 'Resposta', complete: !!spec.response.task },
];

/** Rótulos das camadas que ainda faltam preencher. */
export const getMissingLayers = (spec: AgentSpec): string[] =>
  getLayerStatuses(spec)
    .filter(layer => !layer.complete)
    .map(layer => layer.label);

/** Percentual de completude (0–100) baseado nas camadas preenchidas. */
export const getCompletionPercent = (spec: AgentSpec): number => {
  const statuses = getLayerStatuses(spec);
  const done = statuses.filter(l => l.complete).length;
  return Math.round((done / statuses.length) * 100);
};
