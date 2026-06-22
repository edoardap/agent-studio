import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronDown, Search, Bell, Sparkles, Building, Globe } from 'lucide-react';
import './TenantSelector.css';

export const TenantSelector: React.FC = () => {
  const { 
    activeView, 
    tenants, 
    activeTenant, 
    setActiveTenant 
  } = useApp();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbTitle = () => {
    switch (activeView) {
      case 'home':
        return 'Início';
      case 'factory':
        return 'Fábrica de Agentes';
      case 'agents':
        return 'Agentes Criados';
      case 'chat-agent':
        return 'Conversar com Agente';
      default:
        return 'Início';
    }
  };

  return (
    <header className="top-header">
      <div className="header-left">
        {/* Breadcrumb path */}
        <div className="page-title-breadcrumb">
          <span>App</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-active">{getBreadcrumbTitle()}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Global Search */}
        <div className="global-search-container">
          <Search className="global-search-icon" />
          <input 
            type="text" 
            placeholder="Buscar bases, documentos, perguntas..." 
            className="global-search-input"
          />
          <span className="global-search-shortcut">⌘K</span>
        </div>

        {/* Tenant selector */}
        <div className="tenant-selector-wrapper" ref={dropdownRef}>
          <button 
            className="tenant-selector-btn"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Building className="tenant-icon" />
            <span>{activeTenant.name}</span>
            <ChevronDown size={14} />
          </button>
          
          {isOpen && (
            <div className="tenant-dropdown">
              {tenants.map(tenant => (
                <button
                  key={tenant.id}
                  className={`tenant-dropdown-item ${activeTenant.id === tenant.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTenant(tenant);
                    setIsOpen(false);
                  }}
                >
                  {tenant.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="header-actions">
          <button className="header-action-btn" title="Idiomas/Global">
            <Globe size={18} />
          </button>
          <button className="header-action-btn" title="Notificações">
            <Bell size={18} />
            <span className="notification-badge"></span>
          </button>
          <button className="header-action-btn" title="IA Studio">
            <Sparkles size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
