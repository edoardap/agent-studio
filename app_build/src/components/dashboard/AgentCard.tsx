import React from 'react';
import type { Agent } from '../../types';
import { useApp } from '../../context/AppContext';
import { MessageSquare, Share2, Trash2, Pencil } from 'lucide-react';
import './AgentCard.css';

interface AgentCardProps {
  agent: Agent;
  onChat: () => void;
  onShare: () => void;
  onEdit: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onChat, onShare, onEdit }) => {
  const { deleteAgent, toggleAgentActiveStatus } = useApp();
  const { model } = agent;
  const name = agent.spec.identity.agent_name;
  const description = agent.spec.identity.agent_profile;
  const skills = agent.spec.action.tools;
  const isActive = agent.is_active;

  const isFlash = model.toLowerCase().includes('flash');

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja deletar o agente "${name}"?`)) {
      deleteAgent(agent.id);
    }
  };

  const handleToggle = () => {
    toggleAgentActiveStatus(agent.id);
  };

  return (
    <div className={`agent-card fade-in ${!isActive ? 'agent-card-inactive' : ''}`}>
      <div>
        <div className="agent-card-header">
          <h3 className="agent-card-title">{name}</h3>
          <div className="agent-card-badges">
            <span className={`agent-model-badge ${isFlash ? 'flash' : 'pro'}`}>
              {isFlash ? 'Flash' : 'Pro'}
            </span>
            <div
              className="agent-status-control"
              title={isActive ? 'Desativar agente' : 'Ativar agente'}
            >
              <span className={`agent-status-label ${isActive ? 'active' : ''}`}>
                {isActive ? 'Ativo' : 'Inativo'}
              </span>
              <label className="agent-toggle-switch" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={isActive} onChange={handleToggle} />
                <span className="agent-toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Meta info row: channel + template */}
        <div className="agent-card-meta">
          {agent.channel && (
            <span className="agent-meta-tag">
              📡 {agent.channel}
            </span>
          )}
          {agent.master_template_key && (
            <span className="agent-meta-tag template">
              🏗️ {agent.master_template_key}
            </span>
          )}
        </div>

        <p className="agent-card-description">{description}</p>

        {skills && skills.length > 0 && (
          <div className="agent-card-skills">
            {skills.slice(0, 3).map((skill, index) => (
              <span key={index} className="agent-skill-tag">
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="agent-skill-tag">
                +{skills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="agent-card-actions">
        <div className="agent-action-main">
          <button
            className={`agent-action-btn chat ${!isActive ? 'disabled' : ''}`}
            onClick={isActive ? onChat : undefined}
            disabled={!isActive}
            title={!isActive ? 'Agente inativo. Ative-o para conversar.' : 'Conversar com o agente'}
          >
            <MessageSquare size={14} />
            <span>Conversar</span>
          </button>

          <button
            className="agent-action-btn share"
            onClick={onShare}
          >
            <Share2 size={14} />
            <span>Disponibilizar</span>
          </button>
        </div>

        <div className="agent-card-right-actions">
          <button
            className="agent-edit-btn"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Editar spec do agente"
          >
            <Pencil size={14} />
          </button>
          <button
            className="agent-delete-btn"
            onClick={handleDelete}
            title="Deletar Agente"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
