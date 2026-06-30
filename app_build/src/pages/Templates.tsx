import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Layers, Plus, Save } from 'lucide-react';
import './Templates.css';

// Placeholders that the "Spec to Agent" compiler resolves at build/runtime.
const PLACEHOLDER_LEGEND = [
  { token: '{{identity.agent_name}}', desc: 'Nome do agente (spec)' },
  { token: '{{context.company_name}}', desc: 'Empresa (spec)' },
  { token: '{{behavior.behaviour_rules}}', desc: 'Regras de tom (spec)' },
  { token: '{{security.security_rules}}', desc: 'Regras de segurança (spec)' },
  { token: '{{planning.roteiro}}', desc: 'Roteiro lógico (spec)' },
  { token: '{{action.tools}}', desc: 'Ferramentas declaradas (spec)' },
  { token: '{{response.output_rules}}', desc: 'Formato de saída (spec)' },
  { token: '{{state_json}}', desc: 'Estado vivo da conversa (runtime)' },
  { token: '{{summary_text}}', desc: 'Resumo da conversa (runtime)' },
  { token: '{{recent_messages}}', desc: 'Janela recente de mensagens (runtime)' },
  { token: '{{user_message}}', desc: 'Mensagem atual do usuário (runtime)' },
];

export const Templates: React.FC = () => {
  const { masterTemplates, updateMasterTemplate, addMasterTemplate } = useApp();
  const [selectedKey, setSelectedKey] = useState<string>(masterTemplates[0]?.key ?? '');
  const [justSaved, setJustSaved] = useState(false);

  const selected = masterTemplates.find(t => t.key === selectedKey) ?? masterTemplates[0];

  const handleCreate = () => {
    const key = `custom_${Date.now()}`;
    addMasterTemplate({
      key,
      name: 'Novo Template Master',
      icon: '🧩',
      description: 'Descreva o propósito deste esqueleto base.',
      promptSkeleton: `# AGENT_SYSTEM — Template Master
Você é {{identity.agent_name}}, da {{context.company_name}}.
Objetivo: {{identity.agent_goal}}

## Comportamento
{{behavior.behaviour_rules}}

## Ferramentas
{{action.tools}}

---
[RUNTIME]
Estado: {{state_json}}
Resumo: {{summary_text}}
Histórico recente: {{recent_messages}}
Mensagem atual: {{user_message}}`,
    });
    setSelectedKey(key);
  };

  const patch = (field: 'name' | 'description' | 'promptSkeleton', value: string) => {
    if (!selected) return;
    updateMasterTemplate(selected.key, { [field]: value });
    setJustSaved(false);
  };

  const handleSave = () => {
    // No backend — the edit is already persisted in context state on change.
    // This button gives the curator explicit "saved" feedback (mock).
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  if (!selected) return null;

  return (
    <div className="templates-page fade-in">
      {/* Left: template list */}
      <div className="templates-list-panel">
        <div className="templates-list-header">
          <div className="templates-list-title">
            <Layers size={16} />
            <span>Templates Master</span>
          </div>
          <button className="templates-new-btn" onClick={handleCreate} type="button">
            <Plus size={14} />
            <span>Novo</span>
          </button>
        </div>

        <p className="templates-list-hint">
          O esqueleto fixo do prompt, comum a uma família de agentes. A spec preenche as lacunas
          <code> {'{{...}}'} </code> em tempo de compilação.
        </p>

        <div className="templates-cards">
          {masterTemplates.map(t => (
            <button
              key={t.key}
              className={`template-card ${t.key === selected.key ? 'active' : ''}`}
              onClick={() => setSelectedKey(t.key)}
              type="button"
            >
              <span className="template-card-icon">{t.icon}</span>
              <div className="template-card-info">
                <span className="template-card-name">{t.name}</span>
                <span className="template-card-desc">{t.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: editor */}
      <div className="templates-editor-panel">
        <div className="templates-editor-head">
          <input
            className="template-name-input"
            value={selected.name}
            onChange={e => patch('name', e.target.value)}
          />
          <button className="templates-save-btn" onClick={handleSave} type="button">
            <Save size={14} />
            <span>{justSaved ? 'Salvo!' : 'Salvar Template'}</span>
          </button>
        </div>

        <input
          className="template-desc-input"
          value={selected.description}
          onChange={e => patch('description', e.target.value)}
          placeholder="Descrição do template"
        />

        <div className="template-editor-grid">
          <div className="template-skeleton-col">
            <label className="template-field-label">Esqueleto do Prompt (AGENT_SYSTEM)</label>
            <textarea
              className="template-skeleton-textarea"
              value={selected.promptSkeleton}
              onChange={e => patch('promptSkeleton', e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="template-legend-col">
            <label className="template-field-label">Placeholders disponíveis</label>
            <div className="template-legend-list">
              {PLACEHOLDER_LEGEND.map(p => (
                <div key={p.token} className="template-legend-item">
                  <code>{p.token}</code>
                  <span>{p.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
