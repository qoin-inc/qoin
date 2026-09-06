"use client";

import React, { useState } from "react";

import type { BankAccount } from "@/lib/systemUsageBankAccount";

export default function BankAccountForm({ initial, onSave, onClose }: {
  initial: BankAccount;
  onSave: (account: BankAccount) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = (key: keyof BankAccount, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await onSave({ ...draft, bank_name: draft.bank_name.trim(), bank_branch_name: draft.bank_branch_name.trim(), bank_account_holder: draft.bank_account_holder.trim() });
      setMessage("銀行口座を保存しました。");
    } catch (error: any) {
      setMessage(error?.message || "銀行口座を保存できませんでした。");
    } finally { setBusy(false); }
  };
  return <form onSubmit={submit}>
    <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="system-admin-form">
        <label><span>銀行名</span><input required maxLength={100} value={draft.bank_name} onChange={(e) => update("bank_name", e.target.value)} /></label>
        <label><span>支店名</span><input required maxLength={100} value={draft.bank_branch_name} onChange={(e) => update("bank_branch_name", e.target.value)} /></label>
        <label><span>口座種別</span><select required value={draft.bank_account_type} onChange={(e) => update("bank_account_type", e.target.value)}><option value="ordinary">普通</option><option value="checking">当座</option></select></label>
        <label><span>口座番号（7桁）</span><input required inputMode="numeric" pattern="[0-9]{7}" maxLength={7} value={draft.bank_account_number} onChange={(e) => update("bank_account_number", e.target.value.normalize("NFKC").replace(/[^0-9]/g, "").slice(0, 7))} /><small>先頭の0を含めて入力してください。</small></label>
        <label><span>口座名義（カナ）</span><input required maxLength={200} value={draft.bank_account_holder} onChange={(e) => update("bank_account_holder", e.target.value)} /></label>
      </div>
      <div className="system-admin-actions"><button type="submit">{busy ? "保存中…" : "銀行口座を保存"}</button><button type="button" onClick={onClose}>閉じる</button></div>
    </fieldset>
    {message && <p role="status">{message}</p>}
  </form>;
}
