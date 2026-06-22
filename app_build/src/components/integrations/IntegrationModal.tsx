import type { Agent } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, MessageSquare, MessageCircle, Send, Cpu } from 'lucide-react';
import './IntegrationModal.css';

const SlackIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M21 12H3M12 3v18" />
  </svg>
);

interface IntegrationModalProps {
  agent: Agent;
  onClose: () => void;
}

export const IntegrationModal: React.FC<IntegrationModalProps> = ({ agent, onClose }) => {
  const { updateAgentIntegrations } = useApp();

  const handleToggle = (channel: keyof Agent['integrations']) => {
    const updated = {
      ...agent.integrations,
      [channel]: !agent.integrations[channel],
    };
    updateAgentIntegrations(agent.id, updated);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Disponibilizar {agent.spec.identity.agent_name}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-content">
          <p className="modal-section-desc">
            Disponibilize o seu agente nos canais corporativos da sua empresa ou incorpore-o no seu site externo através do Web Widget.
          </p>

          <div className="integration-channels-list">
            {/* 1. Web Widget */}
            <div className={`integration-channel-item ${agent.integrations.webWidget ? 'active' : ''}`}>
              <div className="integration-channel-main">
                <div className="integration-channel-info">
                  <div className="integration-channel-icon-wrapper">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h4 className="integration-channel-title">Web Widget</h4>
                    <span className="integration-channel-desc">Incorpore um widget de chat flutuante em qualquer página HTML.</span>
                  </div>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={agent.integrations.webWidget}
                    onChange={() => handleToggle('webWidget')}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {agent.integrations.webWidget && (
                <div className="integration-details-panel">
                  <span className="integration-details-label">Código de Incorporação:</span>
                  <div className="integration-details-code">
                    {`<script 
  src="https://cdn.acme.ai/widget.js" 
  data-agent-id="${agent.id}" 
  data-tenant-id="acme-holding"
  async>
</script>`}
                  </div>
                  <button
                    className="integration-copy-btn"
                    onClick={() => copyToClipboard(`<script src="https://cdn.acme.ai/widget.js" data-agent-id="${agent.id}" data-tenant-id="acme-holding" async></script>`)}
                  >
                    Copiar Script
                  </button>
                </div>
              )}
            </div>

            {/* 2. Discord */}
            <div className={`integration-channel-item ${agent.integrations.discord ? 'active' : ''}`}>
              <div className="integration-channel-main">
                <div className="integration-channel-info">
                  <div className="integration-channel-icon-wrapper">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 className="integration-channel-title">Discord Bot</h4>
                    <span className="integration-channel-desc">Conecte o agente a um servidor do Discord para responder a menções.</span>
                  </div>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={agent.integrations.discord}
                    onChange={() => handleToggle('discord')}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {agent.integrations.discord && (
                <div className="integration-details-panel">
                  <span className="integration-details-label">Webhook URL de Destino:</span>
                  <div className="integration-details-code">
                    {`https://api.acme.ai/v1/integrations/discord/webhook/${agent.id}`}
                  </div>
                  <button
                    className="integration-copy-btn"
                    onClick={() => copyToClipboard(`https://api.acme.ai/v1/integrations/discord/webhook/${agent.id}`)}
                  >
                    Copiar Webhook
                  </button>
                </div>
              )}
            </div>

            {/* 3. Slack */}
            <div className={`integration-channel-item ${agent.integrations.slack ? 'active' : ''}`}>
              <div className="integration-channel-main">
                <div className="integration-channel-info">
                  <div className="integration-channel-icon-wrapper">
                    <SlackIcon size={20} />
                  </div>
                  <div>
                    <h4 className="integration-channel-title">Slack Enterprise</h4>
                    <span className="integration-channel-desc">Instale o agente como um Slack App no seu workspace corporativo.</span>
                  </div>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={agent.integrations.slack}
                    onChange={() => handleToggle('slack')}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {agent.integrations.slack && (
                <div className="integration-details-panel">
                  <span className="integration-details-label">OAuth Bot Token (Mock):</span>
                  <div className="integration-details-code">
                    {`xoxb-acme-agent-${agent.id}-50912-mocktoken`}
                  </div>
                  <button
                    className="integration-copy-btn"
                    onClick={() => copyToClipboard(`xoxb-acme-agent-${agent.id}-50912-mocktoken`)}
                  >
                    Copiar Token
                  </button>
                </div>
              )}
            </div>

            {/* 4. Telegram */}
            <div className={`integration-channel-item ${agent.integrations.telegram ? 'active' : ''}`}>
              <div className="integration-channel-main">
                <div className="integration-channel-info">
                  <div className="integration-channel-icon-wrapper">
                    <Send size={20} />
                  </div>
                  <div>
                    <h4 className="integration-channel-title">Telegram Bot</h4>
                    <span className="integration-channel-desc">Responda a conversas diretas ou menções em canais do Telegram.</span>
                  </div>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={agent.integrations.telegram}
                    onChange={() => handleToggle('telegram')}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {agent.integrations.telegram && (
                <div className="integration-details-panel">
                  <span className="integration-details-label">BotFather Token:</span>
                  <div className="integration-details-code">
                    {`591249821:AAEg1iZmock_token_for_telegram_${agent.id}`}
                  </div>
                  <button
                    className="integration-copy-btn"
                    onClick={() => copyToClipboard(`591249821:AAEg1iZmock_token_for_telegram_${agent.id}`)}
                  >
                    Copiar Token
                  </button>
                </div>
              )}
            </div>

            {/* 5. WhatsApp */}
            <div className={`integration-channel-item ${agent.integrations.whatsapp ? 'active' : ''}`}>
              <div className="integration-channel-main">
                <div className="integration-channel-info">
                  <div className="integration-channel-icon-wrapper">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <h4 className="integration-channel-title">WhatsApp Business</h4>
                    <span className="integration-channel-desc">Conecte com a API oficial do WhatsApp Cloud para automação de SAC.</span>
                  </div>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={agent.integrations.whatsapp}
                    onChange={() => handleToggle('whatsapp')}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {agent.integrations.whatsapp && (
                <div className="integration-details-panel">
                  <span className="integration-details-label">Webhook Callback:</span>
                  <div className="integration-details-code">
                    {`https://api.acme.ai/v1/integrations/whatsapp/callback/${agent.id}`}
                  </div>
                  <button
                    className="integration-copy-btn"
                    onClick={() => copyToClipboard(`https://api.acme.ai/v1/integrations/whatsapp/callback/${agent.id}`)}
                  >
                    Copiar Callback URL
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
