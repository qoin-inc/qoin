// src/components/SignupResident.tsx
import React from "react";

type SignupResidentProps = {
  sessionUser?: any;
  onComplete: (newTown: { id: number; name: string }) => void;
  onCancel: () => void;
};

/**
 * SignupResident コンポーネント（スタブ）
 * 住民のサインアップページです。実装は後で追加してください。
 */
export const SignupResident: React.FC<SignupResidentProps> = ({ sessionUser, onComplete, onCancel }) => {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>SignupResident（スタブ）</h2>
      <p>住民サインアップ用のフォームです。sessionUser: {JSON.stringify(sessionUser)}</p>
      <button onClick={() => onComplete({ id: 1, name: "サンプルタウン" })}>完了</button>
      <button onClick={onCancel}>キャンセル</button>
    </div>
  );
};

export default SignupResident;
