import React, { useRef, useEffect, useState } from 'react';
import { useApp, deriveChannel, DEFAULT_INTEGRATIONS } from '../context/AppContext';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { StepProgress } from '../components/dashboard/StepProgress';
import { Layers, Trash2, Code, Plus, Eye, X, Zap, AlertCircle, ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react';
import {
  compilePromptSkeleton,
  PREVIEW_RUNTIME_VALUES,
  getMissingLayers,
  getCompletionPercent,
  getLayerStatuses,
} from '../utils/promptCompiler';
import { dataStudioKnowledgeBases } from '../data/knowledgeBaseCatalog';
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
    resetCreatorChat,
    creatorMasterTemplateKey,
    selectCreatorTemplate,
    masterTemplates,
    setActiveView,
    isAdvanced,
    setIsAdvanced,
    editingAgentId,
    agents,
  } = useApp();

  const selectedTemplate = masterTemplates.find(t => t.name === creatorMasterTemplateKey);
  const editingAgent = editingAgentId ? agents.find(a => a.id === editingAgentId) : null;
  const isEditing = !!editingAgent;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newTool, setNewTool] = useState('');
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  
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

  // Associa/desassocia uma base de conhecimento do catálogo do data-studio.
  const toggleKnowledgeBase = (kb: { id: string; name: string }) => {
    const current = creatorSpec.action.knowledge_bases;
    const exists = current.some(k => k.id === kb.id);
    const updated = exists
      ? current.filter(k => k.id !== kb.id)
      : [...current, { id: kb.id, name: kb.name }];
    updateSpecField('action', 'knowledge_bases', updated);
  };

  const isFieldUpdated = (layer: string, field: string) => {
    return !!activeHighlights[`${layer}.${field}`];
  };

  // Render form fields depending on the active step (stepper index)
  const renderActiveStepForm = () => {
    // Passo "Config" (índice -1): atributos do agente, NÃO é uma camada da spec.
    if (creatorStep === -1) {
      return (
        <div className="spec-form-section fade-in">
          <span className="spec-form-section-title">⚙️ Configuração do Agente</span>
          <p className="agent-config-hint">
            Atributos do agente (template e canal) — não é uma das 7 camadas da spec.
          </p>

          <div className="form-group">
            <label className="form-label">🏗️ Template Master</label>
            <select
              className="form-input form-select"
              value={creatorMasterTemplateKey}
              onChange={(e) => selectCreatorTemplate(e.target.value)}
              disabled={!isAdvanced}
            >
              {masterTemplates.map(t => (
                <option key={t.key} value={t.name}>{t.icon} {t.name}</option>
              ))}
            </select>

            {selectedTemplate && (
              <div className="template-hint-card">
                <p className="template-hint-desc">{selectedTemplate.description}</p>
                <button
                  type="button"
                  className="template-hint-toggle"
                  onClick={() => setShowSkeleton((s) => !s)}
                >
                  {showSkeleton ? 'Ocultar esqueleto do prompt' : 'Ver esqueleto do prompt'}
                </button>
                {showSkeleton && (
                  <pre className="template-hint-skeleton">{selectedTemplate.promptSkeleton}</pre>
                )}
              </div>
            )}

            {isAdvanced && (
              <button
                type="button"
                className="template-create-link"
                onClick={() => { setIsAdvanced(true); setActiveView('templates'); }}
              >
                + Criar ou editar templates em Templates Master
              </button>
            )}
          </div>
        </div>
      );
    }

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

            {/* Bases de Conhecimento (do data-studio) — referência estruturada */}
            <div className="form-group">
              <div className="field-label-container">
                <label className="form-label">📚 Bases de Conhecimento</label>
                <span className="factory-badge">data-studio</span>
              </div>
              <p className="kb-picker-hint">
                Associe bases publicadas no data-studio que o agente poderá consultar.
              </p>
              <div className={`kb-picker-list ${isFieldUpdated('action', 'knowledge_bases') ? 'updated-glow' : ''}`}>
                {dataStudioKnowledgeBases.map((kb) => {
                  const checked = creatorSpec.action.knowledge_bases.some(k => k.id === kb.id);
                  return (
                    <label key={kb.id} className={`kb-picker-item ${checked ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleKnowledgeBase(kb)}
                      />
                      <span className="kb-picker-info">
                        <span className="kb-picker-name">{kb.name}</span>
                        <span className="kb-picker-meta">{kb.domain} • {kb.documentCount} docs</span>
                      </span>
                    </label>
                  );
                })}
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

  // Progresso = completude REAL da spec (camadas preenchidas), não a aba atual.
  const missingLayers = getMissingLayers(creatorSpec);
  const progress = getCompletionPercent(creatorSpec);
  // Status da camada atualmente aberta (para o botão "Continuar"). Os passos
  // de formulário são 0–6; o passo 7 é a revisão de JSON (sem camada própria).
  const layerStatuses = getLayerStatuses(creatorSpec);
  const isConfigStep = creatorStep === -1;
  const isLayerStep = creatorStep >= 0 && creatorStep <= 6;
  // "Form step" = qualquer passo com formulário (config + 7 camadas), exceto a revisão JSON (7).
  const isFormStep = isConfigStep || isLayerStep;
  // Config não tem completude (não é camada) → sempre "ok" para o botão Continuar.
  const currentLayerComplete = isLayerStep ? layerStatuses[creatorStep].complete : true;
  // Só permite finalizar quando todas as 7 camadas estão completas.
  // (A navegação entre camadas continua livre — só o "Construir" é bloqueado.)
  const canBuild = missingLayers.length === 0;

  // ── Pré-visualização do prompt compilado na Fábrica (lacuna #7) ──
  // Usa o esqueleto do template selecionado + a spec atual. Os blocos de
  // runtime aparecem como placeholders ("injetado em tempo de execução"),
  // pois aqui ainda não existe uma conversa.
  const previewSkeleton = compilePromptSkeleton(
    selectedTemplate?.promptSkeleton ?? '(template master não selecionado)',
    creatorSpec,
    PREVIEW_RUNTIME_VALUES,
  );

  // Canal é derivado das integrações. Em edição, mostra o do agente; em criação,
  // o padrão de um novo agente (Web).
  const previewChannel = isEditing ? editingAgent!.channel : deriveChannel(DEFAULT_INTEGRATIONS);

  const previewPromptText = `[AGENT_SYSTEM — Pré-visualização do Prompt Compilado]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Template Master : ${creatorMasterTemplateKey}
Canal           : ${previewChannel}
Completude      : ${progress}%${missingLayers.length ? `  (faltam: ${missingLayers.join(', ')})` : '  ✓ pronto'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${previewSkeleton}`;

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

        {/* Editing banner: shown when loading an existing agent's spec */}
        {isEditing && (
          <div className="spec-editing-banner">
            <Pencil size={13} />
            <span>
              Editando a spec de <strong>{editingAgent!.spec.identity.agent_name}</strong>.
              As alterações substituem o agente existente.
            </span>
            <button
              type="button"
              className="spec-editing-cancel"
              onClick={resetCreatorChat}
              title="Descartar a edição e voltar a criar um novo agente"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Stepper Tabs (inclui o passo "Config", anterior à Identidade) */}
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

        {/* Layer navigation: Voltar / Continuar (navegação linear, opcional —
            os tabs do stepper continuam permitindo pular livremente) */}
        {isFormStep && (
          <div className="spec-step-nav">
            {creatorStep > -1 ? (
              <button
                className="spec-step-back-btn"
                onClick={() => setCreatorStep(creatorStep - 1)}
                type="button"
              >
                <ArrowLeft size={14} />
                <span>Voltar</span>
              </button>
            ) : (
              <span className="spec-step-nav-spacer" />
            )}

            {creatorStep < 6 ? (
              <button
                className={`spec-step-next-btn ${currentLayerComplete ? '' : 'pending'}`}
                onClick={() => setCreatorStep(creatorStep + 1)}
                title={isConfigStep ? 'Ir para a Identidade' : (currentLayerComplete ? 'Ir para a próxima camada' : 'Você pode continuar mesmo sem preencher esta camada')}
                type="button"
              >
                {isLayerStep && currentLayerComplete && <Check size={14} />}
                <span>Continuar</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                className={`spec-step-next-btn ${currentLayerComplete ? '' : 'pending'}`}
                onClick={() => setCreatorStep(7)}
                type="button"
              >
                {currentLayerComplete && <Check size={14} />}
                <span>Revisar JSON</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* Secondary toolbar: preview prompt + view JSON */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px' }}>
          <button
            onClick={() => setShowPromptModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600 }}
            type="button"
          >
            <Eye size={12} />
            <span>Pré-visualizar prompt</span>
          </button>

          {creatorStep < 7 ? (
            <button
              onClick={() => setCreatorStep(7)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600 }}
              type="button"
            >
              <Code size={12} />
              <span>Ver JSON Completo</span>
            </button>
          ) : (
            <button
              onClick={() => setCreatorStep(-1)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600 }}
              type="button"
            >
              <span>Voltar aos Formulários</span>
            </button>
          )}
        </div>

        {/* Completeness hint: what's still missing before building */}
        {missingLayers.length > 0 && (
          <div className="spec-missing-hint">
            <AlertCircle size={13} />
            <span>
              Faltam {missingLayers.length} de 7 camadas para construir:{' '}
              {missingLayers.map((layer, i) => (
                <React.Fragment key={layer}>
                  <strong>{layer}</strong>{i < missingLayers.length - 1 ? ', ' : ''}
                </React.Fragment>
              ))}
            </span>
          </div>
        )}

        {/* Action Panel Buttons */}
        <div className="spec-actions">
          <button
            className="spec-build-btn"
            disabled={!canBuild}
            onClick={createAgentFromSpec}
            title={
              canBuild
                ? (isEditing ? 'Salvar as alterações no agente' : 'Construir o agente a partir da spec')
                : `Preencha as camadas faltantes: ${missingLayers.join(', ')}`
            }
            type="button"
          >
            {isEditing
              ? (canBuild ? 'Salvar Alterações' : `Salvar Alterações (${progress}%)`)
              : (canBuild ? 'Construir Agente' : `Construir Agente (${progress}%)`)}
          </button>

          <button
            className="spec-reset-btn"
            onClick={resetCreatorChat}
            type="button"
          >
            {isEditing ? 'Cancelar Edição' : 'Reiniciar Especificações'}
          </button>
        </div>
      </div>

      {/* ── Prompt Preview Modal (lacuna #7) ── */}
      {showPromptModal && (
        <div className="prompt-modal-overlay" onClick={() => setShowPromptModal(false)}>
          <div className="prompt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prompt-modal-header">
              <div className="prompt-modal-title">
                <Zap size={16} />
                <span>Pré-visualização do Prompt — Template + Spec atual</span>
              </div>
              <button className="prompt-modal-close" onClick={() => setShowPromptModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="prompt-modal-body">
              <div className="prompt-modal-meta">
                <span className="prompt-meta-chip">Template: <strong>{creatorMasterTemplateKey}</strong></span>
                <span className="prompt-meta-chip">Canal: <strong>{previewChannel}</strong></span>
                <span className="prompt-meta-chip">Completude: <strong>{progress}%</strong></span>
              </div>
              <pre className="prompt-terminal">{previewPromptText}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
