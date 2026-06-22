import React from 'react';
import { useApp } from '../context/AppContext';
import { Bot, Wrench, Cpu, Activity } from 'lucide-react';
import './Home.css';

export const Home: React.FC = () => {
  const { agents, setActiveView } = useApp();

  const totalIntegrations = agents.reduce((acc, curr) => {
    let count = 0;
    if (curr.integrations.discord) count++;
    if (curr.integrations.telegram) count++;
    if (curr.integrations.slack) count++;
    if (curr.integrations.whatsapp) count++;
    if (curr.integrations.webWidget) count++;
    return acc + count;
  }, 0);

  return (
    <div className="home-page fade-in">
      <div className="home-welcome">
        <h2>Bem-vindo ao Agent Factory Studio</h2>
        <p>Monitore, configure e distribua agentes cognitivos inteligentes para o seu workspace.</p>
      </div>

      {/* Grid of indicators */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Bot size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{agents.length}</span>
            <span className="stat-label">Agentes Ativos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Cpu size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalIntegrations}</span>
            <span className="stat-label">Integrações Ativas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">99.8%</span>
            <span className="stat-label">Uptime Operacional</span>
          </div>
        </div>
      </div>

      {/* Dashboard Sections */}
      <div className="dashboard-sections">
        {/* Left Side: Recent activities */}
        <div className="dashboard-panel">
          <h3 className="panel-title">Atividades Recentes</h3>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-marker"></div>
              <div className="activity-details">
                <span className="activity-text">Agente <strong>Atena Knowledge Agent</strong> publicou um novo MR de documentação técnica.</span>
                <span className="activity-time">Hoje às 11:22</span>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-marker"></div>
              <div className="activity-details">
                <span className="activity-text">Integração do canal <strong>Discord Bot</strong> ativada para o agente <strong>Atena Knowledge Agent</strong>.</span>
                <span className="activity-time">Ontem às 18:40</span>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-marker"></div>
              <div className="activity-details">
                <span className="activity-text">Agente <strong>Assistente de Onboarding</strong> criado na Fábrica.</span>
                <span className="activity-time">20 Jun 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Quick actions */}
        <div className="dashboard-panel">
          <h3 className="panel-title">Ações Rápidas</h3>
          <div className="quick-start-grid">
            <button 
              className="quick-start-card"
              onClick={() => setActiveView('factory')}
            >
              <div className="quick-start-icon-wrapper">
                <Wrench size={18} />
              </div>
              <div>
                <div className="quick-start-title">Ir para a Fábrica</div>
                <div className="quick-start-desc">Conversar com o Agente Criador e criar um novo agente.</div>
              </div>
            </button>

            <button 
              className="quick-start-card"
              onClick={() => setActiveView('agents')}
            >
              <div className="quick-start-icon-wrapper">
                <Bot size={18} />
              </div>
              <div>
                <div className="quick-start-title">Ver Agentes Criados</div>
                <div className="quick-start-desc">Conversar com agentes ou disponibilizá-los.</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
