import React from 'react';

export type ManualStep = {
  title: string;
  description: string;
  content: React.ReactNode;
};

interface ManualViewerProps {
  title: string;
  subtitle?: string;
  steps: ManualStep[];
  accentColor?: string;
  icon?: string;
}

/**
 * Placeholder ManualViewer component used to render a simple manual page.
 * It displays the title, optional subtitle, and iterates over the provided steps.
 */
const ManualViewer: React.FC<ManualViewerProps> = ({ title, subtitle, steps, accentColor, icon }) => {
  const headerStyle: React.CSSProperties = {
    backgroundColor: accentColor || '#4F95D3',
    color: 'white',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  return (
    <div className="manual-viewer">
      <div style={headerStyle}>
        {icon && <i className={`fas ${icon}`} />}
        <h1 style={{ margin: 0 }}>{title}</h1>
      </div>
      {subtitle && <h2 className="subtitle" style={{ margin: '0.5rem 0' }}>{subtitle}</h2>}
      <div className="steps">
        {steps.map((step, idx) => (
          <section key={idx} className="step" style={{ marginBottom: '1.5rem' }}>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <div className="content">{step.content}</div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ManualViewer;
