import React, { createContext, useContext, useState } from 'react';
import type { Tenant, Agent, Message, Conversation, AgentSpec } from '../types';

interface AppContextType {
  activeView: 'home' | 'factory' | 'agents' | 'chat-agent';
  setActiveView: (view: 'home' | 'factory' | 'agents' | 'chat-agent') => void;
  tenants: Tenant[];
  activeTenant: Tenant;
  setActiveTenant: (tenant: Tenant) => void;
  agents: Agent[];
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  conversations: Conversation[];
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
  updateAgentIntegrations: (agentId: string, integrations: Agent['integrations']) => void;
  deleteAgent: (agentId: string) => void;
  resetCreatorChat: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialTenants: Tenant[] = [
  { id: '1', name: 'ACME Holding - Pessoas' },
  { id: '2', name: 'ACME Holding - Engenharia' },
  { id: '3', name: 'ACME Holding - Vendas' },
];

const initialAgents: Agent[] = [
  {
    id: 'agent-1',
    model: 'Gemini 3.5 Pro',
    temperature: 0.2,
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
  },
  response: {
    task: '',
    output_rules: '',
  },
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<'home' | 'factory' | 'agents' | 'chat-agent'>('factory');
  const [activeTenant, setActiveTenant] = useState<Tenant>(initialTenants[0]);
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [creatorSpec, setCreatorSpec] = useState<AgentSpec>(defaultSpec);
  const [creatorStep, setCreatorStep] = useState<number>(0);
  const [lastUpdatedFields, setLastUpdatedFields] = useState<Record<string, string[]>>({});

  const initialCreatorConversation: Conversation = {
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
  };

  const [creatorConversation, setCreatorConversation] = useState<Conversation>(initialCreatorConversation);

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

  // Helper to check what layers are still empty
  const getMissingLayers = (spec: AgentSpec) => {
    const missing: string[] = [];
    if (!spec.identity.agent_name || !spec.identity.agent_profile) missing.push('Identidade');
    if (!spec.behavior.behaviour_rules) missing.push('Comportamento');
    if (!spec.security.security_rules) missing.push('Segurança');
    if (!spec.context.segment) missing.push('Contexto');
    if (!spec.planning.roteiro) missing.push('Planejamento');
    if (spec.action.tools.length === 0) missing.push('Ação (Tools)');
    if (!spec.response.task) missing.push('Resposta');
    return missing;
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

    let conversation = conversations.find(c => c.agentId === agentId);
    let updatedConvs = [...conversations];

    if (!conversation) {
      conversation = {
        id: `conv-${agentId}-${Date.now()}`,
        agentId,
        title: `Chat com ${activeAgent.spec.identity.agent_name}`,
        messages: [userMsg],
        updatedAt: new Date().toISOString(),
      };
      updatedConvs.push(conversation);
    } else {
      conversation.messages = [...conversation.messages, userMsg];
      conversation.updatedAt = new Date().toISOString();
      updatedConvs = conversations.map(c => c.id === conversation!.id ? conversation! : c);
    }

    setConversations(updatedConvs);

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

      setConversations(prev => prev.map(c => {
        if (c.agentId === agentId) {
          return {
            ...c,
            messages: [...c.messages, agentMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      }));
    }, 1200);
  };

  const createAgentFromSpec = () => {
    if (!creatorSpec.identity.agent_name) return;

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      model: 'Gemini 3.5 Flash',
      temperature: 0.4,
      spec: { ...creatorSpec },
      status: 'active',
      createdAt: new Date().toISOString(),
      integrations: {
        discord: false,
        telegram: false,
        slack: false,
        whatsapp: false,
        webWidget: true,
      },
    };

    setAgents(prev => [newAgent, ...prev]);
    resetCreatorChat();
    setSelectedAgent(newAgent);
    setActiveView('agents');
  };

  const updateAgentIntegrations = (agentId: string, integrations: Agent['integrations']) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, integrations } : a));
    setSelectedAgent(prev => prev && prev.id === agentId ? { ...prev, integrations } : prev);
  };

  const deleteAgent = (agentId: string) => {
    setAgents(prev => prev.filter(a => a.id !== agentId));
    setConversations(prev => prev.filter(c => c.agentId !== agentId));
    if (selectedAgent && selectedAgent.id === agentId) {
      setSelectedAgent(null);
    }
  };

  const resetCreatorChat = () => {
    setCreatorSpec(defaultSpec);
    setCreatorStep(0);
    setCreatorConversation(initialCreatorConversation);
    setLastUpdatedFields({});
  };

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        tenants: initialTenants,
        activeTenant,
        setActiveTenant,
        agents,
        selectedAgent,
        setSelectedAgent,
        conversations,
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
        updateAgentIntegrations,
        deleteAgent,
        resetCreatorChat,
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
