import React from 'react';

export default function SignupTown({ onComplete, onCancel }: { onComplete: (town: { id: number; name: string }) => void; onCancel: () => void }) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">町内会新規登録 (placeholder)</h2>
      <p>このコンポーネントは開発中です。</p>
      <button onClick={() => onComplete({ id: 1, name: 'サンプル町' })} className="bg-qoin-main text-white py-2 px-4 rounded mt-2">完了</button>
      <button onClick={onCancel} className="bg-gray-300 text-black py-2 px-4 rounded mt-2 ml-2">キャンセル</button>
    </div>
  );
}
