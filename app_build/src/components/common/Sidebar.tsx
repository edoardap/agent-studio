import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Home, Wrench, Bot, Settings, LogOut, Compass } from 'lucide-react';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView } = useApp();
  const [isAdvanced, setIsAdvanced] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {/* Header Logo */}
        <div className="sidebar-header">
          <Compass className="sidebar-header-icon" />
          <span>AGENTS STUDIO</span>
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
