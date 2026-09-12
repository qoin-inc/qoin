"use client";
import React, { useState } from "react";
import { emptyInvoiceIssuer, InvoiceIssuer, normalizeIssuerRegistrationNumber, validateInvoiceIssuer } from "@/lib/systemUsageIssuer";

export default function InvoiceIssuerForm({ initial, onSave, onClose }: {
  initial: InvoiceIssuer | null;
  onSave: (issuer: InvoiceIssuer) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({ ...emptyInvoiceIssuer, ...initial });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = (key: keyof InvoiceIssuer, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await onSave(validateInvoiceIssuer(draft)); }
    catch (error: any) { setMessage(error.message || "発行元情報を保存できませんでした。"); }
    finally { setBusy(false); }
  };
  return <form noValidate onSubmit={submit}>
    <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="system-admin-form">
        <label><span>会社名</span><input required autoComplete="organization" maxLength={200} value={draft.company_name} onChange={e => update("company_name", e.target.value)} /></label>
        <label><span>郵便番号</span><input required autoComplete="postal-code" maxLength={8} placeholder="123-4567" value={draft.postal_code} onChange={e => update("postal_code", e.target.value)} /></label>
        <label><span>住所</span><input required autoComplete="street-address" maxLength={300} value={draft.address} onChange={e => update("address", e.target.value)} /></label>
        <label><span>電話番号</span><input required type="tel" autoComplete="tel" maxLength={30} value={draft.phone} onChange={e => update("phone", e.target.value)} /></label>
        <label><span>適格請求書発行事業者登録番号（任意）</span><input placeholder="T1234567890123" value={draft.registration_number} onChange={e => update("registration_number", normalizeIssuerRegistrationNumber(e.target.value))} /></label>
      </div>
      <div className="system-admin-actions"><button type="submit">{busy ? "保存中…" : "発行元情報を保存"}</button><button type="button" onClick={onClose}>キャンセル</button></div>
    </fieldset>
    {message && <p role="alert">{message}</p>}
  </form>;
}
