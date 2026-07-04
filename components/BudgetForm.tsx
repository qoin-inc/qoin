import React, { useState } from 'react';

interface BudgetItem {
  department: string;
  itemName: string;
  amount: number;
  note?: string;
}

interface BudgetFormProps {
  onSubmit: (data: { title: string; year: number; items: BudgetItem[] }) => void;
}

export default function BudgetForm({ onSubmit }: BudgetFormProps) {
  const [title, setTitle] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [currentItem, setCurrentItem] = useState<BudgetItem>({ department: '', itemName: '', amount: 0 });

  const addItem = () => {
    if (currentItem.department && currentItem.itemName && currentItem.amount) {
      setItems([...items, currentItem]);
      setCurrentItem({ department: '', itemName: '', amount: 0 });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, year, items });
  };

  return (
    <form onSubmit={handleSubmit} className="budget-form" style={{ background: '#111', color: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
      <h2 style={{ marginBottom: '1rem' }}>予算書作成</h2>
      <div className="field">
        <label>タイトル</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="input" />
      </div>
      <div className="field">
        <label>年度</label>
        <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value, 10))} required className="input" />
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>項目追加</h3>
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
        <input placeholder="部門" value={currentItem.department} onChange={e => setCurrentItem({ ...currentItem, department: e.target.value })} className="input" />
        <input placeholder="項目名" value={currentItem.itemName} onChange={e => setCurrentItem({ ...currentItem, itemName: e.target.value })} className="input" />
        <input placeholder="金額" type="number" value={currentItem.amount} onChange={e => setCurrentItem({ ...currentItem, amount: parseFloat(e.target.value) })} className="input" />
        <input placeholder="備考 (任意)" value={currentItem.note || ''} onChange={e => setCurrentItem({ ...currentItem, note: e.target.value })} className="input" />
        <button type="button" onClick={addItem} className="btn" style={{ background: '#4a90e2', color: '#fff' }}>＋ 追加</button>
      </div>

      {items.length > 0 && (
        <table className="budget-table" style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #444' }}>
              <th>部門</th>
              <th>項目名</th>
              <th>金額</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                <td>{it.department}</td>
                <td>{it.itemName}</td>
                <td>{it.amount.toLocaleString()}</td>
                <td>{it.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button type="submit" className="btn" style={{ marginTop: '1rem', background: '#4a90e2', color: '#fff' }}>予算書作成</button>
    </form>
  );
}
