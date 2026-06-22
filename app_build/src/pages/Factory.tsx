import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { StepProgress } from '../components/dashboard/StepProgress';
import { Layers, Trash2, Code, Plus } from 'lucide-react';
import './Factory.css';

export const Factory: React.FC = () => {
  const { 
    creatorConversation, 
    creatorSpec, 
    creatorStep,
    setCreatorStep,
    lastUpdatedFields,
    clearLastUpdatedFields,
    updateSpecField,
    sendMessageToCreator, 
    createAgentFromSpec, 
    resetCreatorChat 
  } = useApp();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newTool, setNewTool] = useState('');
  
  // Local state to manage active glowing highlight animations
  const [activeHighlights, setActiveHighlights] = useState<Record<string, boolean>>({});

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [creatorConversation.messages]);

  // Sync highlights when lastUpdatedFields changes in AppContext
  useEffect(() => {
    const layers = Object.keys(lastUpdatedFields);
    if (layers.length > 0) {
      const newHighlights: Record<string, boolean> = {};
      layers.forEach(layer => {
        const fields = lastUpdatedFields[layer];
        fields.forEach(field => {
          newHighlights[`${layer}.${field}`] = true;
        });
      });
      setActiveHighlights(newHighlights);

      // Set a temporary timeout to clear highlights after 3 seconds
      const timer = setTimeout(() => {
        setActiveHighlights({});
        clearLastUpdatedFields();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [lastUpdatedFields]);

  const handleAddTool = () => {
    if (newTool.trim()) {
      const updatedTools = [...creatorSpec.action.tools, newTool.trim()];
      updateSpecField('action', 'tools', updatedTools);
      setNewTool('');
    }
  };

  const handleRemoveTool = (index: number) => {
    const updatedTools = creatorSpec.action.tools.filter((_, i) => i !== index);
    updateSpecField('action', 'tools', updatedTools);
  };

  const isFieldUpdated = (layer: string, field: string) => {
    return !!activeHighlights[`${layer}.${field}`];
  };

  // Render form fields depending on the active step (stepper index)
  const renderActiveStepForm = () => {
    switch (creatorStep) {
      case 0:
        return (
          <div className="spec-form-section fade-in">
            <span className="spec-form-section-title">1. Identidade</span>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Nome do Agente</label>
                {isFieldUpdated('identity', 'agent_name') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="text"
                className={`form-input ${isFieldUpdated('identity', 'agent_name') ? 'updated-glow' : ''}`}
                value={creatorSpec.identity.agent_name}
                onChange={(e) => updateSpecField('identity', 'agent_name', e.target.value)}
                placeholder="Ex: Atena Knowledge Agent"
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Perfil / Persona</label>
                {isFieldUpdated('identity', 'agent_profile') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('identity', 'agent_profile') ? 'updated-glow' : ''}`}
                value={creatorSpec.identity.agent_profile}
                onChange={(e) => updateSpecField('identity', 'agent_profile', e.target.value)}
                placeholder="Ex: Agente amigável de RH..."
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Introdução de Boas-vindas</label>
                {isFieldUpdated('identity', 'agent_introduction') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('identity', 'agent_introduction') ? 'updated-glow' : ''}`}
                value={creatorSpec.identity.agent_introduction}
                onChange={(e) => updateSpecField('identity', 'agent_introduction', e.target.value)}
                placeholder="Ex: Olá, eu sou o Atena..."
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Objetivo Principal</label>
                {isFieldUpdated('identity', 'agent_goal') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('identity', 'agent_goal') ? 'updated-glow' : ''}`}
                value={creatorSpec.identity.agent_goal}
                onChange={(e) => updateSpecField('identity', 'agent_goal', e.target.value)}
                placeholder="Ex: Auxiliar novos programadores..."
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="spec-form-section fade-in">
            <span className="spec-form-section-title">2. Comportamento</span>
            <div className="form-group-row">
              <div className="field-label-container">
                <label className="form-label">Limite de Caracteres</label>
                {isFieldUpdated('behavior', 'max_chars') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="number"
                className={`form-input ${isFieldUpdated('behavior', 'max_chars') ? 'updated-glow' : ''}`}
                style={{ width: '100px' }}
                value={creatorSpec.behavior.max_chars}
                onChange={(e) => updateSpecField('behavior', 'max_chars', parseInt(e.target.value))}
              />
            </div>
            <div className="form-group-row">
              <div className="field-label-container">
                <label className="form-label">Max Perguntas por Mensagem</label>
                {isFieldUpdated('behavior', 'max_questions_per_message') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="number"
                className={`form-input ${isFieldUpdated('behavior', 'max_questions_per_message') ? 'updated-glow' : ''}`}
                style={{ width: '100px' }}
                value={creatorSpec.behavior.max_questions_per_message}
                onChange={(e) => updateSpecField('behavior', 'max_questions_per_message', parseInt(e.target.value))}
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Idioma Padrão</label>
                {isFieldUpdated('behavior', 'language') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="text"
                className={`form-input ${isFieldUpdated('behavior', 'language') ? 'updated-glow' : ''}`}
                value={creatorSpec.behavior.language}
                onChange={(e) => updateSpecField('behavior', 'language', e.target.value)}
              />
            </div>
            <div className="form-group-row">
              <div className="field-label-container">
                <label className="form-label">Permitir Emojis</label>
                {isFieldUpdated('behavior', 'allowed_emojis') && <span className="updated-badge">Atualizado</span>}
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={creatorSpec.behavior.allowed_emojis}
                  onChange={(e) => updateSpecField('behavior', 'allowed_emojis', e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Regras de Comportamento</label>
                {isFieldUpdated('behavior', 'behaviour_rules') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('behavior', 'behaviour_rules') ? 'updated-glow' : ''}`}
                value={creatorSpec.behavior.behaviour_rules}
                onChange={(e) => updateSpecField('behavior', 'behaviour_rules', e.target.value)}
                placeholder="Ex: Nunca dê respostas vagas; Seja conciso..."
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="spec-form-section fade-in">
            <span className="spec-form-section-title">3. Segurança</span>
            <div className="form-group-row">
              <div className="field-label-container">
                <label className="form-label">Bloquear Resposta Final Direta</label>
                {isFieldUpdated('security', 'forbid_final_answer') && <span className="updated-badge">Atualizado</span>}
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={creatorSpec.security.forbid_final_answer}
                  onChange={(e) => updateSpecField('security', 'forbid_final_answer', e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
            <div className="form-group-row">
              <div className="field-label-container">
                <label className="form-label">Anti-Prompt Injection</label>
                {isFieldUpdated('security', 'anti_prompt_injection') && <span className="updated-badge">Atualizado</span>}
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={creatorSpec.security.anti_prompt_injection}
                  onChange={(e) => updateSpecField('security', 'anti_prompt_injection', e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Regras de Segurança</label>
                {isFieldUpdated('security', 'security_rules') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('security', 'security_rules') ? 'updated-glow' : ''}`}
                value={creatorSpec.security.security_rules}
                onChange={(e) => updateSpecField('security', 'security_rules', e.target.value)}
                placeholder="Ex: Não divulgue segredos internos..."
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Mensagem Padrão de Bloqueio</label>
                {isFieldUpdated('security', 'jailbreak_response') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('security', 'jailbreak_response') ? 'updated-glow' : ''}`}
                value={creatorSpec.security.jailbreak_response}
                onChange={(e) => updateSpecField('security', 'jailbreak_response', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="spec-form-section fade-in">
            <span className="spec-form-section-title">4. Contexto</span>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Nome da Empresa</label>
                {isFieldUpdated('context', 'company_name') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="text"
                className={`form-input ${isFieldUpdated('context', 'company_name') ? 'updated-glow' : ''}`}
                value={creatorSpec.context.company_name}
                onChange={(e) => updateSpecField('context', 'company_name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Segmento de Atuação</label>
                {isFieldUpdated('context', 'segment') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="text"
                className={`form-input ${isFieldUpdated('context', 'segment') ? 'updated-glow' : ''}`}
                value={creatorSpec.context.segment}
                onChange={(e) => updateSpecField('context', 'segment', e.target.value)}
                placeholder="Ex: Recursos Humanos, TI"
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Horário de Funcionamento</label>
                {isFieldUpdated('context', 'opening_hours') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="text"
                className={`form-input ${isFieldUpdated('context', 'opening_hours') ? 'updated-glow' : ''}`}
                value={creatorSpec.context.opening_hours}
                onChange={(e) => updateSpecField('context', 'opening_hours', e.target.value)}
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Defaults Gerais do Usuário</label>
                {isFieldUpdated('context', 'user_general_defaults') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="text"
                className={`form-input ${isFieldUpdated('context', 'user_general_defaults') ? 'updated-glow' : ''}`}
                value={creatorSpec.context.user_general_defaults}
                onChange={(e) => updateSpecField('context', 'user_general_defaults', e.target.value)}
                placeholder="Ex: Colaboradores da empresa"
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Informações de Integrações CRM</label>
                {isFieldUpdated('context', 'crm_information') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('context', 'crm_information') ? 'updated-glow' : ''}`}
                value={creatorSpec.context.crm_information}
                onChange={(e) => updateSpecField('context', 'crm_information', e.target.value)}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="spec-form-section fade-in">
            <span className="spec-form-section-title">5. Planejamento (Planning)</span>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Roteiro Lógico (Script)</label>
                {isFieldUpdated('planning', 'roteiro') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('planning', 'roteiro') ? 'updated-glow' : ''}`}
                value={creatorSpec.planning.roteiro}
                onChange={(e) => updateSpecField('planning', 'roteiro', e.target.value)}
                placeholder="Ex: Mapear issue -> Categorizar -> Redigir..."
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Regras de Decisão</label>
                {isFieldUpdated('planning', 'decision_rules') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('planning', 'decision_rules') ? 'updated-glow' : ''}`}
                value={creatorSpec.planning.decision_rules}
                onChange={(e) => updateSpecField('planning', 'decision_rules', e.target.value)}
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Objetivo/Meta Inicial</label>
                {isFieldUpdated('planning', 'default_current_goal') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="text"
                className={`form-input ${isFieldUpdated('planning', 'default_current_goal') ? 'updated-glow' : ''}`}
                value={creatorSpec.planning.default_current_goal}
                onChange={(e) => updateSpecField('planning', 'default_current_goal', e.target.value)}
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Estágio Inicial do Agente</label>
                {isFieldUpdated('planning', 'default_agent_stage') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="text"
                className={`form-input ${isFieldUpdated('planning', 'default_agent_stage') ? 'updated-glow' : ''}`}
                value={creatorSpec.planning.default_agent_stage}
                onChange={(e) => updateSpecField('planning', 'default_agent_stage', e.target.value)}
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Próxima Ação Padrão</label>
                {isFieldUpdated('planning', 'default_next_action') && <span className="updated-badge">Atualizado</span>}
              </div>
              <input
                type="text"
                className={`form-input ${isFieldUpdated('planning', 'default_next_action') ? 'updated-glow' : ''}`}
                value={creatorSpec.planning.default_next_action}
                onChange={(e) => updateSpecField('planning', 'default_next_action', e.target.value)}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="spec-form-section fade-in">
            <span className="spec-form-section-title">6. Ação (Action)</span>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Informações Gerais de Ação</label>
                {isFieldUpdated('action', 'action_general_infos') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('action', 'action_general_infos') ? 'updated-glow' : ''}`}
                value={creatorSpec.action.action_general_infos}
                onChange={(e) => updateSpecField('action', 'action_general_infos', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Ferramentas (Tools)</label>
                {isFieldUpdated('action', 'tools') && <span className="updated-badge">Atualizado</span>}
              </div>
              <div className={`tools-adder-container ${isFieldUpdated('action', 'tools') ? 'updated-glow' : ''}`} style={{ borderRadius: 'var(--radius-md)' }}>
                <input
                  type="text"
                  className="form-input"
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  placeholder="Ex: GitLab API client_v2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTool();
                    }
                  }}
                />
                <button 
                  className="tools-adder-btn"
                  onClick={handleAddTool}
                  type="button"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="tools-tags-list">
                {creatorSpec.action.tools.map((tool, idx) => (
                  <span key={idx} className="tool-tag">
                    <span>{tool}</span>
                    <button 
                      className="tool-tag-remove"
                      onClick={() => handleRemoveTool(idx)}
                      type="button"
                    >
                      <Trash2 size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="spec-form-section fade-in">
            <span className="spec-form-section-title">7. Resposta (Response)</span>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Tarefa Principal de Resposta</label>
                {isFieldUpdated('response', 'task') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('response', 'task') ? 'updated-glow' : ''}`}
                value={creatorSpec.response.task}
                onChange={(e) => updateSpecField('response', 'task', e.target.value)}
              />
            </div>
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">Regras de Formato (Output Rules)</label>
                {isFieldUpdated('response', 'output_rules') && <span className="updated-badge">Atualizado</span>}
              </div>
              <textarea
                className={`form-textarea ${isFieldUpdated('response', 'output_rules') ? 'updated-glow' : ''}`}
                value={creatorSpec.response.output_rules}
                onChange={(e) => updateSpecField('response', 'output_rules', e.target.value)}
                placeholder="Ex: Formate com Markdown estruturado..."
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="spec-form-section fade-in" style={{ backgroundColor: '#1e1e2f', color: '#a9b2c3', border: 'none' }}>
            <span className="spec-form-section-title" style={{ color: '#fff', borderColor: '#2e2e3f' }}>Revisão de JSON</span>
            <pre style={{ fontSize: '0.75rem', overflowX: 'auto', maxHeight: '320px', fontFamily: 'monospace' }}>
              {JSON.stringify(creatorSpec, null, 2)}
            </pre>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = Math.min(100, Math.round((Math.max(0, creatorStep) / 7) * 100));
  const canBuild = !!creatorSpec.identity.agent_name;

  return (
    <div className="factory-page fade-in">
      {/* Central Chat Interface */}
      <div className="factory-chat-container">
        <div className="factory-chat-messages">
          {creatorConversation.messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <ChatInput 
          onSend={sendMessageToCreator} 
          placeholder="Descreva sua ideia para o copiloto..."
        />
      </div>

      {/* Right Specification Status Panel */}
      <div className="factory-spec-panel">
        <div className="spec-panel-title">
          <Layers size={18} />
          <span>Configuração por Camadas</span>
        </div>

        {/* Stepper Tabs */}
        <StepProgress />

        {/* Completion Progress Bar */}
        <div className="spec-progress-section" style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '4px 0' }}>
          <div className="spec-progress-label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <span>Progresso Geral</span>
            <span>{progress}%</span>
          </div>
          <div className="spec-progress-bar-bg" style={{ height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
            <div 
              className="spec-progress-bar-fg" 
              style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--success-color)', borderRadius: '3px', transition: 'width 0.3s ease' }}
            ></div>
          </div>
        </div>

        {/* Stepper active form view */}
        <div className="spec-form">
          {renderActiveStepForm()}
        </div>

        {/* Review JSON Spec Tab Trigger */}
        {creatorStep < 7 && (
          <button 
            onClick={() => setCreatorStep(7)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--primary-color)', alignSelf: 'flex-end', fontWeight: 600 }}
            type="button"
          >
            <Code size={12} />
            <span>Ver JSON Completo</span>
          </button>
        )}

        {creatorStep === 7 && (
          <button 
            onClick={() => setCreatorStep(0)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--primary-color)', alignSelf: 'flex-end', fontWeight: 600 }}
            type="button"
          >
            <span>Voltar aos Formulários</span>
          </button>
        )}

        {/* Action Panel Buttons */}
        <div className="spec-actions">
          <button 
            className="spec-build-btn"
            disabled={!canBuild}
            onClick={createAgentFromSpec}
            type="button"
          >
            Construir Agente
          </button>
          
          <button 
            className="spec-reset-btn"
            onClick={resetCreatorChat}
            type="button"
          >
            Reiniciar Especificações
          </button>
        </div>
      </div>
    </div>
  );
};
