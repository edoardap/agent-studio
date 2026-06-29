import React from 'react';
import { useApp } from '../../context/AppContext';
import { Check } from 'lucide-react';
import { getLayerStatuses } from '../../utils/promptCompiler';
import './StepProgress.css';

export const StepProgress: React.FC = () => {
  const { creatorStep, setCreatorStep, creatorSpec } = useApp();

  // Os checkmarks refletem a COMPLETUDE real de cada camada (não a posição
  // da aba). A navegação continua livre: dá pra clicar em qualquer passo.
  const steps = getLayerStatuses(creatorSpec);

  return (
    <div className="step-progress-container fade-in">
      <div className="step-tabs">
        {steps.map((step) => {
          const isActive = creatorStep === step.index;
          const isCompleted = step.complete;

          return (
            <button
              key={step.index}
              className={`step-tab ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => setCreatorStep(step.index)}
              title={isCompleted ? `${step.label} — preenchida` : `${step.label} — pendente`}
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
