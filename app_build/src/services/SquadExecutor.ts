/**
 * SquadExecutor
 *
 * Orquestra a execução de uma Squad:
 * 1. Recebe mensagem do usuário
 * 2. Passa pro Orquestrador
 * 3. Aplica regras de atribuição
 * 4. Delega pra agentes especializados
 * 5. Agrega respostas
 * 6. Retorna resultado
 */

import type { Squad, Agent, SquadMember, AssignmentRule } from '../types';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* TIPOS                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

export interface ConversationState {
  conversationId: string;
  squadId: string;
  userId: string;
  memory: Record<string, any>;
  messages: Array<{ role: 'user' | 'agent'; sender?: string; content: string; timestamp: string }>;
  currentStep: 'triagem' | 'processing' | 'delegation' | 'aggregation' | 'complete';
  assignedAgent: SquadMember | null;
  executionLog: ExecutionLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionLogEntry {
  timestamp: string;
  step: number;
  agentId?: string; // Presente quando a entrada corresponde a um agente real (não System/RuleEngine)
  agentName: string;
  agentRole: string;
  action: string; // "received", "delegated", "processed", "responded"
  input?: string;
  output?: string;
  internalOnly?: boolean; // Se foi uma delegação interna (agent-to-agent)
}

/** Callback disparado a cada passo da execução — usado para animar o nó ativo no canvas. */
export type OnStepCallback = (entry: ExecutionLogEntry) => void;

export interface ExecutionResult {
  success: boolean;
  publicResponse: string; // O que o cliente vê
  internalDelegations: Array<{
    from: string;
    to: string;
    message: string;
    response: string;
  }>;
  updatedState: ConversationState;
  executionTime: number;
}

export interface RuleEvaluationResult {
  matched: boolean;
  targetRole: string | null;
  reason: string;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* RULE ENGINE                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

class RuleEngine {
  /**
   * Avalia as regras de atribuição baseado no estado atual
   * Retorna o role do agente para o qual deve delegar
   */
  evaluate(
    rules: AssignmentRule[],
    state: ConversationState,
    squad: Squad
  ): RuleEvaluationResult {
    if (!rules || rules.length === 0) {
      return {
        matched: false,
        targetRole: null,
        reason: 'Nenhuma regra definida'
      };
    }

    for (const rule of rules) {
      const conditionMet = this.evaluateCondition(rule.condition, state);

      if (conditionMet) {
        const targetRole = this.extractTargetRole(rule.action);
        const memberExists = squad.members.some(m => m.role === targetRole);

        if (memberExists) {
          return {
            matched: true,
            targetRole,
            reason: `Condição "${rule.condition}" atendida → delegando para ${targetRole}`
          };
        }
      }
    }

    return {
      matched: false,
      targetRole: null,
      reason: 'Nenhuma regra foi atendida'
    };
  }

  /**
   * Avalia a condição (suporta sintaxe simples)
   * Ex: "ticket.priority == 'P1'" ou "issue_type == 'billing'"
   */
  private evaluateCondition(condition: string, state: ConversationState): boolean {
    try {
      // Simples parser para condições tipo "memory.priority == 'P1'"
      const match = condition.match(/memory\.(\w+)\s*(==|!=|>|<)\s*['"]*([^'"]+)['"]*$/);
      if (!match) return false;

      const [, key, operator, value] = match;
      const memoryValue = state.memory[key];

      switch (operator) {
        case '==': return memoryValue == value;
        case '!=': return memoryValue != value;
        case '>': return memoryValue > value;
        case '<': return memoryValue < value;
        default: return false;
      }
    } catch {
      console.warn(`Erro ao avaliar condição: ${condition}`);
      return false;
    }
  }

  /**
   * Extrai o target role da ação
   * Ex: "atribuir_para(triagem)" → "triagem"
   */
  private extractTargetRole(action: string): string {
    const match = action.match(/atribuir_para\((\w+)\)/);
    return match ? match[1] : 'orchestrator';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* STATE MANAGER                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

class StateManager {
  /**
   * Cria um novo estado de conversa
   */
  createState(squadId: string, userId: string, userMessage: string): ConversationState {
    const now = new Date().toISOString();
    return {
      conversationId: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      squadId,
      userId,
      memory: {},
      messages: [
        {
          role: 'user',
          content: userMessage,
          timestamp: now
        }
      ],
      currentStep: 'triagem',
      assignedAgent: null,
      executionLog: [],
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Atualiza a memória compartilhada com novos dados
   */
  updateMemory(
    state: ConversationState,
    updates: Record<string, any>
  ): ConversationState {
    return {
      ...state,
      memory: { ...state.memory, ...updates },
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Adiciona mensagem ao histórico
   */
  addMessage(
    state: ConversationState,
    role: 'user' | 'agent',
    content: string,
    sender?: string
  ): ConversationState {
    return {
      ...state,
      messages: [
        ...state.messages,
        { role, content, sender, timestamp: new Date().toISOString() }
      ],
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Adiciona entrada ao log de execução
   */
  addLogEntry(
    state: ConversationState,
    entry: Omit<ExecutionLogEntry, 'timestamp'>
  ): ConversationState {
    return {
      ...state,
      executionLog: [
        ...state.executionLog,
        { ...entry, timestamp: new Date().toISOString() }
      ]
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* AGENT CALLER                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

class AgentCaller {
  /**
   * Chama um agente com a mensagem + contexto
   *
   * Em produção, isso chamaria a API do backend (ai-agents)
   * Por enquanto, simulamos com respostas mockadas
   */
  async callAgent(
    agent: Agent,
    message: string,
    context: ConversationState,
    internalOnly: boolean = false
  ): Promise<{ response: string; updatedMemory: Record<string, any> }> {
    // TODO: Em produção, seria algo como:
    // const response = await fetch(`/api/agents/${agent.id}/execute`, {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     message,
    //     state_json: context.memory,
    //     conversation_history: context.messages
    //   })
    // });

    // Por enquanto, simulamos baseado no role do agente
    const mockResponse = this.generateMockResponse(
      agent.spec.identity.agent_name,
      message,
      context,
      internalOnly
    );

    return mockResponse;
  }

  /**
   * Gera resposta mock baseada no role e contexto
   * (para fins de prototipagem)
   */
  private generateMockResponse(
    agentName: string,
    message: string,
    context: ConversationState,
    internalOnly: boolean
  ): { response: string; updatedMemory: Record<string, any> } {
    const lower = message.toLowerCase();
    const memoryContext = context.memory ? JSON.stringify(context.memory) : '';

    if (agentName.includes('Orquestrador') || agentName.includes('Concierge')) {
      return {
        response: internalOnly
          ? `[INTERNO] Recebi e vou coordenar. Delegando...`
          : `Ótimo! Vou coordenar nossa equipe para melhor atendê-lo.`,
        updatedMemory: { orchestrator_saw: true, memory_context: memoryContext }
      };
    }

    if (agentName.includes('Roteirista') || lower.includes('roteiro')) {
      return {
        response: `[INTERNO] Roteiro montado: Dia 1 - Torre Eiffel, Dia 2 - Louvre, Dia 3 - Versalhes...`,
        updatedMemory: { roteiro_gerado: true, days: 5, memory_context: memoryContext }
      };
    }

    if (agentName.includes('Emissor') || agentName.includes('Orçamento')) {
      return {
        response: `[INTERNO] Orçamento calculado: Voos R$12k, Hotel R$7k, Tours R$2.5k = Total R$21.5k`,
        updatedMemory: { budget_gerado: true, total: 21500, memory_context: memoryContext }
      };
    }

    return {
      response: `${agentName} processou sua solicitação.`,
      updatedMemory: { memory_context: memoryContext }
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* SQUAD EXECUTOR (MAIN)                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

export class SquadExecutor {
  private ruleEngine = new RuleEngine();
  private stateManager = new StateManager();
  private agentCaller = new AgentCaller();

  /** Pausa artificial entre passos — só existe para o canvas ter tempo de "acender" cada nó. */
  private readonly STEP_DELAY_MS = 550;
  private wait() {
    return new Promise(resolve => setTimeout(resolve, this.STEP_DELAY_MS));
  }

  /**
   * Registra uma entrada no log, atualiza o state e notifica o onStep (se houver).
   */
  private async logStep(
    state: ConversationState,
    entry: Omit<ExecutionLogEntry, 'timestamp'>,
    onStep?: OnStepCallback
  ): Promise<ConversationState> {
    const nextState = this.stateManager.addLogEntry(state, entry);
    const lastEntry = nextState.executionLog[nextState.executionLog.length - 1];
    onStep?.(lastEntry);
    await this.wait();
    return nextState;
  }

  /**
   * Executa uma squad completa: triagem → delegação → resposta.
   * `onStep` é chamado a cada passo — o Organograma usa isso para destacar o nó ativo no canvas.
   */
  async execute(
    squad: Squad,
    agents: Agent[],
    userMessage: string,
    userId: string,
    existingState?: ConversationState,
    onStep?: OnStepCallback
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // 1. Inicializar ou carregar estado
    let state = existingState || this.stateManager.createState(squad.id, userId, userMessage);
    const internalDelegations: ExecutionResult['internalDelegations'] = [];

    try {
      state = await this.logStep(state, {
        step: 1,
        agentName: 'System',
        agentRole: 'router',
        action: 'started',
        input: userMessage
      }, onStep);

      // 2. Chamar Orquestrador (sempre primeiro)
      const orchestratorMember = squad.members.find(m => m.role === 'orchestrator');
      if (!orchestratorMember) {
        throw new Error('Squad sem Orquestrador');
      }

      const orchestratorAgent = agents.find(a => a.id === orchestratorMember.agentId);
      if (!orchestratorAgent) {
        throw new Error('Agente Orquestrador não encontrado');
      }

      const orchResponse = await this.agentCaller.callAgent(
        orchestratorAgent,
        userMessage,
        state,
        false
      );

      state = this.stateManager.addMessage(state, 'agent', orchResponse.response, orchestratorAgent.spec.identity.agent_name);
      state = this.stateManager.updateMemory(state, orchResponse.updatedMemory);
      state = await this.logStep(state, {
        step: 2,
        agentId: orchestratorAgent.id,
        agentName: orchestratorAgent.spec.identity.agent_name,
        agentRole: 'orchestrator',
        action: 'responded',
        output: orchResponse.response
      }, onStep);

      // 3. Avaliar regras de atribuição
      const ruleResult = this.ruleEngine.evaluate(squad.assignmentRules, state, squad);

      if (ruleResult.matched && ruleResult.targetRole) {
        state = await this.logStep(state, {
          step: 3,
          agentName: 'RuleEngine',
          agentRole: 'router',
          action: 'rule_matched',
          output: ruleResult.reason
        }, onStep);

        // 4. Encontrar o agente para o qual delegar
        const targetMember = squad.members.find(m => m.role === ruleResult.targetRole);
        if (targetMember) {
          const targetAgent = agents.find(a => a.id === targetMember.agentId);
          if (targetAgent) {
            // Criar mensagem de delegação do Orquestrador
            const delegationMessage = `[DELEGAÇÃO INTERNA] ${userMessage} — contexto: ${JSON.stringify(state.memory)}`;

            state = await this.logStep(state, {
              step: 4,
              agentId: orchestratorAgent.id,
              agentName: orchestratorAgent.spec.identity.agent_name,
              agentRole: 'orchestrator',
              action: 'delegated',
              output: `Delegando para ${targetAgent.spec.identity.agent_name}`,
              internalOnly: true
            }, onStep);

            // Chamar agente delegado
            const delegatedResponse = await this.agentCaller.callAgent(
              targetAgent,
              delegationMessage,
              state,
              true // internal only
            );

            state = this.stateManager.updateMemory(state, delegatedResponse.updatedMemory);
            state = await this.logStep(state, {
              step: 5,
              agentId: targetAgent.id,
              agentName: targetAgent.spec.identity.agent_name,
              agentRole: targetMember.role,
              action: 'responded',
              output: delegatedResponse.response,
              internalOnly: true
            }, onStep);

            internalDelegations.push({
              from: orchestratorAgent.spec.identity.agent_name,
              to: targetAgent.spec.identity.agent_name,
              message: delegationMessage,
              response: delegatedResponse.response
            });

            // 5. Agregar resposta final (Orquestrador compila tudo)
            const finalAggregation = await this.agentCaller.callAgent(
              orchestratorAgent,
              `Resumo para o cliente: você tem as informações. Compilar uma resposta final para: ${userMessage}`,
              state,
              false
            );

            state = this.stateManager.addMessage(state, 'agent', finalAggregation.response, orchestratorAgent.spec.identity.agent_name);
            state = this.stateManager.updateMemory(state, finalAggregation.updatedMemory);
            state = await this.logStep(state, {
              step: 6,
              agentId: orchestratorAgent.id,
              agentName: orchestratorAgent.spec.identity.agent_name,
              agentRole: 'orchestrator',
              action: 'aggregated_response',
              output: finalAggregation.response
            }, onStep);

            return {
              success: true,
              publicResponse: finalAggregation.response,
              internalDelegations,
              updatedState: state,
              executionTime: Date.now() - startTime
            };
          }
        }
      } else {
        // Nenhuma regra matched, responder direto do Orquestrador
        state = await this.logStep(state, {
          step: 3,
          agentName: 'RuleEngine',
          agentRole: 'router',
          action: 'no_rule_matched',
          output: ruleResult.reason
        }, onStep);
      }

      return {
        success: true,
        publicResponse: orchResponse.response,
        internalDelegations,
        updatedState: state,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Erro ao executar squad:', error);
      return {
        success: false,
        publicResponse: `Desculpe, ocorreu um erro: ${error instanceof Error ? error.message : 'desconhecido'}`,
        internalDelegations,
        updatedState: state,
        executionTime: Date.now() - startTime
      };
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* EXPORT DEFAULT                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default SquadExecutor;
