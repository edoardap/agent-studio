import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Tool } from '../types';
import { Terminal, Cpu, Plus, Save, Trash2, Users, Globe, X, Check, Settings } from 'lucide-react';
import './Integrations.css';

export const Integrations: React.FC = () => {
  const { toolsList, addTool, updateTool, deleteTool, toggleToolAssociation, agents } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mcp' | 'custom'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedToolId, setSelectedToolId] = useState<string>('');

  // Form states (for creating or editing)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'mcp' | 'custom'>('mcp');
  const [mcpTransport, setMcpTransport] = useState<'stdio' | 'sse'>('stdio');
  const [mcpCommand, setMcpCommand] = useState('');
  const [mcpArgsString, setMcpArgsString] = useState('');
  const [mcpSseUrl, setMcpSseUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [schema, setSchema] = useState('{\n  "type": "object",\n  "properties": {}\n}');

  // Filtered tools
  const filteredTools = toolsList.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tool.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleOpenCreate = () => {
    setModalMode('create');
    setName('');
    setDescription('');
    setType('mcp');
    setMcpTransport('stdio');
    setMcpCommand('npx');
    setMcpArgsString('');
    setMcpSseUrl('');
    setMethod('GET');
    setUrl('');
    setHeaders('{\n  "Content-Type": "application/json"\n}');
    setSchema('{\n  "type": "object",\n  "properties": {}\n}');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tool: Tool) => {
    setModalMode('edit');
    setSelectedToolId(tool.id);
    setName(tool.name);
    setDescription(tool.description);
    setType(tool.type);
    setMcpTransport(tool.mcpTransport ?? 'stdio');
    setMcpCommand(tool.mcpCommand ?? '');
    setMcpArgsString(tool.mcpArgs?.join(', ') ?? '');
    setMcpSseUrl(tool.mcpSseUrl ?? '');
    setMethod(tool.method ?? 'GET');
    setUrl(tool.url ?? '');
    setHeaders(tool.headers ?? '{\n  "Content-Type": "application/json"\n}');
    setSchema(tool.schema ?? '{\n  "type": "object",\n  "properties": {}\n}');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('O nome da ferramenta é obrigatório.');
      return;
    }

    if (modalMode === 'create') {
      const newToolData: Omit<Tool, 'id'> = {
        name: name.trim(),
        description: description.trim(),
        type,
        associatedAgentIds: [],
        ...(type === 'mcp' ? {
          mcpTransport,
          mcpCommand: mcpTransport === 'stdio' ? mcpCommand.trim() : undefined,
          mcpArgs: mcpTransport === 'stdio' ? mcpArgsString.split(',').map(a => a.trim()).filter(a => a.length > 0) : undefined,
          mcpSseUrl: mcpTransport === 'sse' ? mcpSseUrl.trim() : undefined,
        } : {
          method,
          url: url.trim(),
          headers: headers.trim(),
          schema: schema.trim(),
        })
      };
      addTool(newToolData);
    } else {
      updateTool(selectedToolId, {
        name: name.trim(),
        description: description.trim(),
        type,
        mcpTransport,
        mcpCommand: type === 'mcp' && mcpTransport === 'stdio' ? mcpCommand.trim() : undefined,
        mcpArgs: type === 'mcp' && mcpTransport === 'stdio' ? mcpArgsString.split(',').map(a => a.trim()).filter(a => a.length > 0) : undefined,
        mcpSseUrl: type === 'mcp' && mcpTransport === 'sse' ? mcpSseUrl.trim() : undefined,
        method: type === 'custom' ? method : undefined,
        url: type === 'custom' ? url.trim() : undefined,
        headers: type === 'custom' ? headers.trim() : undefined,
        schema: type === 'custom' ? schema.trim() : undefined,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover esta ferramenta do catálogo?')) {
      deleteTool(id);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="integrations-page fade-in">
      {/* Header section with title and controls */}
      <div className="integrations-page-header">
        <div className="integrations-page-title-section">
          <h2>Catálogo de Integrações & Tools</h2>
          <p>Configure ferramentas globais e reutilizáveis, gerenciando conexões MCP e requisições REST.</p>
        </div>

        <div className="integrations-controls">
          <input 
            type="text" 
            placeholder="Buscar ferramenta..." 
            className="integrations-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select 
            className="integrations-filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">Todos os tipos</option>
            <option value="mcp">Apenas MCP</option>
            <option value="custom">Apenas REST Customizada</option>
          </select>

          <button className="integrations-new-btn" onClick={handleOpenCreate} type="button">
            <Plus size={14} />
            <span>Nova Ferramenta</span>
          </button>
        </div>
      </div>

      {/* Grid List */}
      {filteredTools.length > 0 ? (
        <div className="tools-grid">
          {filteredTools.map(tool => (
            <div 
              key={tool.id} 
              className="tool-card fade-in"
              onClick={() => handleOpenEdit(tool)}
            >
              <div>
                <div className="tool-card-header">
                  <h3 className="tool-card-title">{tool.name}</h3>
                  <div className="tool-card-badges">
                    <span className={`tool-type-badge ${tool.type}`}>
                      {tool.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Meta info row: transport/method + agents count */}
                <div className="tool-card-meta">
                  {tool.type === 'mcp' ? (
                    <span className="tool-meta-tag">
                      💻 {tool.mcpTransport === 'stdio' ? `stdio: ${tool.mcpCommand}` : 'sse'}
                    </span>
                  ) : (
                    <span className="tool-meta-tag">
                      🌐 {tool.method}
                    </span>
                  )}
                  <span className="tool-meta-tag template">
                    🔑 {tool.associatedAgentIds.length} {tool.associatedAgentIds.length === 1 ? 'agente' : 'agentes'}
                  </span>
                </div>

                <p className="tool-card-description">{tool.description}</p>

                {/* Associated Agents list as tags */}
                {tool.associatedAgentIds.length > 0 && (
                  <div className="tool-card-agents">
                    {tool.associatedAgentIds.slice(0, 3).map(agentId => {
                      const agentName = agents.find(a => a.id === agentId)?.spec.identity.agent_name ?? 'Agente';
                      return (
                        <span key={agentId} className="tool-agent-tag">
                          🤖 {agentName}
                        </span>
                      );
                    })}
                    {tool.associatedAgentIds.length > 3 && (
                      <span className="tool-agent-tag">
                        +{tool.associatedAgentIds.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="tool-card-actions">
                <div className="tool-action-main">
                  <button
                    className="tool-action-btn configure"
                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(tool); }}
                  >
                    <Settings size={14} />
                    <span>Configurar</span>
                  </button>
                </div>

                <div className="tool-card-right-actions">
                  <button
                    className="tool-delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDelete(tool.id); }}
                    title="Excluir Ferramenta"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tools-empty-state">
          <Cpu className="tools-empty-icon" />
          <div>
            <h3>Nenhuma ferramenta cadastrada</h3>
            <p>Cadastre servidores MCP locais ou APIs customizadas no botão acima.</p>
          </div>
        </div>
      )}

      {/* Detail / Edit / Creation Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="tool-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Nova Ferramenta de Integração' : `Configurar: ${name}`}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="tool-modal-body">
              <div className="tool-modal-grid">
                {/* Form column */}
                <div className="tool-modal-form-col">
                  <div className="form-group">
                    <label className="form-label">Nome da Ferramenta</label>
                    <input
                      type="text"
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Consultor Jira MCP"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Descrição</label>
                    <textarea
                      className="form-textarea"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Indique a utilidade desta ferramenta para o agente..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipo de Integração</label>
                    <div className="integration-type-selectors">
                      <label className={`type-selector-card ${type === 'mcp' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="tool-type"
                          checked={type === 'mcp'}
                          onChange={() => setType('mcp')}
                        />
                        <Terminal size={18} />
                        <div className="selector-text">
                          <span className="selector-title">Protocolo MCP</span>
                          <span className="selector-desc">Stdio / SSE</span>
                        </div>
                      </label>

                      <label className={`type-selector-card ${type === 'custom' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="tool-type"
                          checked={type === 'custom'}
                          onChange={() => setType('custom')}
                        />
                        <Globe size={18} />
                        <div className="selector-text">
                          <span className="selector-title">API Customizada</span>
                          <span className="selector-desc">Requisição HTTP</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Sub-panels for MCP / REST */}
                  {type === 'mcp' ? (
                    <div className="integration-subtype-panel">
                      <span className="panel-subtitle">Configurações MCP</span>
                      
                      <div className="form-group">
                        <label className="form-label">Transporte</label>
                        <select
                          className="form-input form-select"
                          value={mcpTransport}
                          onChange={(e) => setMcpTransport(e.target.value as any)}
                        >
                          <option value="stdio">Local Stdio (Processo local)</option>
                          <option value="sse">Remoto SSE (Eventos do Servidor)</option>
                        </select>
                      </div>

                      {mcpTransport === 'stdio' ? (
                        <>
                          <div className="form-group">
                            <label className="form-label">Comando Executável</label>
                            <input
                              type="text"
                              className="form-input font-mono"
                              value={mcpCommand}
                              onChange={(e) => setMcpCommand(e.target.value)}
                              placeholder="npx"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Argumentos (separados por vírgula)</label>
                            <input
                              type="text"
                              className="form-input font-mono"
                              value={mcpArgsString}
                              onChange={(e) => setMcpArgsString(e.target.value)}
                              placeholder="-y, @modelcontextprotocol/server-postgres, ..."
                            />
                          </div>
                        </>
                      ) : (
                        <div className="form-group">
                          <label className="form-label">URL do Endpoint SSE</label>
                          <input
                            type="text"
                            className="form-input font-mono"
                            value={mcpSseUrl}
                            onChange={(e) => setMcpSseUrl(e.target.value)}
                            placeholder="http://localhost:3001/sse"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="integration-subtype-panel">
                      <span className="panel-subtitle">Configurações REST</span>

                      <div className="form-group-row">
                        <div className="form-group-method">
                          <label className="form-label">Método</label>
                          <select
                            className="form-input form-select"
                            value={method}
                            onChange={(e) => setMethod(e.target.value as any)}
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                        <div className="form-group-url">
                          <label className="form-label">Endpoint URL</label>
                          <input
                            type="text"
                            className="form-input font-mono"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://api.exemplo.com/v1"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Headers (JSON)</label>
                        <textarea
                          className="form-textarea font-mono code-textarea"
                          value={headers}
                          onChange={(e) => setHeaders(e.target.value)}
                          spellCheck={false}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">JSON Schema de Parâmetros</label>
                        <textarea
                          className="form-textarea font-mono code-textarea"
                          value={schema}
                          onChange={(e) => setSchema(e.target.value)}
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Associated Agents Column (Only in edit mode, since a new tool starts with 0 associated agents) */}
                <div className="tool-modal-agents-col">
                  <span className="panel-subtitle">Agentes Autorizados</span>
                  {modalMode === 'edit' ? (
                    <>
                      <p className="column-desc">Selecione quais agentes de chat podem invocar esta ferramenta no Studio.</p>
                      <div className="association-agents-list">
                        {agents.map(agent => {
                          const isChecked = toolsList
                            .find(t => t.id === selectedToolId)
                            ?.associatedAgentIds.includes(agent.id) ?? false;
                          return (
                            <label key={agent.id} className={`association-agent-item ${isChecked ? 'active' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleToolAssociation(selectedToolId, agent.id)}
                              />
                              <div className="agent-item-avatar">
                                {agent.spec.identity.agent_name.substring(0, 2).toUpperCase() || 'AI'}
                              </div>
                              <div className="agent-item-details">
                                <span className="agent-item-name">{agent.spec.identity.agent_name || 'Agente sem nome'}</span>
                                <span className="agent-item-model">{agent.model} · {agent.channel}</span>
                              </div>
                              {isChecked && <Check size={14} className="association-check-icon" />}
                            </label>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="empty-agents-hint">
                      <Users size={24} />
                      <p>Você poderá associar agentes a esta ferramenta logo após salvá-la.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {modalMode === 'edit' && (
                <button 
                  className="integrations-delete-btn" 
                  onClick={() => handleDelete(selectedToolId)}
                  type="button"
                >
                  <Trash2 size={14} />
                  <span>Excluir Ferramenta</span>
                </button>
              )}
              <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                <button className="integrations-cancel-btn" onClick={() => setIsModalOpen(false)} type="button">
                  Cancelar
                </button>
                <button className="integrations-save-btn" onClick={handleSave} type="button">
                  <Save size={14} />
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
