import React, { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Paperclip, SlidersHorizontal, Send } from 'lucide-react';
import './ChatInput.css';

interface ChatInputProps {
  onSend: (content: string) => void;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  placeholder = "Pergunte algo sobre suas bases... (⌘ + Enter para enviar)" 
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (content.trim()) {
      onSend(content);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd+Enter or Ctrl+Enter (matching "⌘ + Enter")
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-container">
      <textarea
        ref={textareaRef}
        className="chat-input-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
      />
      <div className="chat-input-actions">
        <div className="chat-input-tools">
          <button className="chat-tool-btn" type="button" onClick={() => alert('Anexo (Mock): Selecione arquivos para alimentar o contexto do Agente.')}>
            <Paperclip className="chat-tool-icon" />
            <span>Anexar</span>
          </button>
          
          <button className="chat-tool-btn" type="button" onClick={() => alert('Filtros (Mock): Selecione bases de conhecimento específicas.')}>
            <SlidersHorizontal className="chat-tool-icon" />
            <span>Filtros</span>
          </button>
        </div>

        <button 
          className="chat-send-btn" 
          type="button" 
          onClick={handleSend}
          disabled={!content.trim()}
        >
          <span>Enviar</span>
          <Send className="chat-send-icon" />
        </button>
      </div>
    </div>
  );
};
