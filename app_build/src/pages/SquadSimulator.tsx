import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Bot, Users, PlayCircle, Loader2, Info } from 'lucide-react';
import './SquadSimulator.css';

interface SimMessage {
  id: string;
  sender: 'user' | 'agent';
  agentName?: string;
  agentRole?: string;
  isInternal?: boolean; // Se for internal, é comunicação entre agentes
  content: string;
}

const MOCK_FLOW: Omit<SimMessage, 'id'>[] = [
  { sender: 'user', content: 'Quero viajar para Paris em Agosto, casal, por 5 dias.' },
  { sender: 'agent', agentName: 'Concierge', agentRole: 'Orquestrador', content: 'Recebi seu pedido! Excelente escolha. Como Agosto é alta temporada, vou acionar nosso Especialista Roteirista para montar a melhor opção de passeios e depois o Emissor para os orçamentos.' },
  { sender: 'agent', agentName: 'Concierge', agentRole: 'Orquestrador', isInternal: true, content: 'DELEGAÇÃO: @Roteirista, favor criar um roteiro de 5 dias em Paris para um casal em Agosto. Foco em romantismo e principais pontos turísticos.' },
  { sender: 'agent', agentName: 'Roteirista', agentRole: 'Especialista', isInternal: true, content: 'RESPOSTA INTERNA: Roteiro gerado. Dia 1: Torre Eiffel e Sena. Dia 2: Louvre e Champs-Élysées. Dia 3: Montmartre. Dia 4: Versalhes. Dia 5: Bairro Latino e compras.' },
  { sender: 'agent', agentName: 'Concierge', agentRole: 'Orquestrador', isInternal: true, content: 'DELEGAÇÃO: @Emissor, favor gerar estimativa de custos para voos GRU-CDG e hotel 4 estrelas em Agosto + tickets baseados no roteiro do @Roteirista.' },
  { sender: 'agent', agentName: 'Emissor', agentRole: 'Executor', isInternal: true, content: 'RESPOSTA INTERNA: Orçamento gerado. Voos aprox. R$12.000 (casal). Hotel 4 estrelas aprox. R$7.000. Passeios R$2.500. Total estimado: R$21.500.' },
  { sender: 'agent', agentName: 'Concierge', agentRole: 'Orquestrador', content: 'Tudo pronto! Nossa equipe montou o cenário perfeito para vocês:\n\n**Roteiro**: Inclui Torre Eiffel, Louvre, Versalhes e jantares românticos em Montmartre.\n**Investimento Estimado**: O pacote completo (Voo + Hotel 4⭐ + Passeios) fica em torno de R$21.500 para o casal.\n\nGostaria de prosseguir com as reservas ou quer ajustar algum detalhe do orçamento?' }
];

export const SquadSimulator: React.FC = () => {
  const { squads } = useApp();
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingStatus, setTypingStatus] = useState('');
  const [simulationStep, setSimulationStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Seleciona a Squad de Viagens se existir, senão usa mock
  const travelSquad = squads.find(s => s.name.toLowerCase().includes('viagen')) || {
    name: 'Squad de Viagens',
    description: 'Concierge, Roteirista e Emissor de Passagens.',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim() || simulationStep > 0) return;
    
    // 1. User sends message
    const userMsg: SimMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: input,
    };
    setMessages([userMsg]);
    setInput('');
    setSimulationStep(1);
    
    // Simulate flow
    simulateFlow(1);
  };

  const simulateFlow = (stepIndex: number) => {
    if (stepIndex >= MOCK_FLOW.length) {
      setSimulationStep(0);
      setIsTyping(false);
      return;
    }

    const nextMsg = MOCK_FLOW[stepIndex];
    setIsTyping(true);
    
    // Mudar o texto do "digitando..." dependendo se é interno ou não
    if (nextMsg.isInternal) {
      setTypingStatus(`${nextMsg.agentName} está processando a tarefa...`);
    } else {
      setTypingStatus(`${nextMsg.agentName} está respondendo ao cliente...`);
    }

    // Tempo de delay simulado (mais rápido para fins de demonstração)
    const delay = nextMsg.isInternal ? 2000 : 3000;

    setTimeout(() => {
      setMessages(prev => [...prev, { ...nextMsg, id: Date.now().toString() + stepIndex }]);
      simulateFlow(stepIndex + 1);
    }, delay);
  };

  return (
    <div className="simulator-page fade-in">
      {/* Sidebar - Squad Selector */}
      <aside className="simulator-sidebar">
        <div className="simulator-sidebar-header">
          <h3>Sessões de Simulação</h3>
          <p>Selecione uma squad para testar seu comportamento e regras de orquestração.</p>
        </div>
        
        <div className="simulator-squad-list">
          <button className="simulator-squad-item active">
            <Users size={18} />
            <div className="simulator-squad-info">
              <span className="squad-name">{travelSquad.name}</span>
              <span className="squad-status">Pronto para Teste</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="simulator-main">
        <div className="simulator-header">
          <div className="simulator-header-title">
            <PlayCircle size={20} className="text-primary" />
            <div>
              <h2>Testando: {travelSquad.name}</h2>
              <span className="simulator-badge">Workout Mode</span>
            </div>
          </div>
          <button className="simulator-reset-btn" onClick={() => { setMessages([]); setSimulationStep(0); setIsTyping(false); }}>
            Reiniciar Simulação
          </button>
        </div>

        <div className="simulator-chat-area">
          {messages.length === 0 ? (
            <div className="simulator-empty-state">
              <Bot size={48} className="empty-icon" />
              <h3>Simulador de Esquadrões</h3>
              <p>Esta é uma visão privilegiada de auditoria.<br/> Você verá o que o cliente vê, <strong>E</strong> as delegações internas entre os agentes.</p>
              
              <div className="simulator-suggestion" onClick={() => setInput('Quero viajar para Paris em Agosto, casal, por 5 dias.')}>
                <span>💡 Tente simular este pedido:</span>
                "Quero viajar para Paris em Agosto, casal, por 5 dias."
              </div>
            </div>
          ) : (
            <div className="simulator-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`sim-message-wrapper ${msg.sender} ${msg.isInternal ? 'internal' : ''}`}>
                  {msg.sender === 'agent' && (
                    <div className="sim-message-agent-avatar">
                      {msg.agentName?.charAt(0)}
                    </div>
                  )}
                  
                  <div className="sim-message-content">
                    {msg.sender === 'agent' && (
                      <div className="sim-message-header">
                        <span className="sim-agent-name">{msg.agentName}</span>
                        <span className="sim-agent-role">{msg.agentRole}</span>
                        {msg.isInternal && <span className="sim-internal-badge">Comunicação Interna</span>}
                      </div>
                    )}
                    
                    <div className="sim-bubble">
                      {msg.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line.startsWith('**') && line.includes('**:') ? (
                            <><strong>{line.split('**:')[0].replace('**', '')}</strong>: {line.split('**:')[1]}</>
                          ) : (
                            line
                          )}
                          <br/>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="sim-typing-indicator">
                  <Loader2 size={14} className="spin" />
                  <span>{typingStatus}</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="simulator-input-area">
          <div className="simulator-input-wrapper">
            <input
              type="text"
              placeholder="Envie uma mensagem como se fosse o cliente final..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={simulationStep > 0}
            />
            <button onClick={handleSend} disabled={!input.trim() || simulationStep > 0}>
              <Send size={18} />
            </button>
          </div>
          <div className="simulator-input-hint">
            <Info size={12} />
            O simulador revela as interações e decisões invisíveis dos agentes para garantir qualidade antes do deploy.
          </div>
        </div>
      </main>
    </div>
  );
};
