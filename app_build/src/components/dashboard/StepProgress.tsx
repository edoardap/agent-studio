import React from 'react';
import { useApp } from '../../context/AppContext';
import { Check } from 'lucide-react';
import './StepProgress.css';

export const StepProgress: React.FC = () => {
  const { creatorStep, setCreatorStep } = useApp();

  const steps = [
    { label: 'Identidade', index: 0 },
    { label: 'Comportamento', index: 1 },
    { label: 'Segurança', index: 2 },
    { label: 'Contexto', index: 3 },
    { label: 'Planejamento', index: 4 },
    { label: 'Ações', index: 5 },
    { label: 'Resposta', index: 6 },
  ];

  return (
    <div className="step-progress-container fade-in">
      <div className="step-tabs">
        {steps.map((step) => {
          const isActive = creatorStep === step.index;
          const isCompleted = creatorStep > step.index;
          
          return (
            <button
              key={step.index}
              className={`step-tab ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => setCreatorStep(step.index)}
              title={step.label}
              type="button"
            >
              <div className="step-tab-number">
                {isCompleted ? <Check size={12} /> : step.index + 1}
              </div>
              <span className="step-tab-label">{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
