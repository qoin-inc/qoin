// components/ManualViewer.tsx
import React, { ReactNode } from 'react';

export interface ManualStep {
  title: string;
  description: string;
  content?: ReactNode;
}

const ManualViewer: React.FC<{ steps: ManualStep[] }> = ({ steps }) => {
  return (
    <div className="manual-viewer">
      {steps.map((step, idx) => (
        <section key={idx} className="manual-step">
          <h2>{step.title}</h2>
          <p>{step.description}</p>
          {step.content && <div className="step-content">{step.content}</div>}
        </section>
      ))}
    </div>
  );
};

export default ManualViewer;
