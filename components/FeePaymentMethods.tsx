"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function FeePaymentMethods({ townId, setting, onSaved }: { townId: number; setting: any; onSaved: (setting: any) => void }) {
  const [cash, setCash] = useState(setting?.cash_enabled !== false);
  const [card, setCard] = useState(setting?.stripe_card_enabled !== false);
  const [bank, setBank] = useState(setting?.stripe_bank_transfer_enabled === true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setCash(setting?.cash_enabled !== false); setCard(setting?.stripe_card_enabled !== false); setBank(setting?.stripe_bank_transfer_enabled === true); }, [setting, townId]);
  useEffect(() => { setMessage(""); }, [townId]);
  const save = async () => {
    setBusy(true); setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/fee-payment-settings", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ townId, cashEnabled: cash, cardEnabled: card, bankEnabled: bank }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存できませんでした。");
      onSaved(data.setting); setMessage(data.message || "会員が選べる支払方法を保存しました。");
    } catch (error: any) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <section className="admin-basic-card">
    <h3>会費の支払方法</h3>
    <p>会員が選べる支払方法を設定します。銀行振込はStripeが会員世帯ごとに発行する口座へ振り込み、入金確定後に自動で消込します。</p>
    <fieldset disabled={busy} className="admin-stripe-checklist">
      <label><input type="checkbox" checked={cash} onChange={e => setCash(e.target.checked)} />手集金</label>
      <label><input type="checkbox" checked={card} onChange={e => setCard(e.target.checked)} />Stripeカード決済</label>
      <label><input type="checkbox" checked={bank} onChange={e => setBank(e.target.checked)} />Stripe銀行振込（自動消込）</label>
    </fieldset>
    <p>Stripeの振込先は支払画面で案内されます。町内会・自治会の受取口座をここで手入力する必要はありません。PayPayは別途申請して有効になった場合に利用できます。</p>
    <button type="button" onClick={() => void save()} disabled={busy}>{busy ? "保存中…" : "支払方法を保存"}</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
