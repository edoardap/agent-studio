import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, Bot, Settings, LogOut, Sparkles, Layers, ShieldCheck, ScrollText, Cpu, Map, Store, Zap } from 'lucide-react';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, isAdvanced, setIsAdvanced } = useApp();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {/* Header Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo-container">
            <Sparkles className="sidebar-logo-icon" strokeWidth={2.5} />
          </div>
          <span className="sidebar-title">
            Agents<span className="sidebar-header-studio"> Studio</span>
          </span>
        </div>

        {/* Toggle Mode */}
        <div className="sidebar-toggle-container">
          <button
            className={`sidebar-toggle-btn ${!isAdvanced ? 'active' : ''}`}
            onClick={() => setIsAdvanced(false)}
          >
            Simples
          </button>
          <button
            className={`sidebar-toggle-btn ${isAdvanced ? 'active' : ''}`}
            onClick={() => setIsAdvanced(true)}
          >
            Avançado
          </button>
        </div>

        {/* Main Menu */}
        <div className="sidebar-menu-section">
          <div className="sidebar-menu-title">Trabalhar</div>

          <button
            onClick={() => setActiveView('home')}
            className={`sidebar-menu-item ${activeView === 'home' ? 'active' : ''}`}
          >
            <Home className="sidebar-menu-icon" />
            <span>Planejador</span>
          </button>

          <button
            onClick={() => setActiveView('marketplace')}
            className={`sidebar-menu-item ${activeView === 'marketplace' ? 'active' : ''}`}
          >
            <Store className="sidebar-menu-icon" />
            <span>Marketplace</span>
          </button>

          <button
            onClick={() => setActiveView('organograma')}
            className={`sidebar-menu-item ${activeView === 'organograma' ? 'active' : ''}`}
          >
            <Map className="sidebar-menu-icon" />
            <span>Organograma</span>
          </button>

          <button
            onClick={() => setActiveView('simulator')}
            className={`sidebar-menu-item ${activeView === 'simulator' ? 'active' : ''}`}
          >
            <Zap className="sidebar-menu-icon" />
            <span>Simulador</span>
          </button>

          <button
            onClick={() => setActiveView('agents')}
            className={`sidebar-menu-item ${activeView === 'agents' ? 'active' : ''}`}
          >
            <Bot className="sidebar-menu-icon" />
            <span>Agentes</span>
          </button>

          <button
            onClick={() => setActiveView('integrations')}
            className={`sidebar-menu-item ${activeView === 'integrations' ? 'active' : ''}`}
          >
            <Cpu className="sidebar-menu-icon" />
            <span>Integrações</span>
          </button>
        </div>

        {/* Advanced-only section */}
        {isAdvanced && (
          <div className="sidebar-menu-section">
            <div className="sidebar-menu-title">Motor (Avançado)</div>

            <button
              onClick={() => setActiveView('templates')}
              className={`sidebar-menu-item ${activeView === 'templates' ? 'active' : ''}`}
            >
              <Layers className="sidebar-menu-icon" />
              <span>Templates Master</span>
            </button>

            <button className="sidebar-menu-item" title="Em breve" disabled>
              <ShieldCheck className="sidebar-menu-icon" />
              <span>Governança</span>
            </button>

            <button className="sidebar-menu-item" title="Em breve" disabled>
              <ScrollText className="sidebar-menu-icon" />
              <span>Auditoria & Logs</span>
            </button>
          </div>
        )}

        {/* Publicar Section */}
        <div className="sidebar-menu-section">
          <div className="sidebar-menu-title">Publicar</div>
          <button className="sidebar-menu-item">
            <Settings className="sidebar-menu-icon" />
            <span>Publicação</span>
          </button>
        </div>
      </div>

      {/* Footer Profile */}
      <div className="sidebar-footer">
        <div className="sidebar-profile">
          <div className="sidebar-avatar">MC</div>
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">Marina Costa</span>
            <span className="sidebar-profile-role">Curadora - ACME</span>
          </div>
        </div>
        <button className="sidebar-logout-btn" title="Sair">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
