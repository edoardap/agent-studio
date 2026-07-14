// ─── Task / Kanban ─────────────────────────────────────────────────────────

export type TaskPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type TaskStatus = 'entrada' | 'em_andamento' | 'aguardando_humano' | 'concluido';

export interface Task {
  id: string;
  squadId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedAgentId?: string;  // Which agent is handling this task
  createdAt: string;
  updatedAt: string;
}

// ─── Marketplace Squad Template ─────────────────────────────────────────────

export interface SquadTemplateAgent {
  role: string;           // ex: 'orchestrator', 'especialista'
  name: string;           // ex: 'Agente de Triagem'
  profile: string;        // Short description
  masterTemplateKey: string;
}

export interface SquadTemplate {
  id: string;
  emoji: string;
  name: string;
  description: string;
  useCase: string;        // ex: 'Atendimento ao cliente'
  agents: SquadTemplateAgent[];
  tags: string[];
}

// ─── Tenant ─────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'mcp' | 'custom';
  // MCP fields
  mcpTransport?: 'stdio' | 'sse';
  mcpCommand?: string;
  mcpArgs?: string[];
  mcpSseUrl?: string;
  // Custom fields
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url?: string;
  headers?: string; // stringified JSON
  schema?: string;  // stringified JSON schema
  associatedAgentIds: string[];
}


export interface MasterTemplate {
  key: string;
  name: string;
  icon: string;
  description: string;
  /** Esqueleto base do prompt com placeholders {{camada.campo}} preenchidos pelo compilador. */
  promptSkeleton: string;
  /** Valores iniciais sugeridos para a spec ao escolher este template (pré-preenche o formulário). */
  specDefaults?: {
    identity?: Partial<AgentSpec['identity']>;
    behavior?: Partial<AgentSpec['behavior']>;
    security?: Partial<AgentSpec['security']>;
    context?: Partial<AgentSpec['context']>;
    planning?: Partial<AgentSpec['planning']>;
    action?: Partial<AgentSpec['action']>;
    response?: Partial<AgentSpec['response']>;
  };
}

// Referência a uma base de conhecimento do data-studio (id + nome para exibição).
export interface KnowledgeBaseRef {
  id: string;
  name: string;
}

export interface AgentSpec {
  identity: {
    agent_name: string;
    agent_profile: string;
    agent_introduction: string;
    agent_goal: string;
  };
  behavior: {
    max_chars: number;
    max_questions_per_message: number;
    language: string;
    allowed_emojis: boolean;
    behaviour_rules: string;
  };
  security: {
    security_rules: string;
    forbid_final_answer: boolean;
    anti_prompt_injection: boolean;
    jailbreak_response: string;
  };
  context: {
    company_name: string;
    segment: string;
    opening_hours: string;
    user_general_defaults: string;
    crm_information: string;
  };
  planning: {
    roteiro: string;
    decision_rules: string;
    default_current_goal: string;
    default_agent_stage: string;
    default_next_action: string;
  };
  action: {
    action_general_infos: string;
    tools: string[];
    // Bases de conhecimento associadas (referência ao catálogo do data-studio).
    // Diferente de `tools` (capacidades em texto livre): isto é RAG estruturado.
    knowledge_bases: KnowledgeBaseRef[];
  };
  response: {
    task: string;
    output_rules: string;
  };
}

export interface Agent {
  id: string;
  model: string;
  temperature: number;
  spec: AgentSpec;
  status: 'active' | 'draft' | 'building';
  createdAt: string;
  master_template_key: string;
  is_active: boolean;
  channel: string;
  integrations: {
    discord: boolean;
    telegram: boolean;
    slack: boolean;
    whatsapp: boolean;
    webWidget: boolean;
  };
}

// ─── Squad / Orquestração ──────────────────────────────────────────────────

export type SquadMemberRole =
  | 'orchestrator'
  | 'triagem'
  | 'especialista'
  | 'executor'
  | 'coach'
  | 'suporte';

export interface SquadMember {
  agentId: string;
  role: SquadMemberRole;
  /** Tools que este membro tem permissão de usar dentro da squad */
  allowedTools: string[];
}

export interface AssignmentRule {
  id: string;
  condition: string;   // ex: "ticket.priority == 'P1'"
  action: string;      // ex: "atribuir_para(N2) + alertar_humano"
}

export interface Squad {
  id: string;
  name: string;
  description: string;
  /** ID do agente que atua como orquestrador (CEO/Squad Manager) */
  orchestratorAgentId: string;
  members: SquadMember[];
  assignmentRules: AssignmentRule[];
  status: 'active' | 'draft' | 'paused';
  createdAt: string;
}

// ─── Conversation ──────────────────────────────────────────────────────────

export interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'creator';
  content: string;
  timestamp: string;
  confidence?: number; // e.g. 86%
  sources?: string[]; // list of source names/files
  reasoning?: string; // thinking process
}

export interface ConversationStateJson {
  current_stage: string;
  user_intent: string;
  current_goal: string;
  next_action: string;
}

export interface Conversation {
  id: string;
  agentId: string; // The ID of the agent this conversation is with (or "creator" for creator agent)
  title: string;
  pinned?: boolean; // conversa fixada no topo do histórico
  messages: Message[];
  updatedAt: string;
  state_json: ConversationStateJson;
  summary_text: string;
}
