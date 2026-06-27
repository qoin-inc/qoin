// src/components/ResidentView.tsx
import React from "react";

type ResidentViewProps = {
  townId: number;
  townName: string;
  residentName: any;
  userId: any;
  openTargetId: string;
  initialTab?: string | null;
};

/**
 * ResidentView コンポーネント（スタブ）
 * 住民ページのビューです。実装は後で追加してください。
 */
export const ResidentView: React.FC<ResidentViewProps> = ({
  townId,
  townName,
  residentName,
  userId,
  openTargetId,
  initialTab,
}) => {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>ResidentView（スタブ）</h2>
      <p>townId: {townId}</p>
      <p>townName: {townName}</p>
      <p>residentName: {JSON.stringify(residentName)}</p>
      <p>userId: {JSON.stringify(userId)}</p>
      <p>openTargetId: {openTargetId}</p>
      <p>initialTab: {initialTab}</p>
    </div>
  );
};

export default ResidentView;
