import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Sparkles, Users, Bot, Zap, ArrowRight } from 'lucide-react';
import './PlannerChat.css';

interface PlannerMessage {
  id: string;
  role: 'planner' | 'user';
  content: string;
  recommendation?: 'single' | 'squad' | null;
  timestamp: string;
}

const PLANNER_INTRO: PlannerMessage = {
  id: 'intro',
  role: 'planner',
  content: 'Olá! Eu sou o **Agente Planejador**. Descreva em linguagem natural o sistema que você quer construir — pode ser algo simples como um bot de FAQ, ou algo complexo como uma squad de vendas com vários especialistas. Vou analisar e recomendar a melhor arquitetura para você.',
  recommendation: null,
  timestamp: new Date().toISOString(),
};

// Simple heuristic: detect if prompt needs a squad
function analyzeIntent(text: string): { recommendation: 'single' | 'squad'; reasoning: string; roles?: string[] } {
  const lower = text.toLowerCase();

  const squadKeywords = [
    'squad', 'time', 'equipe', 'vários', 'varios', 'financeiro', 'vendas e suporte',
    'triagem', 'escalada', 'roteiro e orçamento', 'roteiro e orcamento', 'diferentes etapas',
    'múltiplos', 'multiplos', 'time completo', 'sistema completo', 'pipeline'
  ];
  const isSquad = squadKeywords.some(k => lower.includes(k));

  if (isSquad) {
    const roles: string[] = [];
    if (lower.includes('vendas') || lower.includes('comercial')) roles.push('Agente de Vendas');
    if (lower.includes('suporte') || lower.includes('atendimento')) roles.push('Agente de Suporte');
    if (lower.includes('financeiro') || lower.includes('pagamento')) roles.push('Agente Financeiro');
    if (lower.includes('viagem') || lower.includes('roteiro')) roles.push('Agente Roteirista');
    if (lower.includes('técnico') || lower.includes('tecnico') || lower.includes('engenharia')) roles.push('Agente Técnico');
    if (roles.length === 0) roles.push('Agente Especialista', 'Agente Orquestrador');

    return {
      recommendation: 'squad',
      reasoning: `Identifiquei que sua demanda envolve **múltiplos contextos e responsabilidades distintas**. Um único agente ficaria sobrecarregado e propenso a erros. Recomendo montar uma **Squad** com os seguintes papéis:`,
      roles,
    };
  }

  return {
    recommendation: 'single',
    reasoning: `Sua demanda é bem definida e focada em um único objetivo. Recomendo criar um **Agente Único** — mais simples, rápido de configurar e suficiente para esse caso.`,
  };
}

function buildPlannerReply(userText: string): PlannerMessage {
  const analysis = analyzeIntent(userText);
  let content = analysis.reasoning;
  if (analysis.roles && analysis.roles.length > 0) {
    content += '\n\n' + analysis.roles.map(r => `• **${r}**`).join('\n');
    content += '\n\nO **Agente Orquestrador** vai coordenar todos eles. Posso montar essa estrutura para você agora.';
  } else {
    content += '\n\nPosso criar esse agente agora na Fábrica, onde você vai configurar as 7 camadas da spec dele com a ajuda do Copiloto.';
  }
  return {
    id: `planner-${Date.now()}`,
    role: 'planner',
    content,
    recommendation: analysis.recommendation,
    timestamp: new Date().toISOString(),
  };
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

interface PlannerChatProps {
  isSidebarMode?: boolean;
}

export const PlannerChat: React.FC<PlannerChatProps> = ({ isSidebarMode = false }) => {
  const { setActiveView } = useApp();
  const [messages, setMessages] = useState<PlannerMessage[]>([PLANNER_INTRO]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsg: PlannerMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    setTimeout(() => {
      const reply = buildPlannerReply(text);
      setMessages(prev => [...prev, reply]);
      setIsThinking(false);
    }, 1200 + Math.random() * 800);
  };


  const QUICK_PROMPTS = [
    'Quero um bot para tirar dúvidas de clientes sobre meu produto',
    'Preciso de um sistema de vendas com atendimento, financeiro e suporte',
    'Quero uma agência de viagens com roteirista e emissor de passagens',
  ];

  return (
    <div className={`planner-page fade-in ${isSidebarMode ? 'is-sidebar-mode' : ''}`}>
      {/* ── Header ── */}
      <div className="planner-header">
        <div className="planner-header-glow" />
        <div className="planner-header-content">
          <div className="planner-avatar-wrap">
            <div className="planner-avatar">
              <Sparkles size={20} />
            </div>
            <div className="planner-header-ping" />
          </div>
          <div>
            <h1 className="planner-title">Agente Planejador</h1>
            <p className="planner-subtitle">Descreva o que você precisa — eu projeto a arquitetura ideal.</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="planner-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`planner-msg-row ${msg.role}`}>
            {msg.role === 'planner' && (
              <div className="planner-msg-avatar">
                <Sparkles size={13} />
              </div>
            )}
            <div className={`planner-bubble ${msg.role}`}>
              <p dangerouslySetInnerHTML={{ __html: '<p>' + renderMarkdown(msg.content) + '</p>' }} />

              {/* Action buttons when there's a recommendation */}
              {msg.recommendation && (
                <div className="planner-actions">
                  {msg.recommendation === 'single' ? (
                    <button
                      className="planner-action-btn primary"
                      onClick={() => setActiveView('factory')}
                    >
                      <Bot size={14} /> Criar Agente na Fábrica <ArrowRight size={13} />
                    </button>
                  ) : (
                    <>
                      <button
                        className="planner-action-btn primary"
                        onClick={() => setActiveView('organograma')}
                      >
                        <Users size={14} /> Montar Squad no Organograma <ArrowRight size={13} />
                      </button>
                      <button
                        className="planner-action-btn secondary"
                        onClick={() => setActiveView('agents')}
                      >
                        Ver Agentes Disponíveis
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="planner-msg-row planner">
            <div className="planner-msg-avatar">
              <Sparkles size={13} />
            </div>
            <div className="planner-bubble planner thinking">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts (only show if no user message yet) */}
      {messages.length === 1 && (
        <div className="planner-quick-prompts">
          <p className="planner-quick-label">Tente um desses exemplos:</p>
          <div className="planner-quick-list">
            {QUICK_PROMPTS.map(p => (
              <button key={p} className="planner-quick-chip" onClick={() => { setInput(p); }}>
                <Zap size={11} /> {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="planner-input-area">
        <div className="planner-input-wrap">
          <textarea
            className="planner-textarea"
            placeholder="Descreva o sistema que você quer construir..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            rows={2}
          />
          <button
            className={`planner-send-btn ${!input.trim() || isThinking ? 'disabled' : ''}`}
            onClick={sendMessage}
            disabled={!input.trim() || isThinking}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="planner-hint">Enter para enviar · Shift+Enter para quebra de linha</p>
      </div>
    </div>
  );
};
