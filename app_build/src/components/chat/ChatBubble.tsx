import React, { useState } from 'react';
import type { Message } from '../../types';
import { ChevronDown, ChevronUp, CheckCircle, FileText } from 'lucide-react';
import './ChatBubble.css';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { sender, content, timestamp, confidence, sources, reasoning } = message;
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const isUser = sender === 'user';

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Helper to parse simple markdown bolding **text** in text
  const renderFormattedContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`chat-bubble-container ${sender}`}>
      {/* Bubble Metadata */}
      <div className="chat-bubble-header">
        <span>{isUser ? 'Você' : sender === 'creator' ? 'Criador de Agentes' : 'Assistente'}</span>
        <span>•</span>
        <span>{formatTime(timestamp)}</span>
      </div>

      {/* Main Text Card */}
      <div className="chat-bubble">
        {renderFormattedContent(content)}
        
        {/* Confidence Rate (if AI assistant and present) */}
        {!isUser && confidence !== undefined && (
          <div className="confidence-container">
            <CheckCircle className="confidence-icon" size={14} />
            <span>Confiança — {confidence}%</span>
            <div className="confidence-bar-bg">
              <div 
                className="confidence-bar-fg" 
                style={{ width: `${confidence}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* References / Sources (if AI assistant and present) */}
        {!isUser && sources && sources.length > 0 && (
          <div className="sources-container">
            {sources.map((src, i) => {
              // Simulating match percentages for resources
              const percentage = 90 - (i * 8) + Math.floor(Math.random() * 5);
              return (
                <div key={i} className="source-chip">
                  <FileText size={12} />
                  <span>{src}</span>
                  <span className="source-chip-percentage">{percentage}%</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Collapsible Reasoning Process (if present) */}
        {!isUser && reasoning && (
          <div className="reasoning-accordion">
            <button 
              className="reasoning-header"
              onClick={() => setIsReasoningOpen(!isReasoningOpen)}
            >
              <span>Como cheguei aqui — 740ms — {sources?.length || 0} trechos</span>
              {isReasoningOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {isReasoningOpen && (
              <div className="reasoning-body">
                {reasoning}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
