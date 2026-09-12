"use client";
import React, { useEffect, useState } from "react";
import type { InvoiceIssuer } from "@/lib/systemUsageIssuer";
import InvoiceIssuerForm from "@/components/InvoiceIssuerForm";

export default function SystemUsageIssuerPanel() {
  const [issuer, setIssuer] = useState<InvoiceIssuer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/system-usage/issuer");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "発行元情報を読み込めませんでした。");
        if (active) setIssuer(data.issuer);
      } catch (err: any) { if (active) setError(err.message); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, []);
  const save = async (next: InvoiceIssuer) => {
    const response = await fetch("/api/system-usage/issuer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ issuer: next }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "発行元情報を保存できませんでした。");
    setIssuer(data.issuer); setEditing(false); setMessage("発行元情報を保存しました。");
  };
  return <section className="system-admin-card">
    <h2>請求書・領収書の発行元情報</h2>
    <p>システム利用料の請求書・領収書に記載する会社名、住所、電話番号、登録番号を登録します。</p>
    {loading ? <p>読み込み中…</p> : error ? <p role="alert">{error}</p> : editing ? <InvoiceIssuerForm initial={issuer} onSave={save} onClose={() => setEditing(false)} /> : <>
      {issuer?.company_name ? <div style={{ overflowWrap: "anywhere" }}><p>{issuer.company_name}<br />〒{issuer.postal_code} {issuer.address}<br />電話番号：{issuer.phone}<br />適格請求書発行事業者登録番号：{issuer.registration_number || "未登録"}</p></div> : <p>発行元情報は未登録です。</p>}
      <button type="button" className="system-admin-primary" onClick={() => { setMessage(""); setEditing(true); }}>{issuer?.company_name ? "発行元情報を編集" : "発行元情報を登録"}</button>
    </>}
    <p>発行時の発行元情報が保存されている請求書・領収書は、その情報を維持します。発行元情報が未保存の過去の帳票には、現在の登録内容を表示します。</p>
    {message && <p role="status">{message}</p>}
  </section>;
}
