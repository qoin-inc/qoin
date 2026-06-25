import React from 'react';

export default function AdminView({ townId, townName }: { townId: number; townName: string }) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">管理ビュー (placeholder)</h2>
      <p>Town ID: {townId}</p>
      <p>Town Name: {townName}</p>
    </div>
  );
}
