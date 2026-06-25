import React from 'react';

export default function DebugPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>環境変数デバッグ</h1>
      <p>
        NEXT_PUBLIC_LIFF_ID: <strong>{process.env.NEXT_PUBLIC_LIFF_ID || '未設定'}</strong>
      </p>
      <p>
        NEXT_PUBLIC_SUPABASE_URL: <strong>{process.env.NEXT_PUBLIC_SUPABASE_URL || '未設定'}</strong>
      </p>
    </div>
  );
}
