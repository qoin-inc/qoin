"use client";

import React, { useState } from "react";

import { BankAccount, withBankCodes, validateBankAccount } from "@/lib/systemUsageBankAccount";
import { emptyInvoiceIssuer, InvoiceIssuer, validateInvoiceIssuer } from "@/lib/systemUsageIssuer";

export default function BankAccountForm({ initial, onSave, onClose }: {
  initial: BankAccount;
  onSave: (account: BankAccount) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => withBankCodes(initial));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = (key: keyof BankAccount, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const updateIssuer = (key: keyof InvoiceIssuer, value: string) => setDraft(current => ({ ...current, issuer: { ...emptyInvoiceIssuer, ...current.issuer, [key]: value } }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const account = { ...validateBankAccount(draft), issuer: validateInvoiceIssuer(draft.issuer) };
      await onSave(account);
      setMessage("銀行口座と発行元情報を保存しました。");
    } catch (error: any) {
      setMessage(error?.message || "銀行口座を保存できませんでした。");
    } finally { setBusy(false); }
  };
  return <form noValidate onSubmit={submit}>
    <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="system-admin-form">
        <label><span>銀行名</span><input required maxLength={100} value={draft.bank_name} onChange={(e) => update("bank_name", e.target.value)} /></label>
        <label><span>金融機関コード（4桁）</span><input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={draft.bank_code || ""} onChange={(e) => update("bank_code", e.target.value.normalize("NFKC").replace(/[^0-9]/g, "").slice(0, 4))} /></label>
        <label><span>支店名</span><input required maxLength={100} value={draft.bank_branch_name} onChange={(e) => update("bank_branch_name", e.target.value)} /></label>
        <label><span>支店コード（3桁）</span><input required inputMode="numeric" pattern="[0-9]{3}" maxLength={3} value={draft.bank_branch_code || ""} onChange={(e) => update("bank_branch_code", e.target.value.normalize("NFKC").replace(/[^0-9]/g, "").slice(0, 3))} /></label>
        <label><span>口座種別</span><select required value={draft.bank_account_type} onChange={(e) => update("bank_account_type", e.target.value)}><option value="ordinary">普通</option><option value="checking">当座</option></select></label>
        <label><span>口座番号（7桁）</span><input required inputMode="numeric" pattern="[0-9]{7}" maxLength={7} value={draft.bank_account_number} onChange={(e) => update("bank_account_number", e.target.value.normalize("NFKC").replace(/[^0-9]/g, "").slice(0, 7))} /><small>先頭の0を含めて入力してください。</small></label>
        <label><span>口座名義（カナ）</span><input required maxLength={200} value={draft.bank_account_holder} onChange={(e) => update("bank_account_holder", e.target.value)} /></label>
      </div>
      <h3>請求書・領収書の発行元</h3>
      <div className="system-admin-form">
        <label><span>郵便番号</span><input required autoComplete="postal-code" maxLength={8} placeholder="123-4567" value={draft.issuer?.postal_code || ""} onChange={e => updateIssuer("postal_code", e.target.value)} /></label>
        <label><span>住所</span><input required autoComplete="street-address" maxLength={300} value={draft.issuer?.address || ""} onChange={e => updateIssuer("address", e.target.value)} /></label>
        <label><span>会社名</span><input required autoComplete="organization" maxLength={200} value={draft.issuer?.company_name || ""} onChange={e => updateIssuer("company_name", e.target.value)} /></label>
        <label><span>電話番号</span><input required type="tel" autoComplete="tel" maxLength={30} value={draft.issuer?.phone || ""} onChange={e => updateIssuer("phone", e.target.value)} /></label>
        <label><span>適格請求書発行事業者登録番号</span><input maxLength={14} placeholder="T1234567890123" value={draft.issuer?.registration_number || ""} onChange={e => updateIssuer("registration_number", e.target.value)} /></label>
      </div>
      <div className="system-admin-actions"><button type="submit">{busy ? "保存中…" : "銀行口座・発行元情報を保存"}</button><button type="button" onClick={onClose}>閉じる</button></div>
    </fieldset>
    {message && <p role="status">{message}</p>}
  </form>;
}
