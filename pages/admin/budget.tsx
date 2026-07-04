import React, { useState } from 'react';
import BudgetForm from '@/components/BudgetForm';

export default function BudgetPage() {
  const [budgetId, setBudgetId] = useState<string>('');

  const handleCreate = async (data: any) => {
    const res = await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setBudgetId(json.id);
  };

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>予算書作成</h1>
      <BudgetForm onSubmit={handleCreate} />
      {budgetId && (
        <p style={{ marginTop: '1rem' }}>
          作成完了！予算ID: <code>{budgetId}</code>
        </p>
      )}
    </div>
  );
}
