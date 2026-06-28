"use client";
import React from "react";

/**
 * MapComponent コンポーネント（スタブ）
 * 地図表示のプレースホルダーです。実装は後で追加してください。
 */
export const MapComponent: React.FC<{
  towns: any[];
  selectedTownId: number;
  onMarkerClick: (id: any) => void;
}> = ({ towns, selectedTownId, onMarkerClick }) => {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>MapComponent（スタブ）</h2>
      <p>ここに地図コンポーネントを実装します。</p>
      {/* Props preview for debugging */}
      <pre>{JSON.stringify({ towns, selectedTownId }, null, 2)}</pre>
      <button onClick={() => onMarkerClick(towns[0]?.id)}>Select First Town</button>
    </div>
  );
};



export default MapComponent;
