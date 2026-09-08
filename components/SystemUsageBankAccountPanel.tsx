"use client";
import React, { useEffect, useState } from "react";
import BankAccountForm from "@/components/BankAccountForm";
import { BankAccount, bankAccountText, emptyBankAccount } from "@/lib/systemUsageBankAccount";

export default function SystemUsageBankAccountPanel() {
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/system-usage/bank-account").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "口座を確認できませんでした。");
      if (active) setAccount(data.account);
    }).catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <section className="system-admin-card">
    <h2>システム利用料の振込先銀行口座・発行元情報</h2>
    <p>運営側が利用料を受け取る口座と、請求書・領収書の発行元を設定します。発行元情報が未登録の過去の帳票にも、現在の設定を表示します。発行時の発行元情報が保存されている帳票は、その情報を表示します。</p>
    {loading ? <p>読み込み中…</p> : error ? <p role="alert">振込先口座を読み込めませんでした。{error}</p> : editing ? <BankAccountForm initial={account || emptyBankAccount} onClose={() => setEditing(false)} onSave={async (next) => {
      const response = await fetch("/api/system-usage/bank-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存できませんでした。");
      setAccount(data.account);
    }} /> : <><p>{account ? bankAccountText(account) : "振込先口座は未登録です。"}</p>
      {account?.issuer?.company_name ? <div style={{ overflowWrap: "anywhere" }}><h3>請求書・領収書の発行元</h3><p>{account.issuer.company_name}<br />〒{account.issuer.postal_code}<br />{account.issuer.address}<br />電話番号：{account.issuer.phone}<br />適格請求書発行事業者登録番号：{account.issuer.registration_number || "未登録"}</p></div> : <p>発行元情報は未登録です。</p>}
      <button type="button" className="system-admin-primary" onClick={() => setEditing(true)}>{account ? "銀行口座・発行元情報を編集" : "銀行口座・発行元情報を入力"}</button></>}
  </section>;
}
