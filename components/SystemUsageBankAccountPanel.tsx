"use client";
import React, { useEffect, useState } from "react";
import type { BankAccount } from "@/lib/systemUsageBankAccount";
import type { InvoiceIssuer } from "@/lib/systemUsageIssuer";

export default function SystemUsageBankAccountPanel() {
  const [accounts, setAccounts] = useState<Array<{ townId: number; townName: string; account: BankAccount | null }>>([]);
  const [issuer, setIssuer] = useState<InvoiceIssuer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/system-usage/bank-account");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "振込先を確認できませんでした。");
      setAccounts(data.accounts || []); setIssuer(data.issuer);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return <section className="system-admin-card">
    <h2>システム利用料の振込先（Stripe連携）</h2>
    <p>各町内会・自治会がシステム利用料を支払うための専用口座です。銀行振込の選択時または請求発行時にStripeから取得します。請求先ごとに口座が異なります。表示のみで、手入力による登録・変更はできません。</p>
    <button type="button" onClick={() => void load()} disabled={loading}>表示を更新</button>
    {error && <p role="alert">{error}</p>}
    {loading ? <p>読み込み中…</p> : <div className="system-rate-history"><table><thead><tr><th>請求先</th><th>銀行</th><th>支店</th><th>口座種別</th><th>口座番号</th><th>口座名義</th></tr></thead><tbody>
      {accounts.map(row => <tr key={row.townId}><td>{row.townName}</td>{row.account ? <><td>{row.account.bank_name}</td><td>{row.account.bank_branch_name}</td><td>{row.account.bank_account_type === "checking" ? "当座" : "普通"}</td><td>{row.account.bank_account_number}</td><td>{row.account.bank_account_holder}</td></> : <td colSpan={5}>Stripe振込先は未取得です</td>}</tr>)}
    </tbody></table></div>}
    {issuer?.company_name && <div><h3>請求書・領収書の発行元</h3><p>{issuer.company_name}<br />〒{issuer.postal_code} {issuer.address}<br />電話番号：{issuer.phone}<br />登録番号：{issuer.registration_number || "未登録"}</p></div>}
  </section>;
}
