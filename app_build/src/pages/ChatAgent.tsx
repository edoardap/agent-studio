import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { Plus, Pin, MessageSquare, ArrowLeft } from 'lucide-react';
import './ChatAgent.css';

export const ChatAgent: React.FC = () => {
  const { 
    selectedAgent, 
    conversations, 
    sendMessageToAgent, 
    setActiveView 
  } = useApp();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Local state for active conversation and selected knowledge bases
  const [activeModel, setActiveModel] = useState(selectedAgent?.model || 'Gemini 3.5 Flash');
  const [selectedKBs, setSelectedKBs] = useState<Record<string, boolean>>({});

  // Find or create current active conversation
  const activeConversation = conversations.find(c => c.agentId === selectedAgent?.id) || {
    id: 'temp-chat',
    agentId: selectedAgent?.id || '',
    title: `Chat com ${selectedAgent?.spec.identity.agent_name || 'Agente'}`,
    messages: [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        content: `Olá! Eu sou o **${selectedAgent?.spec.identity.agent_name}**. Fui configurado como seu agente inteligente. Como posso ajudar você hoje?`,
        timestamp: new Date().toISOString(),
      }
    ],
    updatedAt: new Date().toISOString(),
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation.messages]);

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

  return (
    <div className="chat-agent-page fade-in">
      
      {/* Second Column: Sub Sidebar */}
      <div className="chat-sub-sidebar">
        
        {/* Return Button for Mobile/Tablet */}
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
              // Mocking document counts for visual interest
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

        {/* Pinned conversations */}
        <div className="sub-sidebar-section">
          <div className="sub-sidebar-title">Fixadas</div>
          <div className="conv-list">
            <button className="conv-item active">
              <Pin className="conv-item-icon" />
              <span className="conv-item-title">{activeConversation.messages[activeConversation.messages.length - 1]?.content.substring(0, 30) || 'Política de férias para estagiários'}...</span>
            </button>
          </div>
        </div>

        {/* Recent conversations */}
        <div className="sub-sidebar-section">
          <div className="sub-sidebar-title">Últimos 7 dias</div>
          <div className="conv-list">
            <button className="conv-item" onClick={() => alert('Conversa Antiga (Mock): Resumo do contrato com a Acme.')}>
              <MessageSquare className="conv-item-icon" />
              <span className="conv-item-title">Resumo do contrato com a Acme</span>
            </button>
            <button className="conv-item" onClick={() => alert('Conversa Antiga (Mock): Battlecard vs concorrente X.')}>
              <MessageSquare className="conv-item-icon" />
              <span className="conv-item-title">Battlecard vs concorrente X</span>
            </button>
          </div>
        </div>
      </div>

      {/* Third Column: Main Chat Panel */}
      <div className="chat-main-panel">
        
        {/* Header bar */}
        <div className="chat-panel-header">
          <div className="chat-header-info">
            <h3 className="chat-header-title">{activeConversation.messages[activeConversation.messages.length - 1]?.content.substring(0, 35) || 'Nova Conversa'}...</h3>
            <span className="chat-header-sub">
              {selectedCount} base(s) selecionada(s) • perfil de recuperação ativo
            </span>
          </div>

          <div className="chat-header-actions">
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
    </div>
  );
};
