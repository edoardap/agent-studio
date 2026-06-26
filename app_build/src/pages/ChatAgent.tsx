import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { Plus, ArrowLeft, Code, X, Cpu, FileText, Zap } from 'lucide-react';
import './ChatAgent.css';

export const ChatAgent: React.FC = () => {
  const {
    selectedAgent,
    conversations,
    sendMessageToAgent,
    setActiveView,
    masterTemplates
  } = useApp();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Local state for active conversation and selected knowledge bases
  const [activeModel, setActiveModel] = useState(selectedAgent?.model || 'Gemini 3.5 Flash');
  const [selectedKBs, setSelectedKBs] = useState<Record<string, boolean>>({});
  const [showPromptModal, setShowPromptModal] = useState(false);

  // Observability glow state
  const [stateGlowing, setStateGlowing] = useState(false);
  const [summaryGlowing, setSummaryGlowing] = useState(false);

  // Track the previous message count to detect new messages
  const prevMsgCountRef = useRef<number>(0);

  // Find or create current active conversation
  const activeConversation = conversations.find(c => c.agentId === selectedAgent?.id) || {
    id: 'temp-chat',
    agentId: selectedAgent?.id || '',
    title: `Chat com ${selectedAgent?.spec.identity.agent_name || 'Agente'}`,
    messages: [
      {
        id: 'msg-welcome',
        sender: 'assistant' as const,
        content: `Olá! Eu sou o **${selectedAgent?.spec.identity.agent_name}**. Fui configurado como seu agente inteligente. Como posso ajudar você hoje?`,
        timestamp: new Date().toISOString(),
      }
    ],
    updatedAt: new Date().toISOString(),
    state_json: {
      current_stage: selectedAgent?.spec.planning.default_agent_stage || 'triagem',
      user_intent: 'aguardando_input',
      current_goal: selectedAgent?.spec.planning.default_current_goal || 'Iniciar atendimento',
      next_action: selectedAgent?.spec.planning.default_next_action || 'aguardar_mensagem',
    },
    summary_text: '',
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation.messages]);

  // Trigger observability glow when messages change
  useEffect(() => {
    const currentCount = activeConversation.messages.length;
    if (currentCount > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
      // New message arrived — trigger glow after a short delay (simulating async state update)
      const glowTimer = setTimeout(() => {
        setStateGlowing(true);
        setSummaryGlowing(true);
        setTimeout(() => {
          setStateGlowing(false);
          setSummaryGlowing(false);
        }, 3000);
      }, 1300); // slightly after the agent reply delay
      return () => clearTimeout(glowTimer);
    }
    prevMsgCountRef.current = currentCount;
  }, [activeConversation.messages.length]);

  // Handle setting active knowledge bases
  useEffect(() => {
    if (selectedAgent?.spec.action.tools) {
      const initialKBs: Record<string, boolean> = {};
      selectedAgent.spec.action.tools.forEach(skill => {
        initialKBs[skill] = true; // By default all skills/bases are checked
      });
      setSelectedKBs(initialKBs);
    }
  }, [selectedAgent]);

  const handleKBChange = (skill: string) => {
    setSelectedKBs(prev => ({
      ...prev,
      [skill]: !prev[skill]
    }));
  };

  if (!selectedAgent) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Selecione um agente na lista para conversar.</p>
        <button onClick={() => setActiveView('agents')}>Voltar para lista</button>
      </div>
    );
  }

  const selectedCount = Object.values(selectedKBs).filter(Boolean).length;
  const { state_json, summary_text } = activeConversation;

  // ── Compilador "Spec to Agent" (simulado) ──
  // Pega o ESQUELETO do template master e preenche as lacunas {{...}} com os valores
  // da spec + os dados de runtime da conversa. Isto é o que o compilador real faz.
  const template = masterTemplates.find(t => t.name === selectedAgent.master_template_key);

  const recentMessages =
    activeConversation.messages
      .slice(-6)
      .map(m => `[${m.sender.toUpperCase()}] ${m.content}`)
      .join('\n') || '(sem mensagens ainda)';

  const lastUserMessage =
    [...activeConversation.messages].reverse().find(m => m.sender === 'user')?.content ??
    '(aguardando primeira mensagem)';

  const runtimeValues: Record<string, string> = {
    state_json: JSON.stringify(state_json, null, 2),
    summary_text: summary_text || '(sem resumo ainda — aguardando primeira interação)',
    recent_messages: recentMessages,
    user_message: lastUserMessage,
  };

  // Substitui {{camada.campo}} (spec) e {{token}} (runtime) no esqueleto.
  const filledSkeleton = (template?.promptSkeleton ?? '(template master não encontrado)').replace(
    /\{\{\s*([\w.]+)\s*\}\}/g,
    (_match, path: string) => {
      if (path in runtimeValues) return runtimeValues[path];
      const value = path
        .split('.')
        .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), selectedAgent.spec);
      if (value === undefined || value === null || value === '') return `«${path} não preenchido»`;
      if (Array.isArray(value)) return value.length ? value.map(v => `- ${v}`).join('\n') : '(nenhuma)';
      return String(value);
    }
  );

  const compiledPromptText = `[AGENT_SYSTEM — Prompt Compilado · envio real ao LLM]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Template Master : ${selectedAgent.master_template_key}
Canal           : ${selectedAgent.channel}
Modelo          : ${activeModel}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${filledSkeleton}`;

  return (
    <div className="chat-agent-page fade-in">

      {/* Second Column: Sub Sidebar */}
      <div className="chat-sub-sidebar">

        {/* Return Button */}
        <button
          onClick={() => setActiveView('agents')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}
        >
          <ArrowLeft size={14} />
          <span>Voltar aos agentes</span>
        </button>

        {/* New Conversation Button */}
        <button
          className="new-conv-btn"
          onClick={() => alert('Nova conversa iniciada (Mock).')}
        >
          <Plus size={16} />
          <span>Nova conversa</span>
        </button>

        {/* Conversation Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Buscar conversas..."
            className="conv-search-input"
          />
        </div>

        {/* Knowledge bases selector checklist */}
        <div className="sub-sidebar-section">
          <div className="sub-sidebar-title">
            <span>Bases de Conhecimento</span>
            <button
              className="sub-sidebar-action"
              onClick={() => {
                const allChecked = Object.values(selectedKBs).every(Boolean);
                const updated: Record<string, boolean> = {};
                selectedAgent.spec.action.tools.forEach(skill => {
                  updated[skill] = !allChecked;
                });
                setSelectedKBs(updated);
              }}
            >
              {Object.values(selectedKBs).every(Boolean) ? 'Limpar' : 'Todas'}
            </button>
          </div>

          <div className="kb-list">
            {selectedAgent.spec.action.tools.map((skill, index) => {
              const docCount = 12 + (index * 42) + (index * 7);
              return (
                <label key={index} className="kb-item">
                  <input
                    type="checkbox"
                    className="kb-checkbox"
                    checked={!!selectedKBs[skill]}
                    onChange={() => handleKBChange(skill)}
                  />
                  <div className="kb-item-info">
                    <span className="kb-item-name">{skill}</span>
                    <span className="kb-item-meta">{docCount} docs • Ativo</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── Observability Card: Estado da Conversa ── */}
        <div className={`obs-card ${stateGlowing ? 'updated-glow-card' : ''}`}>
          <div className="obs-card-header">
            <Cpu size={13} />
            <span>Estado da Conversa</span>
          </div>
          <div className="obs-card-body">
            <div className="obs-field">
              <span className="obs-label">Fase</span>
              <span className="obs-value stage">{state_json.current_stage}</span>
            </div>
            <div className="obs-field">
              <span className="obs-label">Intenção</span>
              <span className="obs-value">{state_json.user_intent}</span>
            </div>
            <div className="obs-field">
              <span className="obs-label">Objetivo</span>
              <span className="obs-value">{state_json.current_goal}</span>
            </div>
            <div className="obs-field">
              <span className="obs-label">Próxima Ação</span>
              <span className="obs-value action">{state_json.next_action}</span>
            </div>
          </div>
        </div>

        {/* ── Observability Card: Resumo ── */}
        <div className={`obs-card ${summaryGlowing ? 'updated-glow-card' : ''}`}>
          <div className="obs-card-header">
            <FileText size={13} />
            <span>Resumo (Summary)</span>
          </div>
          <div className="obs-card-body">
            {summary_text ? (
              <p className="obs-summary-text">{summary_text}</p>
            ) : (
              <p className="obs-summary-empty">Nenhum resumo ainda. Envie uma mensagem para gerar o estado vivo.</p>
            )}
          </div>
        </div>

      </div>

      {/* Third Column: Main Chat Panel */}
      <div className="chat-main-panel">

        {/* Header bar */}
        <div className="chat-panel-header">
          <div className="chat-header-info">
            <h3 className="chat-header-title">
              {activeConversation.messages[activeConversation.messages.length - 1]?.content.substring(0, 35) || 'Nova Conversa'}...
            </h3>
            <span className="chat-header-sub">
              {selectedCount} base(s) • {selectedAgent.master_template_key} • {selectedAgent.channel}
            </span>
          </div>

          <div className="chat-header-actions">
            {/* Inspect Prompt Button */}
            <button
              className="inspect-prompt-btn"
              onClick={() => setShowPromptModal(true)}
              title="Inspecionar Prompt Compilado"
            >
              <Code size={14} />
              <span>Inspecionar Prompt</span>
            </button>

            <select
              className="chat-model-select"
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
            >
              <option value="Gemini 3.5 Flash">Gemini 3.5 Flash</option>
              <option value="Gemini 3.5 Pro">Gemini 3.5 Pro</option>
            </select>
          </div>
        </div>

        {/* Message area */}
        <div className="chat-panel-messages">
          {activeConversation.messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <div style={{ padding: '0 24px 24px 24px' }}>
          <ChatInput
            onSend={(content) => sendMessageToAgent(selectedAgent.id, content)}
            placeholder={`Pergunte algo sobre suas bases ao ${selectedAgent.spec.identity.agent_name}...`}
          />
        </div>
      </div>

      {/* ── Prompt Inspector Modal ── */}
      {showPromptModal && (
        <div className="prompt-modal-overlay" onClick={() => setShowPromptModal(false)}>
          <div className="prompt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prompt-modal-header">
              <div className="prompt-modal-title">
                <Zap size={16} />
                <span>Prompt Compilado — Envio Real para LLM</span>
              </div>
              <button className="prompt-modal-close" onClick={() => setShowPromptModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="prompt-modal-body">
              <div className="prompt-modal-meta">
                <span className="prompt-meta-chip">Template: <strong>{selectedAgent.master_template_key}</strong></span>
                <span className="prompt-meta-chip">Canal: <strong>{selectedAgent.channel}</strong></span>
                <span className="prompt-meta-chip">Modelo: <strong>{activeModel}</strong></span>
              </div>
              <pre className="prompt-terminal">{compiledPromptText}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
