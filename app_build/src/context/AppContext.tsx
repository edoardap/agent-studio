import React, { createContext, useContext, useState } from 'react';
import type { Tenant, Agent, Message, Conversation, AgentSpec, ConversationStateJson, MasterTemplate, Tool } from '../types';
import { getMissingLayers } from '../utils/promptCompiler';
import { defaultMasterTemplate } from '../data/defaultTemplate';

type ActiveView = 'home' | 'factory' | 'agents' | 'chat-agent' | 'templates' | 'integrations';

interface AppContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  // Tools/Integrations Catalog
  toolsList: Tool[];
  addTool: (tool: Omit<Tool, 'id'>) => void;
  updateTool: (id: string, patch: Partial<Tool>) => void;
  deleteTool: (id: string) => void;
  toggleToolAssociation: (toolId: string, agentId: string) => void;
  // Simple vs Advanced UI mode (progressive disclosure)
  isAdvanced: boolean;
  setIsAdvanced: (value: boolean) => void;
  // Master templates (the fixed prompt skeletons agents are built on top of)
  masterTemplates: MasterTemplate[];
  updateMasterTemplate: (key: string, patch: Partial<MasterTemplate>) => void;
  addMasterTemplate: (template: MasterTemplate) => void;
  tenants: Tenant[];
  activeTenant: Tenant;
  setActiveTenant: (tenant: Tenant) => void;
  agents: Agent[];
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  conversations: Conversation[];
  // Conversa atualmente aberta no chat (uma de N por agente). null = nova/sem conversa.
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  // Abre o chat de um agente (seleciona o agente + a conversa mais recente, se houver).
  openAgentChat: (agentId: string) => void;
  // Cria uma nova conversa vazia para o agente e a torna ativa.
  startNewConversation: (agentId: string) => void;
  // Fixa/desafixa uma conversa no topo do histórico.
  toggleConversationPin: (conversationId: string) => void;
  creatorConversation: Conversation;
  creatorSpec: AgentSpec;
  creatorStep: number;
  setCreatorStep: (step: number) => void;
  lastUpdatedFields: Record<string, string[]>;
  clearLastUpdatedFields: () => void;
  updateSpecField: (layer: keyof AgentSpec, field: string, value: any) => void;
  sendMessageToCreator: (content: string) => void;
  sendMessageToAgent: (agentId: string, content: string) => void;
  createAgentFromSpec: () => void;
  // Edição de spec de um agente existente (RF / PUT /agents/{id}).
  // Quando != null, a Fábrica está editando este agente em vez de criar um novo.
  editingAgentId: string | null;
  editAgentSpec: (agentId: string) => void;
  updateAgentIntegrations: (agentId: string, integrations: Agent['integrations']) => void;
  deleteAgent: (agentId: string) => void;
  resetCreatorChat: () => void;
  toggleAgentActiveStatus: (agentId: string) => void;
  // Factory new fields
  creatorMasterTemplateKey: string;
  setCreatorMasterTemplateKey: (key: string) => void;
  // Selects a master template AND pre-fills empty spec fields with its defaults.
  selectCreatorTemplate: (templateName: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialTenants: Tenant[] = [
  { id: '1', name: 'ACME Holding - Pessoas' },
  { id: '2', name: 'ACME Holding - Engenharia' },
  { id: '3', name: 'ACME Holding - Vendas' },
];

const RUNTIME_SKELETON_BLOCK = `
---
[RUNTIME — injetado pelo compilador na execução]
Estado da conversa: {{state_json}}
Resumo (summary): {{summary_text}}
Histórico recente: {{recent_messages}}
Mensagem atual do usuário: {{user_message}}`;

const initialMasterTemplates: MasterTemplate[] = [
  defaultMasterTemplate,
  {
    key: 'Agente de Vendas',
    name: 'Agente de Vendas',
    icon: '💼',
    description: 'Esqueleto comercial: qualificação de leads, cotação e follow-up.',
    specDefaults: {
      context: { segment: 'Comercial / Vendas' },
      behavior: { behaviour_rules: 'Seja consultivo, objetivo e oriente para a próxima etapa da venda.' },
      planning: {
        roteiro: 'Qualificar lead -> Entender necessidade -> Apresentar solução -> Cotação -> Follow-up',
        default_agent_stage: 'qualificacao',
        default_current_goal: 'Qualificar o lead',
      },
      response: { output_rules: 'Mensagens curtas, no máximo uma pergunta por vez e com CTA claro.' },
    },
    promptSkeleton: `# AGENT_SYSTEM — Template Master: Vendas
Você é {{identity.agent_name}}, da {{context.company_name}} (segmento: {{context.segment}}).
Perfil: {{identity.agent_profile}}
Objetivo principal: {{identity.agent_goal}}

## Comportamento
Idioma: {{behavior.language}} · Limite: {{behavior.max_chars}} caracteres
Regras de tom: {{behavior.behaviour_rules}}

## Política & Segurança
{{security.security_rules}}

## Roteiro de Vendas (Planning)
{{planning.roteiro}}
Regras de decisão: {{planning.decision_rules}}

## Bases de Conhecimento (data-studio)
{{action.knowledge_bases}}

## Ferramentas (Action)
{{action.tools}}

## Formato de Resposta
{{response.task}}
{{response.output_rules}}${RUNTIME_SKELETON_BLOCK}`,
  },
  {
    key: 'Agente de Suporte',
    name: 'Agente de Suporte',
    icon: '🛠️',
    description: 'Esqueleto de atendimento técnico: triagem, diagnóstico e resolução.',
    specDefaults: {
      context: { segment: 'Suporte / Atendimento' },
      behavior: { behaviour_rules: 'Seja claro, paciente e resolutivo. Confirme o entendimento antes de propor solução.' },
      security: { security_rules: 'Nunca exponha dados internos de outros clientes.' },
      planning: {
        roteiro: 'Triagem -> Diagnóstico -> Solução -> Confirmar resolução',
        default_agent_stage: 'triagem',
        default_current_goal: 'Triagem do atendimento',
      },
      response: { output_rules: 'Use passo a passo numerado quando for instrução técnica.' },
    },
    promptSkeleton: `# AGENT_SYSTEM — Template Master: Suporte
Você é {{identity.agent_name}}, suporte da {{context.company_name}}.
Perfil: {{identity.agent_profile}}
Objetivo: {{identity.agent_goal}}

## Comportamento
Idioma: {{behavior.language}} · Limite: {{behavior.max_chars}} caracteres
{{behavior.behaviour_rules}}

## Segurança
{{security.security_rules}}

## Roteiro de Atendimento
{{planning.roteiro}}

## Bases de Conhecimento (data-studio)
{{action.knowledge_bases}}

## Bases & Ferramentas
{{action.tools}}

## Resposta
{{response.output_rules}}${RUNTIME_SKELETON_BLOCK}`,
  },
  {
    key: 'Agente de Onboarding',
    name: 'Agente de Onboarding',
    icon: '🚀',
    description: 'Esqueleto de boas-vindas: dúvidas de políticas, processos e cultura.',
    specDefaults: {
      context: { segment: 'Recursos Humanos' },
      behavior: { behaviour_rules: 'Acolha com empatia e simplicidade; evite jargão.' },
      planning: {
        roteiro: 'Identificar dúvida -> Buscar política -> Responder -> Oferecer próximo passo',
        default_agent_stage: 'atendimento',
        default_current_goal: 'Esclarecer dúvida do colaborador',
      },
      response: { output_rules: 'No máximo 2 parágrafos, com links úteis quando houver.' },
    },
    promptSkeleton: `# AGENT_SYSTEM — Template Master: Onboarding
Você é {{identity.agent_name}}, da área de {{context.segment}} da {{context.company_name}}.
{{identity.agent_introduction}}
Objetivo: {{identity.agent_goal}}

## Comportamento
Idioma: {{behavior.language}} · Limite: {{behavior.max_chars}} caracteres · Empatia em primeiro lugar.
{{behavior.behaviour_rules}}

## Segurança
{{security.security_rules}}

## Roteiro
{{planning.roteiro}}

## Bases de Conhecimento (data-studio)
{{action.knowledge_bases}}

## Ferramentas
{{action.tools}}

## Resposta
{{response.output_rules}}${RUNTIME_SKELETON_BLOCK}`,
  },
  {
    key: 'Começar do zero',
    name: 'Começar do zero',
    icon: '📄',
    description: 'Esqueleto neutro, sem defaults de um tipo específico. Construa o agente do seu jeito com o copiloto.',
    // Sem specDefaults: não pré-preenche nada — o usuário (ou o copiloto) preenche tudo.
    promptSkeleton: `# AGENT_SYSTEM — Template Base (genérico)
Você é {{identity.agent_name}}, da {{context.company_name}}.
{{identity.agent_introduction}}
Objetivo: {{identity.agent_goal}}

## Comportamento
Idioma: {{behavior.language}} · Limite: {{behavior.max_chars}} caracteres
{{behavior.behaviour_rules}}

## Segurança
{{security.security_rules}}

## Planejamento
{{planning.roteiro}}

## Bases de Conhecimento (data-studio)
{{action.knowledge_bases}}

## Ferramentas
{{action.tools}}

## Resposta
{{response.task}}
{{response.output_rules}}${RUNTIME_SKELETON_BLOCK}`,
  },
];

const defaultStateJson: ConversationStateJson = {
  current_stage: 'triagem',
  user_intent: 'aguardando_input',
  current_goal: 'Iniciar atendimento',
  next_action: 'aguardar_mensagem',
};

const initialAgents: Agent[] = [
  {
    id: 'agent-1',
    model: 'Gemini 3.5 Pro',
    temperature: 0.2,
    master_template_key: 'Agente de Suporte',
    is_active: true,
    channel: 'Web',
    spec: {
      identity: {
        agent_name: 'Atena Knowledge Agent',
        agent_profile: 'Especialista em documentação técnica e integração com repositórios Git.',
        agent_introduction: 'Olá, eu sou a Atena. Analiso commits e issues de projetos GitLab.',
        agent_goal: 'Gerar documentação de base de conhecimento automaticamente no GitLab e Discord.',
      },
      behavior: {
        max_chars: 1000,
        max_questions_per_message: 2,
        language: 'Português',
        allowed_emojis: true,
        behaviour_rules: 'Seja clara, objetiva e escreva em formato Markdown estruturado.',
      },
      security: {
        security_rules: 'Nunca revele chaves de API secretas do GitLab.',
        forbid_final_answer: false,
        anti_prompt_injection: true,
        jailbreak_response: 'Desculpe, não posso realizar essa ação por motivos de segurança.',
      },
      context: {
        company_name: 'ACME Holding',
        segment: 'Tecnologia da Informação / Engenharia de Software',
        opening_hours: '24/7',
        user_general_defaults: 'Estagiários, Engenheiros e Curadores técnicos',
        crm_information: 'Integração de issues GitLab com logs de conhecimento',
      },
      planning: {
        roteiro: 'Mapear issues -> Categorizar -> Redigir Markdown -> Solicitar aprovação via MR',
        decision_rules: 'Se a issue contém a label "knowledge-base", processar; caso contrário, ignorar.',
        default_current_goal: 'Mapear novas issues não documentadas',
        default_agent_stage: 'monitoramento',
        default_next_action: 'verificar_commits',
      },
      action: {
        action_general_infos: 'Chamadas de API do GitLab e postagem de webhook Discord.',
        tools: ['GitLab API client_v2.ts', 'production_artifacts/Technical_Specification.md', 'Discord Webhook Poster'],
        knowledge_bases: [
          { id: 'kb-engenharia', name: 'Engenharia & Arquitetura' },
          { id: 'kb-suporte', name: 'Base de Suporte ao Cliente' },
        ],
      },
      response: {
        task: 'Gerar artigos de conhecimento e criar Merge Requests correspondentes.',
        output_rules: 'Escrever em Markdown com seções # Resumo, # Resolução, # Referências.',
      }
    },
    status: 'active',
    createdAt: '2026-06-18T12:00:00Z',
    integrations: {
      discord: true,
      telegram: false,
      slack: true,
      whatsapp: false,
      webWidget: true,
    },
  },
  {
    id: 'agent-2',
    model: 'Gemini 3.5 Flash',
    temperature: 0.4,
    master_template_key: 'Agente de Onboarding',
    is_active: true,
    channel: 'WhatsApp',
    spec: {
      identity: {
        agent_name: 'Assistente de Onboarding',
        agent_profile: 'Tira dúvidas sobre políticas de RH, férias, benefícios e cultura da ACME.',
        agent_introduction: 'Olá, sou o assistente de onboarding da ACME. Como posso te ajudar?',
        agent_goal: 'Sanar dúvidas de novos colaboradores sobre regras e processos da empresa.',
      },
      behavior: {
        max_chars: 500,
        max_questions_per_message: 1,
        language: 'Português',
        allowed_emojis: true,
        behaviour_rules: 'Responda com empatia, simplicidade e agilidade.',
      },
      security: {
        security_rules: 'Não forneça informações pessoais de outros colaboradores.',
        forbid_final_answer: false,
        anti_prompt_injection: true,
        jailbreak_response: 'Não estou autorizado a repassar esses dados.',
      },
      context: {
        company_name: 'ACME Holding',
        segment: 'Recursos Humanos',
        opening_hours: '9h às 18h',
        user_general_defaults: 'Novos funcionários e contratados recentes',
        crm_information: 'Integração de dúvidas frequentes com o portal de benefícios',
      },
      planning: {
        roteiro: 'Identificar dúvida -> Buscar na base de RH -> Apresentar resposta -> Oferecer link de formulário',
        decision_rules: 'Se envolver reembolsos de valores altos, encaminhar para aprovação da gerência.',
        default_current_goal: 'Esclarecer dúvidas sobre férias e benefícios',
        default_agent_stage: 'atendimento',
        default_next_action: 'buscar_na_base',
      },
      action: {
        action_general_infos: 'Acesso a PDFs internos de políticas corporativas.',
        tools: ['Manual do Colaborador 2026.pdf (RH)', 'Acordo Coletivo 2026_final.pdf'],
        knowledge_bases: [
          { id: 'kb-rh', name: 'Políticas de RH' },
          { id: 'kb-onboarding', name: 'Onboarding de Novos Times' },
        ],
      },
      response: {
        task: 'Auxiliar na navegação das políticas internas e fornecer links de formulários corretos.',
        output_rules: 'Respostas com no máximo 2 parágrafos, incluindo links úteis quando disponíveis.',
      }
    },
    status: 'active',
    createdAt: '2026-06-20T10:30:00Z',
    integrations: {
      discord: false,
      telegram: true,
      slack: false,
      whatsapp: true,
      webWidget: true,
    },
  },
];

const initialTools: Tool[] = [
  {
    id: 'tool-1',
    name: 'GitLab API client_v2.ts',
    description: 'Permite consultar commits, merges e issues no repositório GitLab.',
    type: 'custom',
    method: 'GET',
    url: 'https://api.gitlab.acme.ai/v4/projects/123/issues',
    headers: '{\n  "Authorization": "Bearer glpat-xxxxxx"\n}',
    schema: '{\n  "type": "object",\n  "properties": {\n    "state": { "type": "string", "enum": ["opened", "closed"] }\n  }\n}',
    associatedAgentIds: ['agent-1'],
  },
  {
    id: 'tool-2',
    name: 'Discord Webhook Poster',
    description: 'Envia alertas e resumos de documentação para canais do Discord.',
    type: 'custom',
    method: 'POST',
    url: 'https://discord.com/api/webhooks/123456/7891011',
    headers: '{\n  "Content-Type": "application/json"\n}',
    schema: '{\n  "type": "object",\n  "properties": {\n    "content": { "type": "string" }\n  },\n  "required": ["content"]\n}',
    associatedAgentIds: ['agent-1'],
  },
  {
    id: 'tool-3',
    name: 'Postgres-MCP Server',
    description: 'MCP Server para leitura de tabelas e execução de queries analíticas de suporte no PostgreSQL.',
    type: 'mcp',
    mcpTransport: 'stdio',
    mcpCommand: 'npx',
    mcpArgs: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://postgres:acme123@localhost:5432/acme_db'],
    associatedAgentIds: [],
  },
  {
    id: 'tool-4',
    name: 'GitHub-MCP Server',
    description: 'Model Context Protocol server para buscar código e ler pull requests no GitHub.',
    type: 'mcp',
    mcpTransport: 'stdio',
    mcpCommand: 'npx',
    mcpArgs: ['-y', '@modelcontextprotocol/server-github'],
    associatedAgentIds: [],
  }
];

const defaultSpec: AgentSpec = {
  identity: {
    agent_name: '',
    agent_profile: '',
    agent_introduction: '',
    agent_goal: '',
  },
  behavior: {
    max_chars: 1000,
    max_questions_per_message: 2,
    language: 'Português',
    allowed_emojis: true,
    behaviour_rules: '',
  },
  security: {
    security_rules: '',
    forbid_final_answer: false,
    anti_prompt_injection: true,
    jailbreak_response: 'Desculpe, não posso realizar essa ação devido às minhas diretrizes de segurança.',
  },
  context: {
    company_name: 'ACME Holding',
    segment: '',
    opening_hours: '9h às 18h',
    user_general_defaults: '',
    crm_information: '',
  },
  planning: {
    roteiro: '',
    decision_rules: '',
    default_current_goal: '',
    default_agent_stage: 'atendimento',
    default_next_action: '',
  },
  action: {
    action_general_infos: '',
    tools: [],
    knowledge_bases: [],
  },
  response: {
    task: '',
    output_rules: '',
  },
};

const makeInitialCreatorConversation = (): Conversation => ({
  id: 'creator-chat',
  agentId: 'creator',
  title: 'Chat com o Agente Criador',
  messages: [
    {
      id: 'msg-start',
      sender: 'creator',
      content: 'Olá! Eu sou o seu **Copiloto de Criação**. Descreva a sua ideia em linguagem natural e eu irei preencher e organizar a especificação nas camadas ao lado automaticamente!',
      timestamp: new Date().toISOString(),
    }
  ],
  updatedAt: new Date().toISOString(),
  state_json: defaultStateJson,
  summary_text: '',
});

// Integrações padrão de um agente recém-criado (publicado no Web Widget).
export const DEFAULT_INTEGRATIONS: Agent['integrations'] = {
  discord: false,
  telegram: false,
  slack: false,
  whatsapp: false,
  webWidget: true,
};

// O `channel` do agente é DERIVADO das integrações ligadas no "Disponibilizar"
// (não é mais digitado na criação). Retorna o canal primário = primeiro ativo
// por prioridade. Mantém o campo `channel` (RF-01) como uma fonte de verdade só.
const CHANNEL_PRIORITY: { key: keyof Agent['integrations']; label: string }[] = [
  { key: 'webWidget', label: 'Web' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'slack', label: 'Slack' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'discord', label: 'Discord' },
];

export const deriveChannel = (integrations: Agent['integrations']): string => {
  const primary = CHANNEL_PRIORITY.find(c => integrations[c.key]);
  return primary ? primary.label : 'Não publicado';
};

// Título curto para a conversa, derivado da primeira mensagem do usuário.
const deriveConvTitle = (content: string) =>
  content.length > 40 ? `${content.slice(0, 40)}…` : content || 'Nova conversa';

// Cria uma conversa de agente já com a mensagem de boas-vindas e o estado
// inicial derivado dos defaults de planejamento do agente.
const makeAgentConversation = (agent: Agent, firstUserContent?: string): Conversation => {
  const now = new Date().toISOString();
  return {
    id: `conv-${agent.id}-${Date.now()}`,
    agentId: agent.id,
    title: firstUserContent ? deriveConvTitle(firstUserContent) : 'Nova conversa',
    messages: [
      {
        id: `msg-welcome-${Date.now()}`,
        sender: 'assistant',
        content: `Olá! Eu sou o **${agent.spec.identity.agent_name}**. Como posso ajudar você hoje?`,
        timestamp: now,
      },
    ],
    updatedAt: now,
    state_json: {
      current_stage: agent.spec.planning.default_agent_stage || 'triagem',
      user_intent: 'aguardando_input',
      current_goal: agent.spec.planning.default_current_goal || 'Iniciar atendimento',
      next_action: agent.spec.planning.default_next_action || 'aguardar_mensagem',
    },
    summary_text: '',
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveView>('factory');
  const [isAdvanced, setIsAdvancedState] = useState<boolean>(
    () => localStorage.getItem('agentstudio.mode') === 'advanced'
  );
  const [masterTemplates, setMasterTemplates] = useState<MasterTemplate[]>(initialMasterTemplates);
  const [activeTenant, setActiveTenant] = useState<Tenant>(initialTenants[0]);

  const [toolsList, setToolsList] = useState<Tool[]>(initialTools);

  const addTool = (tool: Omit<Tool, 'id'>) => {
    const newTool: Tool = {
      ...tool,
      id: `tool-${Date.now()}`,
    };
    setToolsList(prev => [...prev, newTool]);
  };

  const updateTool = (id: string, patch: Partial<Tool>) => {
    setToolsList(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    
    if (patch.name) {
      const oldTool = toolsList.find(t => t.id === id);
      if (oldTool && oldTool.name !== patch.name) {
        const oldName = oldTool.name;
        const newName = patch.name;
        setAgents(prev => prev.map(a => {
          if (a.spec.action.tools.includes(oldName)) {
            return {
              ...a,
              spec: {
                ...a.spec,
                action: {
                  ...a.spec.action,
                  tools: a.spec.action.tools.map(name => name === oldName ? newName : name)
                }
              }
            };
          }
          return a;
        }));
      }
    }
  };

  const deleteTool = (id: string) => {
    const tool = toolsList.find(t => t.id === id);
    if (tool) {
      const toolName = tool.name;
      setAgents(prev => prev.map(a => {
        if (a.spec.action.tools.includes(toolName)) {
          return {
            ...a,
            spec: {
              ...a.spec,
              action: {
                ...a.spec.action,
                tools: a.spec.action.tools.filter(name => name !== toolName)
              }
            }
          };
        }
        return a;
      }));
    }
    setToolsList(prev => prev.filter(t => t.id !== id));
  };

  const toggleToolAssociation = (toolId: string, agentId: string) => {
    let toolName = '';
    setToolsList(prev => prev.map(t => {
      if (t.id === toolId) {
        toolName = t.name;
        const exists = t.associatedAgentIds.includes(agentId);
        const next = exists
          ? t.associatedAgentIds.filter(id => id !== agentId)
          : [...t.associatedAgentIds, agentId];
        return { ...t, associatedAgentIds: next };
      }
      return t;
    }));

    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        const exists = a.spec.action.tools.includes(toolName);
        const nextTools = exists
          ? a.spec.action.tools.filter(name => name !== toolName)
          : [...a.spec.action.tools, toolName];
        return {
          ...a,
          spec: {
            ...a.spec,
            action: {
              ...a.spec.action,
              tools: nextTools
            }
          }
        };
      }
      return a;
    }));
  };

  const setIsAdvanced = (value: boolean) => {
    setIsAdvancedState(value);
    localStorage.setItem('agentstudio.mode', value ? 'advanced' : 'simple');
    if (!value) {
      selectCreatorTemplate('Template Padrão');
    }
  };

  const updateMasterTemplate = (key: string, patch: Partial<MasterTemplate>) => {
    setMasterTemplates(prev => prev.map(t => (t.key === key ? { ...t, ...patch } : t)));
  };

  const addMasterTemplate = (template: MasterTemplate) => {
    setMasterTemplates(prev => [...prev, template]);
  };
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [creatorSpec, setCreatorSpec] = useState<AgentSpec>(defaultSpec);
  // -1 = passo "Config" (template/canal); 0..6 = as 7 camadas; 7 = revisão JSON.
  const [creatorStep, setCreatorStep] = useState<number>(-1);
  const [lastUpdatedFields, setLastUpdatedFields] = useState<Record<string, string[]>>({});
  const [creatorMasterTemplateKey, setCreatorMasterTemplateKey] = useState<string>(() =>
    localStorage.getItem('agentstudio.mode') === 'advanced' ? 'Agente de Vendas' : 'Template Padrão'
  );
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

  const [creatorConversation, setCreatorConversation] = useState<Conversation>(makeInitialCreatorConversation());

  const clearLastUpdatedFields = () => setLastUpdatedFields({});

  const updateSpecField = (layer: keyof AgentSpec, field: string, value: any) => {
    setCreatorSpec(prev => ({
      ...prev,
      [layer]: {
        ...prev[layer],
        [field]: value
      }
    }));
  };

  // Select a template and pre-fill ONLY empty spec fields with its defaults
  // (never overwrites values the user already typed). Highlights the filled fields.
  const selectCreatorTemplate = (templateName: string) => {
    setCreatorMasterTemplateKey(templateName);

    const tpl = masterTemplates.find(t => t.name === templateName);
    if (!tpl?.specDefaults) return;

    const next: AgentSpec = { ...creatorSpec };
    const filled: Record<string, string[]> = {};

    (Object.keys(tpl.specDefaults) as (keyof AgentSpec)[]).forEach(layer => {
      const layerDefaults = tpl.specDefaults![layer] as Record<string, any>;
      const current = { ...(creatorSpec[layer] as Record<string, any>) };

      Object.keys(layerDefaults).forEach(field => {
        const curVal = current[field];
        const isEmpty =
          curVal === '' ||
          curVal === undefined ||
          curVal === null ||
          (Array.isArray(curVal) && curVal.length === 0);

        if (isEmpty) {
          current[field] = layerDefaults[field];
          if (!filled[layer]) filled[layer] = [];
          filled[layer].push(field);
        }
      });

      (next as any)[layer] = current;
    });

    setCreatorSpec(next);
    if (Object.keys(filled).length > 0) setLastUpdatedFields(filled);
  };

  const sendMessageToCreator = (content: string) => {
    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setCreatorConversation(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      updatedAt: new Date().toISOString(),
    }));

    setTimeout(() => {
      let reply = '';
      let nextStep = creatorStep;
      let updatedSpec = { ...creatorSpec };
      let newUpdates: Record<string, string[]> = {};

      const lowerContent = content.toLowerCase();

      // Check if user manually changed fields (acknowledgment simulator)
      const currentName = updatedSpec.identity.agent_name;
      const hasCustomName = currentName && currentName !== 'Novo Agente AI';

      // 1. Check for global agent creation idea
      if (lowerContent.includes('quero um agente') || lowerContent.includes('criar um agente') || lowerContent.includes('assistente de') || lowerContent.includes('ajude')) {
        // Extract names & properties
        let extractedName = 'Assistente de Testes ACME';
        let extractedProfile = 'Auxilia desenvolvedores a escrever testes unitários seguindo os padrões internos.';
        let extractedGoal = 'Garantir a cobertura de testes e aderência aos padrões de código da empresa.';

        if (lowerContent.includes('finanças') || lowerContent.includes('financeiro')) {
          extractedName = 'Assistente de Finanças ACME';
          extractedProfile = 'Especialista em reembolsos, análise de notas fiscais e relatórios financeiros.';
          extractedGoal = 'Validar notas fiscais via OCR e gerenciar fluxos de reembolso da empresa.';
        } else if (lowerContent.includes('vendas') || lowerContent.includes('comercial')) {
          extractedName = 'Copiloto de Vendas';
          extractedProfile = 'Suporte a leads e cotações de preços comerciais.';
          extractedGoal = 'Otimizar o pipeline comercial e responder dúvidas de clientes.';
        }

        updatedSpec.identity = {
          agent_name: extractedName,
          agent_profile: extractedProfile,
          agent_introduction: `Olá, sou o ${extractedName}. Em que posso ajudar?`,
          agent_goal: extractedGoal,
        };

        // Prepopulate a tool automatically
        updatedSpec.action.tools = ['Base de Conhecimento Corporativa'];
        updatedSpec.context.company_name = 'ACME Holding';

        newUpdates = {
          identity: ['agent_name', 'agent_profile', 'agent_introduction', 'agent_goal'],
          action: ['tools'],
          context: ['company_name']
        };

        reply = `Entendi perfeitamente sua ideia! Criei a identidade inicial do agente: **"${extractedName}"**.\n\nPreenchi automaticamente os campos de **Identidade**, adicionei a **"Base de Conhecimento Corporativa"** na camada de **Ação** e associei a empresa **"ACME Holding"** na camada de **Contexto**.\n\nVeja no painel ao lado como os campos foram destacados. Para a camada de **Comportamento**, qual deve ser o limite de caracteres por mensagem e as regras de tom de voz?`;
        nextStep = 0; // Focus Identity tab
      } 
      // 2. Check for behavior rules
      else if (lowerContent.includes('caractere') || lowerContent.includes('emoji') || lowerContent.includes('comportamento') || lowerContent.includes('linguagem') || lowerContent.includes('regras')) {
        let chars = 500;
        const charMatch = content.match(/\d+/);
        if (charMatch) chars = parseInt(charMatch[0]);

        updatedSpec.behavior = {
          max_chars: chars,
          max_questions_per_message: 1,
          language: 'Português',
          allowed_emojis: !lowerContent.includes('não'),
          behaviour_rules: content,
        };

        newUpdates = {
          behavior: ['max_chars', 'max_questions_per_message', 'language', 'allowed_emojis', 'behaviour_rules']
        };

        reply = `Entendido! Configurei as diretrizes de **Comportamento** (com limite de ${chars} caracteres e emojis permitidos).\n\nPara a camada de **Segurança**, você gostaria de definir alguma restrição sobre quais códigos ele pode expor ou regras gerais anti-prompt injection?`;
        nextStep = 1; // Focus Behavior tab
      }
      // 3. Check for security rules
      else if (lowerContent.includes('segurança') || lowerContent.includes('prompt') || lowerContent.includes('bloquear') || lowerContent.includes('restrição')) {
        updatedSpec.security = {
          security_rules: content,
          forbid_final_answer: lowerContent.includes('sim') || lowerContent.includes('bloquear'),
          anti_prompt_injection: true,
          jailbreak_response: 'Operação bloqueada por regras de segurança corporativas.',
        };

        newUpdates = {
          security: ['security_rules', 'forbid_final_answer', 'anti_prompt_injection', 'jailbreak_response']
        };

        reply = `Diretrizes de **Segurança** aplicadas e a proteção anti-prompt injection foi ligada.\n\nPara a camada de **Contexto**, qual o segmento de atuação deste agente e as regras de horário de atendimento?`;
        nextStep = 2; // Focus Security tab
      }
      // 4. Check for context rules
      else if (lowerContent.includes('empresa') || lowerContent.includes('horário') || lowerContent.includes('segmento') || lowerContent.includes('atendimento')) {
        updatedSpec.context.segment = content;
        updatedSpec.context.opening_hours = '9h às 18h';
        updatedSpec.context.user_general_defaults = 'Colaboradores ACME';

        newUpdates = {
          context: ['segment', 'opening_hours', 'user_general_defaults']
        };

        reply = `Dados de **Contexto** (segmento e horários) salvos na especificação.\n\nNa camada de **Planejamento (Planning)**, qual roteiro lógico de raciocínio ele deve seguir ao atender um cliente?`;
        nextStep = 3; // Focus Context tab
      }
      // 5. Check for planning rules
      else if (lowerContent.includes('roteiro') || lowerContent.includes('planejamento') || lowerContent.includes('passos') || lowerContent.includes('estágio')) {
        updatedSpec.planning = {
          roteiro: content,
          decision_rules: 'Se o cliente solicitar reembolso acima de 1000 reais, enviar para aprovação.',
          default_current_goal: 'Atendimento inicial',
          default_agent_stage: 'triagem',
          default_next_action: 'verificar_solicitacao',
        };

        newUpdates = {
          planning: ['roteiro', 'decision_rules', 'default_current_goal', 'default_agent_stage', 'default_next_action']
        };

        reply = `Fluxo de **Planejamento** configurado. Ele seguirá o roteiro detalhado.\n\nQuais bases ou ferramentas (tools) o agente deve usar na camada de **Ação**?`;
        nextStep = 4; // Focus Planning tab
      }
      // 6. Check for actions/tools
      else if (lowerContent.includes('ferramenta') || lowerContent.includes('tool') || lowerContent.includes('api') || lowerContent.includes('banco') || lowerContent.includes('excel')) {
        const toolsList = content.split(/[,;\n]/).map(t => t.trim()).filter(t => t.length > 0);
        updatedSpec.action = {
          action_general_infos: `Acesso a bases: ${toolsList.join(', ')}`,
          tools: [...updatedSpec.action.tools, ...toolsList],
          knowledge_bases: updatedSpec.action.knowledge_bases,
        };

        newUpdates = {
          action: ['action_general_infos', 'tools']
        };

        reply = `Habilidades de **Ação** cadastradas. As ferramentas foram adicionadas ao painel.\n\nFinalmente, qual tarefa (task) e regras de saída (output_rules) o agente deve seguir na camada de **Resposta**?`;
        nextStep = 5; // Focus Action tab
      }
      // 7. Check for response rules
      else if (lowerContent.includes('resposta') || lowerContent.includes('saída') || lowerContent.includes('task') || lowerContent.includes('formato')) {
        updatedSpec.response = {
          task: content,
          output_rules: 'Formate com Markdown estruturado e bullet points.',
        };

        newUpdates = {
          response: ['task', 'output_rules']
        };

        reply = `Perfeito! Camada de **Resposta** configurada. Todos os campos foram preenchidos no painel lateral.\n\nVocê pode alterar qualquer detalhe diretamente nos formulários e clicar em **'Construir Agente'** para finalizar!`;
        nextStep = 6; // Focus Response tab
      }
      // 8. General conversational dialog
      else {
        // Find what layers are still empty
        const missing = getMissingLayers(updatedSpec);

        if (hasCustomName) {
          reply = `Notei que você configurou o nome do agente como **"${currentName}"** no painel lateral. Excelente escolha!\n\n`;
        } else {
          reply = `Estou analisando a especificação.\n\n`;
        }

        if (missing.length > 0) {
          reply += `Analisando o que ainda falta na especificação, identifiquei que as seguintes camadas estão incompletas: ${missing.map(m => `**${m}**`).join(', ')}.\n\nVocê gostaria de preencher a camada de **${missing[0]}** agora? Basta descrever as instruções em linguagem natural!`;
        } else {
          reply += `Sua especificação está completa nas 7 camadas! Sinta-se livre para refinar qualquer campo no painel lateral, ou clique em **'Construir Agente'** para finalizarmos.`;
        }
      }

      setCreatorSpec(updatedSpec);
      setCreatorStep(nextStep);
      setLastUpdatedFields(newUpdates);

      const assistantMsg: Message = {
        id: `msg-creator-${Date.now()}`,
        sender: 'creator',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      setCreatorConversation(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        updatedAt: new Date().toISOString(),
      }));
    }, 1000);
  };

  const sendMessageToAgent = (agentId: string, content: string) => {
    const activeAgent = agents.find(a => a.id === agentId);
    if (!activeAgent) return;

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    // Resolve a conversa-alvo: a conversa ativa do agente ou uma nova
    // (criação preguiçosa na primeira mensagem).
    const existing = conversations.find(
      c => c.id === activeConversationId && c.agentId === agentId,
    );
    let convId: string;

    if (!existing) {
      const created = makeAgentConversation(activeAgent, content);
      const withUser: Conversation = { ...created, messages: [...created.messages, userMsg] };
      convId = withUser.id;
      setConversations(prev => [...prev, withUser]);
      setActiveConversationId(convId);
    } else {
      convId = existing.id;
      const isFirstUserMsg = !existing.messages.some(m => m.sender === 'user');
      const updated: Conversation = {
        ...existing,
        title: isFirstUserMsg ? deriveConvTitle(content) : existing.title,
        messages: [...existing.messages, userMsg],
        updatedAt: new Date().toISOString(),
      };
      setConversations(prev => prev.map(c => (c.id === convId ? updated : c)));
    }

    // Simulate state update after sending message
    setTimeout(() => {
      let reasoning = `Analisando a solicitação do usuário com base nas diretrizes de comportamento do agente "${activeAgent.spec.identity.agent_name}". Cruzando dados com as ferramentas disponíveis: [${activeAgent.spec.action.tools.join(', ')}].`;
      let sources: string[] = [];
      let confidence = Math.floor(Math.random() * (98 - 75 + 1)) + 75;
      let reply = '';

      if (activeAgent.id === 'agent-1') {
        reply = `Oi! Identifiquei a sua solicitação. Eu analisei os últimos logs de builds e as issues ativas do projeto GitLab corporativo da ACME. Conforme o roteiro de planejamento, criei um rascunho de documentação em markdown.\n\nVocê deseja visualizar as notas de commits mapeadas?`;
        sources = ['GitLab API client_v2.ts', 'Manual do Programador.pdf'];
      } else if (activeAgent.id === 'agent-2') {
        reply = `Olá! Conforme o **Manual do Colaborador (Seção 4.2)**, todos os funcionários têm direito a férias após completar 12 meses de serviço contínuo. Para estagiários, o recesso de 30 dias é preferencialmente concedido no período de férias escolares. \n\nPosso te ajudar a solicitar o recesso no portal de benefícios?`;
        sources = ['Manual do Colaborador 2026.pdf (RH)', 'Acordo Coletivo 2026_final.pdf'];
      } else {
        reply = `Olá! Sou o **${activeAgent.spec.identity.agent_name}**, especialista em *"${activeAgent.spec.identity.agent_profile}"*. \n\nIdentifiquei a sua solicitação: "${content}". Para cumprir minha tarefa de "${activeAgent.spec.response.task}", utilizarei as ferramentas: [${activeAgent.spec.action.tools.join(', ')}].\n\nComo posso prosseguir?`;
        sources = activeAgent.spec.action.tools;
      }

      const agentMsg: Message = {
        id: `msg-agent-${Date.now()}`,
        sender: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
        confidence,
        sources,
        reasoning,
      };

      // Simulate state_json update after agent responds
      const stageOptions = ['qualificacao', 'apresentacao', 'resolucao', 'encerramento', 'escalonamento'];
      const intentOptions = ['buscar_informacao', 'solicitar_suporte', 'reclamacao', 'elogio', 'duvida_geral'];
      const nextActionOptions = ['consultar_base', 'escalonar_humano', 'oferecer_link', 'solicitar_confirmacao', 'encerrar_atendimento'];

      const newStage = stageOptions[Math.floor(Math.random() * stageOptions.length)];
      const newIntent = intentOptions[Math.floor(Math.random() * intentOptions.length)];
      const newGoal = `Resolver: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`;
      const newNextAction = nextActionOptions[Math.floor(Math.random() * nextActionOptions.length)];

      const newSummary = `Usuário perguntou sobre: "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}". Agente identificou intenção de ${newIntent.replace(/_/g, ' ')} e está na fase de ${newStage.replace(/_/g, ' ')}. Resposta gerada com ${confidence}% de confiança usando ${sources.length} fonte(s).`;

      setConversations(prev => prev.map(c => {
        if (c.id === convId) {
          return {
            ...c,
            messages: [...c.messages, agentMsg],
            updatedAt: new Date().toISOString(),
            state_json: {
              current_stage: newStage,
              user_intent: newIntent,
              current_goal: newGoal,
              next_action: newNextAction,
            },
            summary_text: newSummary,
          };
        }
        return c;
      }));
    }, 1200);
  };

  // Abre o chat de um agente: seleciona o agente e a conversa mais recente
  // (ou nenhuma, deixando uma conversa nova ser criada na primeira mensagem).
  const openAgentChat = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    setSelectedAgent(agent);
    const recent = conversations
      .filter(c => c.agentId === agentId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setActiveConversationId(recent.length ? recent[0].id : null);
    setActiveView('chat-agent');
  };

  // Cria uma nova conversa vazia (só com a saudação) e a torna ativa.
  const startNewConversation = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    const conv = makeAgentConversation(agent);
    setConversations(prev => [...prev, conv]);
    setActiveConversationId(conv.id);
  };

  const toggleConversationPin = (conversationId: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, pinned: !c.pinned } : c)),
    );
  };

  // Carrega a spec de um agente existente de volta na Fábrica para edição.
  const editAgentSpec = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    // Cópia profunda para não mutar o agente original enquanto se edita.
    setCreatorSpec(JSON.parse(JSON.stringify(agent.spec)) as AgentSpec);
    setCreatorMasterTemplateKey(agent.master_template_key);
    setCreatorStep(-1);
    setLastUpdatedFields({});
    setCreatorConversation(makeInitialCreatorConversation());
    setEditingAgentId(agentId);
    setActiveView('factory');
  };

  const createAgentFromSpec = () => {
    if (!creatorSpec.identity.agent_name) return;

    // Modo edição: atualiza o agente existente no lugar (PUT /agents/{id}),
    // preservando id, createdAt, integrações, modelo e status.
    if (editingAgentId) {
      const existing = agents.find(a => a.id === editingAgentId);
      if (!existing) return;

      const updatedAgent: Agent = {
        ...existing,
        spec: { ...creatorSpec },
        master_template_key: creatorMasterTemplateKey,
        // channel permanece derivado das integrações do agente.
        channel: deriveChannel(existing.integrations),
      };

      setAgents(prev => prev.map(a => (a.id === editingAgentId ? updatedAgent : a)));

      // Sincroniza a associação das tools no catálogo
      setToolsList(prev => prev.map(t => {
        const isAssociated = creatorSpec.action.tools.includes(t.name);
        const hasAgent = t.associatedAgentIds.includes(editingAgentId);
        if (isAssociated && !hasAgent) {
          return { ...t, associatedAgentIds: [...t.associatedAgentIds, editingAgentId] };
        } else if (!isAssociated && hasAgent) {
          return { ...t, associatedAgentIds: t.associatedAgentIds.filter(id => id !== editingAgentId) };
        }
        return t;
      }));

      resetCreatorChat();
      setSelectedAgent(updatedAgent);
      setActiveView('agents');
      return;
    }

    const newAgentId = `agent-${Date.now()}`;
    const newAgent: Agent = {
      id: newAgentId,
      model: 'Gemini 3.5 Flash',
      temperature: 0.4,
      spec: { ...creatorSpec },
      status: 'active',
      createdAt: new Date().toISOString(),
      master_template_key: creatorMasterTemplateKey,
      is_active: true,
      integrations: { ...DEFAULT_INTEGRATIONS },
      // Canal derivado das integrações (novo agente nasce publicado no Web).
      channel: deriveChannel(DEFAULT_INTEGRATIONS),
    };

    setAgents(prev => [newAgent, ...prev]);

    // Sincroniza a associação das tools no catálogo
    setToolsList(prev => prev.map(t => {
      const isAssociated = creatorSpec.action.tools.includes(t.name);
      if (isAssociated) {
        return { ...t, associatedAgentIds: [...t.associatedAgentIds, newAgentId] };
      }
      return t;
    }));

    resetCreatorChat();
    setSelectedAgent(newAgent);
    setActiveView('agents');
  };

  const updateAgentIntegrations = (agentId: string, integrations: Agent['integrations']) => {
    // O canal é derivado das integrações → recalcula junto.
    const channel = deriveChannel(integrations);
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, integrations, channel } : a));
    setSelectedAgent(prev => prev && prev.id === agentId ? { ...prev, integrations, channel } : prev);
  };

  const deleteAgent = (agentId: string) => {
    // Se a conversa ativa pertence ao agente removido, limpa a seleção.
    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (activeConv && activeConv.agentId === agentId) {
      setActiveConversationId(null);
    }
    setAgents(prev => prev.filter(a => a.id !== agentId));
    setConversations(prev => prev.filter(c => c.agentId !== agentId));
    if (selectedAgent && selectedAgent.id === agentId) {
      setSelectedAgent(null);
    }
  };

  const toggleAgentActiveStatus = (agentId: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, is_active: !a.is_active } : a));
    setSelectedAgent(prev => prev && prev.id === agentId ? { ...prev, is_active: !prev.is_active } : prev);
  };

  const resetCreatorChat = () => {
    setCreatorSpec(defaultSpec);
    setCreatorStep(-1);
    setCreatorConversation(makeInitialCreatorConversation());
    setLastUpdatedFields({});
    setCreatorMasterTemplateKey(initialMasterTemplates[0].name);
    setEditingAgentId(null);
  };

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        toolsList,
        addTool,
        updateTool,
        deleteTool,
        toggleToolAssociation,
        isAdvanced,
        setIsAdvanced,
        masterTemplates,
        updateMasterTemplate,
        addMasterTemplate,
        tenants: initialTenants,
        activeTenant,
        setActiveTenant,
        agents,
        selectedAgent,
        setSelectedAgent,
        conversations,
        activeConversationId,
        setActiveConversationId,
        openAgentChat,
        startNewConversation,
        toggleConversationPin,
        creatorConversation,
        creatorSpec,
        creatorStep,
        setCreatorStep,
        lastUpdatedFields,
        clearLastUpdatedFields,
        updateSpecField,
        sendMessageToCreator,
        sendMessageToAgent,
        createAgentFromSpec,
        editingAgentId,
        editAgentSpec,
        updateAgentIntegrations,
        deleteAgent,
        resetCreatorChat,
        toggleAgentActiveStatus,
        creatorMasterTemplateKey,
        setCreatorMasterTemplateKey,
        selectCreatorTemplate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
