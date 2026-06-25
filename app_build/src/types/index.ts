export interface Tenant {
  id: string;
  name: string;
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
  messages: Message[];
  updatedAt: string;
  state_json: ConversationStateJson;
  summary_text: string;
}
