"use client";
import React, { useState } from "react";
import { shiftUsageMonth, usageMonthLabel, validUsageMonth } from "@/lib/systemUsageRates";
const yen = (n: number) => `¥${n.toLocaleString()}`;
const date = (value: string) => value ? new Date(value).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '未発行';
export default function SystemUsageMonthlyReport({ month, rows, busy, loading, enabled, manualEnabled, error, onMonth, onRun, onPaid }: {
  month: string; rows: any[]; busy: boolean; loading: boolean; enabled: boolean; manualEnabled: boolean; error: string;
  onMonth: (value: string) => void; onRun: (mode: 'snapshot' | 'invoice') => void; onPaid: (bill: any) => void;
}) {
  const [nameQuery, setNameQuery] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const query = nameQuery.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
  const visibleRows = rows.filter(row => String(row.town.name || "").normalize("NFKC").toLocaleLowerCase("ja-JP").includes(query) && (!unpaidOnly || row.billing?.status === "open"));
  const totals = rows.reduce((sum, row) => ({ linked: sum.linked + row.linked, pushes: sum.pushes + row.pushCount, total: sum.total + row.total }), { linked: 0, pushes: 0, total: 0 });
  const unknown = rows.some(row => !row.rate);
  const unavailable = busy || loading || !manualEnabled || Boolean(error);
  const invoiceMonth = shiftUsageMonth(month, 1);
  return <>
    <section className="system-admin-card accent">
      <h2>月別の利用実績・請求</h2>
      <div className="system-admin-actions"><button disabled={busy || loading} onClick={() => onMonth(shiftUsageMonth(month, -1))}>前月</button><label>確認・作成する利用月 <input aria-label="確認・作成する利用月" type="month" value={month} disabled={busy || loading} onChange={e => { if (validUsageMonth(e.target.value)) onMonth(e.target.value); }} /></label><button disabled={busy || loading} onClick={() => onMonth(shiftUsageMonth(month, 1))}>翌月</button></div>
      <h3>{usageMonthLabel(month)}利用分 → {usageMonthLabel(invoiceMonth)}請求</h3>
      <p>請求予定日：{usageMonthLabel(invoiceMonth)}1日 ／ 銀行振込期限：{usageMonthLabel(invoiceMonth)}10日</p>
      <p>保存済みの実績は保存時の接続数・単価を表示します。未確定の団体は現在の接続数と、選択した利用月に適用する単価で見込みを計算します。</p>
      {!enabled && <p className="system-admin-message">定期集計・カード自動決済は停止中です。手動確定と銀行口座振込の請求書発行を利用できます。</p>}
      {error && <p role="alert">{error}</p>}
      {unknown && <p role="alert">この利用月の単価が未登録の団体があります。先に料金履歴を登録してください。</p>}
      <div className="system-admin-metrics"><span><strong>{loading ? '読込中' : totals.linked}</strong>接続数</span><span><strong>{loading ? '読込中' : totals.pushes}</strong>プッシュ件数</span><span><strong>{loading ? '読込中' : unknown ? '単価未登録' : yen(totals.total)}</strong>税込合計（未発行は見込み）</span></div>
      <div className="system-admin-billing-commands"><button disabled={unavailable || unknown} onClick={() => onRun('snapshot')}>この利用月の接続数を手動確定</button><button disabled={unavailable || unknown} onClick={() => onRun('invoice')}>この利用月の請求書を発行・再処理</button></div>
    </section>
    <section className="system-admin-card">
      <h2>{usageMonthLabel(month)}利用分の町内会・自治会別一覧</h2>
      <p>{usageMonthLabel(invoiceMonth)}請求 ／ 金額は各団体の保存単価を優先して表示</p>
      <div className="system-admin-actions">
        <label>名称で検索 <input type="search" value={nameQuery} placeholder="町内会・自治会名" onChange={e => setNameQuery(e.target.value)} style={{ maxWidth: "100%", boxSizing: "border-box" }} /></label>
        <label><input type="checkbox" checked={unpaidOnly} onChange={e => setUnpaidOnly(e.target.checked)} /> 未入金のみ（請求発行済み・入金待ち）</label>
        <button type="button" onClick={() => { setNameQuery(""); setUnpaidOnly(false); }} disabled={!nameQuery && !unpaidOnly}>検索条件をクリア</button>
      </div>
      <p role="status">{loading ? "読み込み中…" : `${visibleRows.length}件表示／全${rows.length}件`}</p>
      <div className="system-rate-history"><table><thead><tr><th>町内会・自治会</th><th>利用月／請求月</th><th>適用単価・実績保存日</th><th>接続数</th><th>プッシュ／超過</th><th>税抜／消費税／税込</th><th>請求日／支払期限</th><th>状態・操作</th></tr></thead><tbody>
        {visibleRows.map(row => <tr key={row.town.id}><td>{row.town.name}<br />ID: {row.town.id}</td><td>{usageMonthLabel(month)}利用分<br />{usageMonthLabel(invoiceMonth)}請求</td><td>{row.rate ? <>接続単価 {yen(Number(row.rate.monthly_household_price))}<br />{row.rate.effective_month || row.rate.rate_effective_month ? `${usageMonthLabel(row.rate.effective_month || row.rate.rate_effective_month)}から` : '保存済み単価（開始月未記録）'}</> : '単価未登録'}<br />実績：{row.billing?.snapshot_at ? date(row.billing.snapshot_at) : '未確定（現在の接続数）'}</td><td>{row.linked}</td><td>{row.pushCount}／{row.overage}</td><td>{row.rate ? <>{yen(row.subtotal)}<br />{yen(row.tax)}<br /><strong>{yen(row.total)}</strong>{!row.issued && <small>（見込み）</small>}</> : '単価未登録'}</td><td>{date(row.billing?.invoice_issued_at)}<br />{row.billing?.due_date ? date(row.billing.due_date) : '発行前'}</td><td>{row.billing?.status === 'paid' ? '入金済み' : row.billing?.status === 'open' ? '入金待ち' : row.billing ? '実績保存済み・未発行' : '未確定'}<br />{row.paymentProfile?.payment_method === 'bank_transfer' ? '銀行口座振込' : row.paymentProfile?.payment_method === 'card' ? 'カード' : '決済方法未選択'}{row.billing?.payment_method === 'bank_transfer' && row.billing.status === 'open' && !row.billing.stripe_invoice_id && <button disabled={unavailable} onClick={() => onPaid(row.billing)}>入金確認済みにする</button>}</td></tr>)}
        {!loading && visibleRows.length === 0 && <tr><td colSpan={8}>該当する町内会・自治会はありません。</td></tr>}
      </tbody></table></div>
    </section>
  </>;
}
