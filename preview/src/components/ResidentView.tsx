import React from 'react';

const ResidentView: React.FC = () => (
  <div className="resident" style={{ padding: '1rem', background: 'var(--primary)', borderRadius: '8px' }}>
    <h2 style={{ margin: 0, color: '#fff' }}>ResidentView コンポーネント</h2>
    <p style={{ color: '#ddd' }}>ここに実際の UI が表示されます。</p>
  </div>
);

export default ResidentView;
