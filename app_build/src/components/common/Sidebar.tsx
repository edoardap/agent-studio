import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, Wrench, Bot, Settings, LogOut, Sparkles, Layers, Wrench as ToolsIcon, ShieldCheck, ScrollText } from 'lucide-react';
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

        {/* Menu Section */}
        <div className="sidebar-menu-section">
          <div className="sidebar-menu-title">Trabalhar</div>
          
          <button
            onClick={() => setActiveView('home')}
            className={`sidebar-menu-item ${activeView === 'home' ? 'active' : ''}`}
          >
            <Home className="sidebar-menu-icon" />
            <span>Início</span>
          </button>

          <button
            onClick={() => setActiveView('factory')}
            className={`sidebar-menu-item ${activeView === 'factory' ? 'active' : ''}`}
          >
            <Wrench className="sidebar-menu-icon" />
            <span>Fábrica de Agentes</span>
          </button>

          <button
            onClick={() => setActiveView('agents')}
            className={`sidebar-menu-item ${activeView === 'agents' ? 'active' : ''}`}
          >
            <Bot className="sidebar-menu-icon" />
            <span>Agentes Criados</span>
          </button>
        </div>

        {/* Advanced-only: Engine / Motor section */}
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
              <ToolsIcon className="sidebar-menu-icon" />
              <span>Catálogo de Tools</span>
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
