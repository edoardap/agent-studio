import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Filter, Plus } from 'lucide-react';
import './Marketplace.css';

export const Marketplace: React.FC = () => {
  const { squadTemplates, installSquadTemplate, setActiveView } = useApp();
  const [search, setSearch] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);

  const handleInstallSquad = (id: string) => {
    setInstalling(id);
    setTimeout(() => {
      installSquadTemplate(id);
      setInstalling(null);
      setActiveView('organograma');
    }, 800);
  };

  const filteredSquads = squadTemplates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.useCase.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="marketplace-page fade-in">
      {/* Header */}
      <div className="marketplace-header">
        <div className="marketplace-header-content">
          <h1>Marketplace de Agentes</h1>
          <p>Encontre agentes especializados e squads completas prontas para clonar.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="marketplace-toolbar">
        <div className="marketplace-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por caso de uso, nome, cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="marketplace-filter-btn">
          <Filter size={16} /> Filtros
        </button>
      </div>

      {/* Grid Content */}
      <div className="marketplace-grid">
        {filteredSquads.map(tpl => (
          <div key={tpl.id} className="squad-template-card">
            <div className="squad-template-header">
              <span className="squad-template-emoji">{tpl.emoji}</span>
              <div className="squad-template-title">
                <h3>{tpl.name}</h3>
                <span className="squad-template-usecase">{tpl.useCase}</span>
              </div>
            </div>
            <p className="squad-template-desc">{tpl.description}</p>
            
            <div className="squad-template-agents">
              <div className="squad-template-agents-title">Membros incluídos:</div>
              {tpl.agents.map((ag, i) => (
                <div key={i} className="squad-template-agent-item">
                  <span className="squad-template-agent-role">{ag.role}</span>
                  <span className="squad-template-agent-name">{ag.name}</span>
                </div>
              ))}
            </div>

            <div className="squad-template-tags">
              {tpl.tags.map(t => <span key={t} className="squad-template-tag">#{t}</span>)}
            </div>

            <button
              className={`squad-template-install-btn ${installing === tpl.id ? 'loading' : ''}`}
              onClick={() => handleInstallSquad(tpl.id)}
              disabled={installing !== null}
            >
              {installing === tpl.id ? 'Instalando...' : (
                <>
                  <Plus size={16} /> Instalar Squad
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {filteredSquads.length === 0 && (
        <div className="marketplace-empty">Nenhuma squad encontrada com esses termos.</div>
      )}

    </div>
  );
};
