import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { Plus, ArrowLeft, Code, X, Cpu, FileText, Zap, Pin, MessageSquare } from 'lucide-react';
import { compilePromptSkeleton } from '../utils/promptCompiler';
import type { Conversation } from '../types';
import './ChatAgent.css';

// Agrupa conversas como no data-studio: "Fixadas" primeiro, depois por recência.
const groupConversations = (items: Conversation[]) => {
  const now = Date.now();
  const day = 86_400_000;
  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Fixadas', items: [] },
    { label: 'Hoje', items: [] },
    { label: 'Últimos 7 dias', items: [] },
    { label: 'Este mês', items: [] },
    { label: 'Antigas', items: [] },
  ];
  for (const c of items) {
    if (c.pinned) {
      groups[0].items.push(c);
      continue;
    }
    const age = now - new Date(c.updatedAt).getTime();
    if (age < day) groups[1].items.push(c);
    else if (age < 7 * day) groups[2].items.push(c);
    else if (age < 30 * day) groups[3].items.push(c);
    else groups[4].items.push(c);
  }
  return groups.filter(g => g.items.length > 0);
};

export const ChatAgent: React.FC = () => {
  const {
    selectedAgent,
    conversations,
    activeConversationId,
    setActiveConversationId,
    startNewConversation,
    toggleConversationPin,
    sendMessageToAgent,
    setActiveView,
    masterTemplates,
    isAdvanced,
  } = useApp();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Local state for active conversation and selected knowledge bases
  const [activeModel, setActiveModel] = useState(selectedAgent?.model || 'Gemini 3.5 Flash');
  const [selectedKBs, setSelectedKBs] = useState<Record<string, boolean>>({});
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [convSearch, setConvSearch] = useState('');

  // Observability glow state
  const [stateGlowing, setStateGlowing] = useState(false);
  const [summaryGlowing, setSummaryGlowing] = useState(false);

  // Baselines para detectar mudança REAL de estado/resumo (e não brilhar só
  // porque trocou de conversa). `undefined` força a 1ª passada a só sincronizar.
  const prevConvIdRef = useRef<string | null | undefined>(undefined);
  const prevStateRef = useRef<string>('');
  const prevSummaryRef = useRef<string>('');

  // Conversa ativa (uma de N do agente). Se nenhuma estiver ativa, mostra um
  // estado sintético de boas-vindas — a conversa real é criada na 1ª mensagem.
  const activeConversation = conversations.find(c => c.id === activeConversationId) || {
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

  // Brilha cada card só quando o SEU valor muda de verdade (após a resposta do
  // agente). Trocar de conversa ou abrir o chat apenas sincroniza a baseline.
  useEffect(() => {
    const stateStr = JSON.stringify(activeConversation.state_json);
    const summaryStr = activeConversation.summary_text;

    if (prevConvIdRef.current !== activeConversationId) {
      prevConvIdRef.current = activeConversationId;
      prevStateRef.current = stateStr;
      prevSummaryRef.current = summaryStr;
      setStateGlowing(false);
      setSummaryGlowing(false);
      return;
    }

    const stateChanged = stateStr !== prevStateRef.current;
    const summaryChanged = summaryStr !== prevSummaryRef.current;
    if (!stateChanged && !summaryChanged) return;

    if (stateChanged) setStateGlowing(true);
    if (summaryChanged) setSummaryGlowing(true);
    prevStateRef.current = stateStr;
    prevSummaryRef.current = summaryStr;

    const timer = setTimeout(() => {
      setStateGlowing(false);
      setSummaryGlowing(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [activeConversationId, activeConversation.state_json, activeConversation.summary_text]);

  // Bases de conhecimento associadas (vindas do data-studio). Por padrão todas
  // começam ativas para a conversa.
  useEffect(() => {
    if (selectedAgent?.spec.action.knowledge_bases) {
      const initialKBs: Record<string, boolean> = {};
      selectedAgent.spec.action.knowledge_bases.forEach(kb => {
        initialKBs[kb.id] = true;
      });
      setSelectedKBs(initialKBs);
    }
  }, [selectedAgent]);

  const handleKBChange = (kbId: string) => {
    setSelectedKBs(prev => ({
      ...prev,
      [kbId]: !prev[kbId]
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

  // Histórico: conversas deste agente, mais recentes primeiro, filtradas pela busca.
  const agentConversations = conversations
    .filter(c => c.agentId === selectedAgent.id)
    .filter(c => {
      if (!convSearch.trim()) return true;
      const q = convSearch.toLowerCase();
      const lastMsg = c.messages[c.messages.length - 1]?.content ?? '';
      return c.title.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Agrupamento estilo data-studio: "Fixadas" primeiro, depois por recência.
  const conversationGroups = groupConversations(agentConversations);

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
  const filledSkeleton = compilePromptSkeleton(
    template?.promptSkeleton ?? '(template master não encontrado)',
    selectedAgent.spec,
    runtimeValues,
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
          onClick={() => startNewConversation(selectedAgent.id)}
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
            value={convSearch}
            onChange={(e) => setConvSearch(e.target.value)}
          />
        </div>

        {/* Knowledge bases selector checklist (associadas via data-studio) */}
        <div className="sub-sidebar-section">
          <div className="sub-sidebar-title">
            <span>Bases de Conhecimento</span>
            {selectedAgent.spec.action.knowledge_bases.length > 0 && (
              <button
                className="sub-sidebar-action"
                onClick={() => {
                  const allChecked = Object.values(selectedKBs).every(Boolean);
                  const updated: Record<string, boolean> = {};
                  selectedAgent.spec.action.knowledge_bases.forEach(kb => {
                    updated[kb.id] = !allChecked;
                  });
                  setSelectedKBs(updated);
                }}
              >
                {Object.values(selectedKBs).every(Boolean) ? 'Limpar' : 'Todas'}
              </button>
            )}
          </div>

          {selectedAgent.spec.action.knowledge_bases.length > 0 ? (
            <div className="kb-list">
              {selectedAgent.spec.action.knowledge_bases.map((kb) => (
                <label key={kb.id} className="kb-item">
                  <input
                    type="checkbox"
                    className="kb-checkbox"
                    checked={!!selectedKBs[kb.id]}
                    onChange={() => handleKBChange(kb.id)}
                  />
                  <div className="kb-item-info">
                    <span className="kb-item-name">{kb.name}</span>
                    <span className="kb-item-meta">data-studio • {selectedKBs[kb.id] ? 'Ativa' : 'Inativa'}</span>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="conv-history-empty">
              Nenhuma base associada. Associe na Fábrica (camada Ação).
            </p>
          )}
        </div>

        {/* Conversation history (abaixo das Bases de Conhecimento, como no data-studio) */}
        <div className="sub-sidebar-section conv-history-section">
          <div className="sub-sidebar-title">
            <span>Histórico de Conversas</span>
            <span className="conv-history-count">{agentConversations.length}</span>
          </div>

          {conversationGroups.length > 0 ? (
            <div className="conv-history-list">
              {conversationGroups.map((group) => (
                <div key={group.label} className="conv-history-group">
                  <div className="conv-history-group-label">{group.label}</div>
                  {group.items.map((conv) => {
                    const lastMsg = conv.messages[conv.messages.length - 1]?.content ?? '';
                    const isActiveConv = conv.id === activeConversationId;
                    return (
                      <div
                        key={conv.id}
                        className={`conv-history-item ${isActiveConv ? 'active' : ''} ${conv.pinned ? 'pinned' : ''}`}
                        onClick={() => setActiveConversationId(conv.id)}
                      >
                        <div className="conv-history-item-row">
                          {conv.pinned ? (
                            <Pin size={12} className="conv-history-lead pinned" />
                          ) : (
                            <MessageSquare size={12} className="conv-history-lead" />
                          )}
                          <span className="conv-history-title">{conv.title}</span>
                          <button
                            type="button"
                            className="conv-history-pin-btn"
                            title={conv.pinned ? 'Desafixar conversa' : 'Fixar conversa'}
                            onClick={(e) => { e.stopPropagation(); toggleConversationPin(conv.id); }}
                          >
                            <Pin size={12} />
                          </button>
                        </div>
                        <span className="conv-history-preview">{lastMsg.replace(/[*#]/g, '')}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <p className="conv-history-empty">
              {convSearch.trim()
                ? 'Nenhuma conversa encontrada para a busca.'
                : 'Nenhuma conversa ainda. Clique em "Nova conversa" ou envie uma mensagem.'}
            </p>
          )}
        </div>

        {/* ── Observability (Estado + Resumo) — só no Modo Avançado ──
            São artefatos de runtime/debug do motor (state_json / summary_text),
            não features para o usuário final. Ficam visíveis para o perfil
            curador/engenheiro (Avançado); no Simples a conversa fica limpa. */}
        {isAdvanced && (
        <>
        {/* Caption: explica o que são esses cards (são debug do runtime) */}
        <p className="obs-intro">
          Observabilidade do runtime (debug). Estes são o <strong>estado</strong> e o
          <strong> resumo</strong> que o compilador injeta no prompt — eles brilham quando o
          agente os atualiza, a cada resposta.
        </p>

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
        </>
        )}

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
            {/* Inspect Prompt Button — debug/observability, só no Modo Avançado */}
            {isAdvanced && (
              <button
                className="inspect-prompt-btn"
                onClick={() => setShowPromptModal(true)}
                title="Inspecionar Prompt Compilado"
              >
                <Code size={14} />
                <span>Inspecionar Prompt</span>
              </button>
            )}

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
