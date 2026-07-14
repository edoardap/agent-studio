import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { TaskStatus, TaskPriority } from '../types';
import { ArrowLeft, Plus, User, Clock, Flag, X } from 'lucide-react';
import './Kanban.css';

const COLUMNS: { key: TaskStatus; label: string; emoji: string; color: string }[] = [
  { key: 'entrada',           label: 'Entrada',            emoji: '📥', color: '#3b82f6' },
  { key: 'em_andamento',      label: 'Em Andamento',       emoji: '🔄', color: '#f59e0b' },
  { key: 'aguardando_humano', label: 'Aguardando Humano',  emoji: '⏸️',  color: '#ef4444' },
  { key: 'concluido',         label: 'Concluído',          emoji: '✅', color: '#10b981' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  P1: '#ef4444', P2: '#f97316', P3: '#f59e0b', P4: '#6b7280',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

interface Props {
  squadId: string;
  onBack: () => void;
}

export const Kanban: React.FC<Props> = ({ squadId, onBack }) => {
  const { tasks, moveTask, agents, squads } = useApp();
  const squad = squads.find(s => s.id === squadId);
  const squadTasks = tasks.filter(t => t.squadId === squadId);
  const [dragging, setDragging] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const getAgent = (id?: string) => agents.find(a => a.id === id);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (dragging) moveTask(dragging, status);
    setDragging(null);
  };

  const byStatus = (status: TaskStatus) => squadTasks.filter(t => t.status === status);

  return (
    <div className="kanban-page fade-in">
      {/* Header */}
      <div className="kanban-header">
        <button className="kanban-back-btn" onClick={onBack}>
          <ArrowLeft size={15} /> Voltar ao Sistema
        </button>
        <div className="kanban-title-wrap">
          <h2>{squad?.name ?? 'Squad'} — Tasks</h2>
          <span className="kanban-count">{squadTasks.length} tarefas</span>
        </div>
        <button className="kanban-new-btn" onClick={() => setShowNewTask(true)}>
          <Plus size={14} /> Nova Task
        </button>
      </div>

      {/* Columns */}
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colTasks = byStatus(col.key);
          return (
            <div
              key={col.key}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              {/* Column header */}
              <div className="kanban-col-header">
                <div className="kanban-col-title-row">
                  <span className="kanban-col-emoji">{col.emoji}</span>
                  <span className="kanban-col-label" style={{ color: col.color }}>{col.label}</span>
                  <span className="kanban-col-count">{colTasks.length}</span>
                </div>
                <div className="kanban-col-bar" style={{ background: col.color }} />
              </div>

              {/* Task cards */}
              <div className="kanban-cards">
                {colTasks.length === 0 && (
                  <div className="kanban-empty-col">
                    <span>Nenhuma tarefa</span>
                  </div>
                )}
                {colTasks.map(task => {
                  const assignedAgent = getAgent(task.assignedAgentId);
                  return (
                    <div
                      key={task.id}
                      className={`kanban-card ${dragging === task.id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => setDragging(task.id)}
                      onDragEnd={() => setDragging(null)}
                    >
                      {/* Priority badge */}
                      <div className="kanban-card-top">
                        <span
                          className="kanban-priority"
                          style={{ color: PRIORITY_COLORS[task.priority], borderColor: `${PRIORITY_COLORS[task.priority]}44`, background: `${PRIORITY_COLORS[task.priority]}11` }}
                        >
                          <Flag size={9} /> {task.priority}
                        </span>
                        <div className="kanban-card-actions">
                          {/* Move arrows (touch-friendly alternative to drag) */}
                          {col.key !== 'entrada' && (
                            <button
                              className="kanban-move-btn"
                              title="Mover para coluna anterior"
                              onClick={() => {
                                const idx = COLUMNS.findIndex(c => c.key === col.key);
                                if (idx > 0) moveTask(task.id, COLUMNS[idx - 1].key);
                              }}
                            >←</button>
                          )}
                          {col.key !== 'concluido' && (
                            <button
                              className="kanban-move-btn"
                              title="Avançar para próxima coluna"
                              onClick={() => {
                                const idx = COLUMNS.findIndex(c => c.key === col.key);
                                if (idx < COLUMNS.length - 1) moveTask(task.id, COLUMNS[idx + 1].key);
                              }}
                            >→</button>
                          )}
                        </div>
                      </div>

                      <p className="kanban-card-title">{task.title}</p>
                      <p className="kanban-card-desc">{task.description}</p>

                      {/* Footer */}
                      <div className="kanban-card-footer">
                        {assignedAgent ? (
                          <div className="kanban-agent-chip">
                            <User size={10} />
                            {assignedAgent.spec.identity.agent_name}
                          </div>
                        ) : (
                          <div className="kanban-agent-chip unassigned">
                            <User size={10} /> Não atribuído
                          </div>
                        )}
                        <div className="kanban-time">
                          <Clock size={9} /> {timeAgo(task.updatedAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal (simple) */}
      {showNewTask && (
        <div className="modal-overlay" onClick={() => setShowNewTask(false)}>
          <div className="squad-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nova Task</h3>
              <button className="modal-close-btn" onClick={() => setShowNewTask(false)}><X size={18} /></button>
            </div>
            <div className="squad-modal-body">
              <div className="form-group">
                <label className="form-label">Título da tarefa</label>
                <input
                  className="form-input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Descreva o que precisa ser feito..."
                  autoFocus
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                A task será criada na coluna <strong>Entrada</strong> e o Orquestrador vai atribuí-la ao agente correto.
              </p>
            </div>
            <div className="modal-footer">
              <button className="integrations-cancel-btn" onClick={() => setShowNewTask(false)}>Cancelar</button>
              <button
                className="integrations-save-btn"
                onClick={() => { /* mock - just close */ setNewTitle(''); setShowNewTask(false); }}
              >
                <Plus size={14} /> Criar Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
