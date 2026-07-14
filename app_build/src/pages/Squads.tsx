import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Squad, SquadMember, SquadMemberRole, AssignmentRule } from '../types';
import {
  Users, Plus, Trash2, X, ChevronRight, GitBranch,
  Crown, Zap, Shield, BookOpen, Wrench, UserCheck
} from 'lucide-react';
import './Squads.css';

const ROLE_LABELS: Record<SquadMemberRole, { label: string; icon: React.ReactNode; color: string }> = {
  orchestrator: { label: 'Orquestrador', icon: <Crown size={12} />, color: '#f59e0b' },
  triagem:      { label: 'Triagem',       icon: <Zap size={12} />,   color: '#3b82f6' },
  especialista: { label: 'Especialista',  icon: <BookOpen size={12} />, color: '#8b5cf6' },
  executor:     { label: 'Executor',      icon: <Wrench size={12} />,   color: '#10b981' },
  coach:        { label: 'Coach',         icon: <UserCheck size={12} />, color: '#ec4899' },
  suporte:      { label: 'Suporte',       icon: <Shield size={12} />,   color: '#6b7280' },
};

const STATUS_LABELS: Record<Squad['status'], { label: string; color: string }> = {
  active:  { label: 'Ativa',     color: '#10b981' },
  draft:   { label: 'Rascunho',  color: '#f59e0b' },
  paused:  { label: 'Pausada',   color: '#ef4444' },
};

export const Squads: React.FC = () => {
  const { squads, agents, createSquad, deleteSquad, addAgentToSquad, removeAgentFromSquad, updateSquad } = useApp();

  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(squads[0]?.id ?? null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);

  // Create Squad form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newOrchId, setNewOrchId] = useState('');

  // Add member form state
  const [addMemberAgentId, setAddMemberAgentId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<SquadMemberRole>('executor');

  // Add rule form state
  const [ruleCondition, setRuleCondition] = useState('');
  const [ruleAction, setRuleAction] = useState('');

  const selectedSquad = squads.find(s => s.id === selectedSquadId) ?? null;

  const getAgent = (id: string) => agents.find(a => a.id === id);

  const handleCreateSquad = () => {
    if (!newName.trim() || !newOrchId) return;
    createSquad({
      name: newName.trim(),
      description: newDesc.trim(),
      orchestratorAgentId: newOrchId,
      members: [{ agentId: newOrchId, role: 'orchestrator', allowedTools: ['search_tool', 'task_tool'] }],
      assignmentRules: [],
      status: 'draft',
    });
    setNewName(''); setNewDesc(''); setNewOrchId('');
    setShowCreateModal(false);
  };

  const handleAddMember = () => {
    if (!selectedSquadId || !addMemberAgentId) return;
    const member: SquadMember = { agentId: addMemberAgentId, role: addMemberRole, allowedTools: ['search_tool'] };
    addAgentToSquad(selectedSquadId, member);
    setAddMemberAgentId(''); setAddMemberRole('executor');
    setShowAddMemberModal(false);
  };

  const handleAddRule = () => {
    if (!selectedSquadId || !ruleCondition.trim() || !ruleAction.trim()) return;
    const rule: AssignmentRule = { id: `r-${Date.now()}`, condition: ruleCondition.trim(), action: ruleAction.trim() };
    const squad = squads.find(s => s.id === selectedSquadId);
    if (squad) updateSquad(selectedSquadId, { assignmentRules: [...squad.assignmentRules, rule] });
    setRuleCondition(''); setRuleAction('');
    setShowRuleModal(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!selectedSquad) return;
    updateSquad(selectedSquad.id, { assignmentRules: selectedSquad.assignmentRules.filter(r => r.id !== ruleId) });
  };

  // Members sorted: orchestrator first
  const sortedMembers = selectedSquad
    ? [...selectedSquad.members].sort((a, b) => (a.role === 'orchestrator' ? -1 : b.role === 'orchestrator' ? 1 : 0))
    : [];

  const orchestratorMember = sortedMembers.find(m => m.role === 'orchestrator');
  const regularMembers = sortedMembers.filter(m => m.role !== 'orchestrator');

  // Agents not yet in selected squad
  const availableAgents = agents.filter(a =>
    !selectedSquad?.members.some(m => m.agentId === a.id)
  );

  return (
    <div className="squads-page fade-in">
      {/* Left panel — squad list */}
      <aside className="squads-sidebar">
        <div className="squads-sidebar-header">
          <h3>Squads</h3>
          <button className="squads-new-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> Nova Squad
          </button>
        </div>

        <div className="squads-list">
          {squads.length === 0 && (
            <div className="squads-empty-hint">Nenhuma squad criada ainda.</div>
          )}
          {squads.map(squad => (
            <button
              key={squad.id}
              className={`squad-list-item ${selectedSquadId === squad.id ? 'active' : ''}`}
              onClick={() => setSelectedSquadId(squad.id)}
            >
              <div className="squad-list-item-top">
                <span className="squad-list-item-name">{squad.name}</span>
                <span className="squad-status-dot" style={{ background: STATUS_LABELS[squad.status].color }} />
              </div>
              <span className="squad-list-item-meta">
                {squad.members.length} agente{squad.members.length !== 1 ? 's' : ''} · {STATUS_LABELS[squad.status].label}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Right panel — squad detail */}
      <main className="squads-main">
        {!selectedSquad ? (
          <div className="squads-no-selection">
            <Users size={40} />
            <h3>Selecione uma Squad</h3>
            <p>Escolha uma squad na lista à esquerda ou crie uma nova.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="squad-detail-header">
              <div>
                <h2>{selectedSquad.name}</h2>
                <p>{selectedSquad.description}</p>
              </div>
              <div className="squad-detail-actions">
                <span className="squad-status-badge" style={{ borderColor: STATUS_LABELS[selectedSquad.status].color, color: STATUS_LABELS[selectedSquad.status].color }}>
                  {STATUS_LABELS[selectedSquad.status].label}
                </span>
                <button className="squad-danger-btn" onClick={() => { deleteSquad(selectedSquad.id); setSelectedSquadId(squads.find(s => s.id !== selectedSquad.id)?.id ?? null); }}>
                  <Trash2 size={14} /> Excluir Squad
                </button>
              </div>
            </div>

            {/* Organogram */}
            <section className="squad-section">
              <div className="squad-section-title">
                <GitBranch size={15} />
                <span>Organograma da Squad</span>
                <button className="squad-add-btn" onClick={() => setShowAddMemberModal(true)}>
                  <Plus size={13} /> Recrutar Agente
                </button>
              </div>

              <div className="squad-orgchart">
                {/* Orchestrator node */}
                {orchestratorMember && (() => {
                  const agt = getAgent(orchestratorMember.agentId);
                  const roleMeta = ROLE_LABELS[orchestratorMember.role];
                  return (
                    <div className="org-orchestrator-row">
                      <div className="org-node orchestrator">
                        <div className="org-node-role" style={{ background: roleMeta.color }}>
                          {roleMeta.icon} {roleMeta.label}
                        </div>
                        <div className="org-node-name">{agt?.spec.identity.agent_name ?? '—'}</div>
                        <div className="org-node-model">{agt?.model}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Connector line */}
                {regularMembers.length > 0 && (
                  <div className="org-connector-vertical" />
                )}

                {/* Member nodes row */}
                {regularMembers.length > 0 && (
                  <div className="org-members-row">
                    {regularMembers.length > 1 && <div className="org-connector-horizontal" />}
                    {regularMembers.map(member => {
                      const agt = getAgent(member.agentId);
                      const roleMeta = ROLE_LABELS[member.role];
                      return (
                        <div key={member.agentId} className="org-member-col">
                          <div className="org-connector-stub" />
                          <div className="org-node member">
                            <div className="org-node-role" style={{ background: roleMeta.color }}>
                              {roleMeta.icon} {roleMeta.label}
                            </div>
                            <div className="org-node-name">{agt?.spec.identity.agent_name ?? '—'}</div>
                            <div className="org-node-model">{agt?.model}</div>
                            <button
                              className="org-node-remove"
                              onClick={() => removeAgentFromSquad(selectedSquad.id, member.agentId)}
                              title="Remover da squad"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Assignment Rules */}
            <section className="squad-section">
              <div className="squad-section-title">
                <ChevronRight size={15} />
                <span>Regras de Atribuição (rsquad)</span>
                <button className="squad-add-btn" onClick={() => setShowRuleModal(true)}>
                  <Plus size={13} /> Nova Regra
                </button>
              </div>

              {selectedSquad.assignmentRules.length === 0 ? (
                <p className="squad-rules-empty">Nenhuma regra definida. Adicione condições para determinar quem atende cada tipo de demanda.</p>
              ) : (
                <div className="squad-rules-list">
                  {selectedSquad.assignmentRules.map((rule, i) => (
                    <div key={rule.id} className="squad-rule-card">
                      <span className="rule-index">#{i + 1}</span>
                      <div className="rule-content">
                        <code className="rule-condition">SE: {rule.condition}</code>
                        <span className="rule-arrow">→</span>
                        <code className="rule-action">ENTÃO: {rule.action}</code>
                      </div>
                      <button className="rule-delete-btn" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Modal: Create Squad */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="squad-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nova Squad</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <div className="squad-modal-body">
              <div className="form-group">
                <label className="form-label">Nome da Squad</label>
                <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Squad de Viagens" />
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea className="form-textarea" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Objetivo desta squad..." />
              </div>
              <div className="form-group">
                <label className="form-label">Agente Orquestrador (CEO/Squad Manager)</label>
                <select className="form-input form-select" value={newOrchId} onChange={e => setNewOrchId(e.target.value)}>
                  <option value="">Selecionar agente...</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.spec.identity.agent_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="integrations-cancel-btn" onClick={() => setShowCreateModal(false)}>Cancelar</button>
              <button className="integrations-save-btn" onClick={handleCreateSquad}>
                <Plus size={14} /> Criar Squad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Member */}
      {showAddMemberModal && (
        <div className="modal-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div className="squad-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Recrutar Agente para a Squad</h3>
              <button className="modal-close-btn" onClick={() => setShowAddMemberModal(false)}><X size={18} /></button>
            </div>
            <div className="squad-modal-body">
              <div className="form-group">
                <label className="form-label">Agente do Marketplace</label>
                <select className="form-input form-select" value={addMemberAgentId} onChange={e => setAddMemberAgentId(e.target.value)}>
                  <option value="">Selecionar agente...</option>
                  {availableAgents.map(a => (
                    <option key={a.id} value={a.id}>{a.spec.identity.agent_name}</option>
                  ))}
                </select>
                {availableAgents.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Todos os agentes já estão nesta squad.</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Papel (Role)</label>
                <select className="form-input form-select" value={addMemberRole} onChange={e => setAddMemberRole(e.target.value as SquadMemberRole)}>
                  {(Object.keys(ROLE_LABELS) as SquadMemberRole[]).filter(r => r !== 'orchestrator').map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="integrations-cancel-btn" onClick={() => setShowAddMemberModal(false)}>Cancelar</button>
              <button className="integrations-save-btn" onClick={handleAddMember}>
                <Plus size={14} /> Recrutar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Rule */}
      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="squad-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nova Regra de Atribuição</h3>
              <button className="modal-close-btn" onClick={() => setShowRuleModal(false)}><X size={18} /></button>
            </div>
            <div className="squad-modal-body">
              <div className="form-group">
                <label className="form-label">Condição (SE)</label>
                <input className="form-input" value={ruleCondition} onChange={e => setRuleCondition(e.target.value)} placeholder="Ex: ticket.priority == 'P1'" />
              </div>
              <div className="form-group">
                <label className="form-label">Ação (ENTÃO)</label>
                <input className="form-input" value={ruleAction} onChange={e => setRuleAction(e.target.value)} placeholder="Ex: atribuir_para(N2) + alertar_humano" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="integrations-cancel-btn" onClick={() => setShowRuleModal(false)}>Cancelar</button>
              <button className="integrations-save-btn" onClick={handleAddRule}>
                <Plus size={14} /> Adicionar Regra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
