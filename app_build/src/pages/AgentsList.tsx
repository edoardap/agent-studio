import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AgentCard } from '../components/dashboard/AgentCard';
import { IntegrationModal } from '../components/integrations/IntegrationModal';
import { Bot } from 'lucide-react';
import './AgentsList.css';

export const AgentsList: React.FC = () => {
  const { agents, selectedAgent, setSelectedAgent, setActiveView } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState('all');
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Filter agents based on search and model selection
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.spec.identity.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          agent.spec.identity.agent_profile.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModel = filterModel === 'all' || 
                         (filterModel === 'flash' && agent.model.toLowerCase().includes('flash')) ||
                         (filterModel === 'pro' && agent.model.toLowerCase().includes('pro'));
    
    return matchesSearch && matchesModel;
  });

  const handleChat = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setActiveView('chat-agent');
    }
  };

  const handleShare = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setIsShareOpen(true);
    }
  };

  return (
    <div className="agents-page fade-in">
      <div className="agents-page-header">
        <div className="agents-page-title-section">
          <h2>Seus Agentes Cognitivos</h2>
          <p>Gerencie, configure canais de comunicação ou converse diretamente com os seus agentes criados.</p>
        </div>

        <div className="agents-controls">
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Buscar agente..." 
              className="agents-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="agents-filter-select"
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
          >
            <option value="all">Todos os modelos</option>
            <option value="flash">Gemini 3.5 Flash</option>
            <option value="pro">Gemini 3.5 Pro</option>
          </select>
        </div>
      </div>

      {filteredAgents.length > 0 ? (
        <div className="agents-grid">
          {filteredAgents.map(agent => (
            <AgentCard 
              key={agent.id}
              agent={agent}
              onChat={() => handleChat(agent.id)}
              onShare={() => handleShare(agent.id)}
            />
          ))}
        </div>
      ) : (
        <div className="agents-empty-state">
          <Bot className="agents-empty-icon" />
          <div>
            <h3>Nenhum agente encontrado</h3>
            <p>Tente reajustar seus termos de busca ou crie um novo na Fábrica de Agentes.</p>
          </div>
        </div>
      )}

      {/* Integration Sharing Modal */}
      {isShareOpen && selectedAgent && (
        <IntegrationModal 
          agent={selectedAgent} 
          onClose={() => {
            setIsShareOpen(false);
            setSelectedAgent(null);
          }}
        />
      )}
    </div>
  );
};
