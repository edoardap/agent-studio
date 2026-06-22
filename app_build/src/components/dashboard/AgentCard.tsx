import React from 'react';
import type { Agent } from '../../types';
import { useApp } from '../../context/AppContext';
import { MessageSquare, Share2, Trash2 } from 'lucide-react';
import './AgentCard.css';

interface AgentCardProps {
  agent: Agent;
  onChat: () => void;
  onShare: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onChat, onShare }) => {
  const { deleteAgent } = useApp();
  const { model } = agent;
  const name = agent.spec.identity.agent_name;
  const description = agent.spec.identity.agent_profile;
  const skills = agent.spec.action.tools;

  const isFlash = model.toLowerCase().includes('flash');

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja deletar o agente "${name}"?`)) {
      deleteAgent(agent.id);
    }
  };

  return (
    <div className="agent-card fade-in">
      <div>
        <div className="agent-card-header">
          <h3 className="agent-card-title">{name}</h3>
          <span className={`agent-model-badge ${isFlash ? 'flash' : 'pro'}`}>
            {isFlash ? 'Flash' : 'Pro'}
          </span>
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
            className="agent-action-btn chat"
            onClick={onChat}
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

        <button 
          className="agent-delete-btn"
          onClick={handleDelete}
          title="Deletar Agente"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
