"use client";
import React, { useState } from "react";
import { usageMonthLabel } from "@/lib/systemUsageRates";

export default function SystemUsageRateHistory({ rates, initial, onSaved }: { rates: any[]; initial: any; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState({ effective_month: "", monthly_household_price: String(initial?.monthly_household_price ?? 0), free_push_limit: String(initial?.free_push_limit ?? 0), push_unit_price: String(initial?.push_unit_price ?? 0), tax_rate: String(initial?.tax_rate ?? 10), change_reason: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = (key: string, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const ordered = [...rates].sort((a, b) => a.effective_month.localeCompare(b.effective_month));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!window.confirm(`${usageMonthLabel(draft.effective_month)}利用分からの共通単価を登録します。保存済みの実績・発行済み請求は変更しません。よろしいですか？`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/system-usage/rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await onSaved();
      setMessage(`${usageMonthLabel(draft.effective_month)}からの料金単価を履歴に保存しました。`);
    } catch (error: any) { setMessage(error.message || "保存できませんでした。"); } finally { setBusy(false); }
  };
  return <section className="system-admin-card">
    <h2>料金単価の年月・変更履歴</h2>
    <p>適用開始月から次の変更月の前月まで、全町内会・自治会に同じ単価を使用します。初回は運用開始月を指定してください。</p>
    <form onSubmit={save}><fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0 }}>
      <div className="system-admin-form">
        <label><span>単価の適用開始月</span><input required type="month" value={draft.effective_month} onChange={e => update("effective_month", e.target.value)} /></label>
        {([['monthly_household_price', '接続数1件あたり単価（円）'], ['free_push_limit', '無料プッシュ件数'], ['push_unit_price', 'プッシュ超過単価（円）'], ['tax_rate', '消費税率（%）']] as const).map(([key, label]) => <label key={key}><span>{label}</span><input required type="number" min="0" max={key === 'tax_rate' ? 100 : 100000000} step={key === 'tax_rate' ? '0.01' : '1'} value={draft[key]} onChange={e => update(key, e.target.value)} /></label>)}
        <label><span>登録・変更理由</span><input required maxLength={500} value={draft.change_reason} onChange={e => update("change_reason", e.target.value)} /></label>
      </div><div className="system-admin-actions"><button type="submit">{busy ? '保存中…' : 'この開始月で単価を登録'}</button></div>
    </fieldset></form>
    {message && <p role="status">{message}</p>}
    <div className="system-rate-history"><table><thead><tr><th>適用期間（利用月）</th><th>接続単価</th><th>無料枠</th><th>超過単価</th><th>税率</th><th>登録日時・理由</th></tr></thead><tbody>
      {ordered.map((rate, i) => <tr key={rate.id}><td>{usageMonthLabel(rate.effective_month)}から<br />{ordered[i + 1] ? `${usageMonthLabel(ordered[i + 1].effective_month)}の前月まで` : '次の変更まで継続'}</td><td>¥{rate.monthly_household_price}</td><td>{rate.free_push_limit}件/月</td><td>¥{rate.push_unit_price}</td><td>{rate.tax_rate}%</td><td>{new Date(rate.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}<br />{rate.change_reason}</td></tr>)}
      {!ordered.length && <tr><td colSpan={6}>料金履歴は未登録です。適用開始月と単価を登録してください。</td></tr>}
    </tbody></table></div>
  </section>;
}
