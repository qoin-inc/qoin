"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminView from "@/components/AdminView";
import SystemUsageBankAccountPanel from "@/components/SystemUsageBankAccountPanel";
import PayPayApprovalPanel from "@/components/PayPayApprovalPanel";

type Tab = "towns" | "feeStandards" | "billing" | "paypay";
type Town = { id: string | number; name: string; created_at?: string | null };
type Draft = { monthlyHouseholdPrice: string; freePushLimit: string; pushUnitPrice: string; taxRate: string };
type FeeStandardDraft = {
  feeName: string;
  amount: string;
  cashEnabled: boolean;
  stripeCardEnabled: boolean;
  revenueCategory: string;
  changeReason: string;
};

const yen = (value: number) => `¥${Math.round(value || 0).toLocaleString()}`;
const previousMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const monthInfo = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { label: `${year}年${month}月`, start: start.toISOString(), end: end.toISOString(), invoice: `${end.getFullYear()}年${end.getMonth() + 1}月1日` };
};
const linkedCount = (row: any) => row.withdrawal_status === "withdrawn" ? 0 : [
  row.user_auth_id,
  row.family_withdrawal_status_1 === "withdrawn" ? null : row.family_user_auth_id_1,
  row.family_withdrawal_status_2 === "withdrawn" ? null : row.family_user_auth_id_2,
].filter(Boolean).length;
const isMissingRelationError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "PGRST205" || message.includes("schema cache") || message.includes("does not exist");
};

export default function SystemAdminView() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("towns");
  const [towns, setTowns] = useState<Town[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [pushes, setPushes] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [billings, setBillings] = useState<any[]>([]);
  const [paymentProfiles, setPaymentProfiles] = useState<any[]>([]);
  const [feeStandards, setFeeStandards] = useState<any[]>([]);
  const [feeSettings, setFeeSettings] = useState<any[]>([]);
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [manualBillingEnabled, setManualBillingEnabled] = useState(false);
  const [billingMonth, setBillingMonth] = useState(previousMonth());
  const [draft, setDraft] = useState<Draft>({ monthlyHouseholdPrice: "0", freePushLimit: "0", pushUnitPrice: "0", taxRate: "10" });
  const [feeStandardDraft, setFeeStandardDraft] = useState<FeeStandardDraft>({
    feeName: "年会費",
    amount: "3000",
    cashEnabled: true,
    stripeCardEnabled: true,
    revenueCategory: "会費",
    changeReason: "",
  });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTown, setSelectedTown] = useState<Town | null>(null);
  const [managingTown, setManagingTown] = useState<Town | null>(null);

  const month = useMemo(() => monthInfo(billingMonth), [billingMonth]);

  const applySystemSupabaseSession = async (data: any) => {
    if (!data?.accessToken || !data?.refreshToken) throw new Error("system管理者のDBセッションを確認できませんでした。");
    const { error } = await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });
    if (error) throw error;
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await fetch("/api/system/session");
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.authenticated) throw new Error(data.error || "system管理者セッションを確認できませんでした。");
        await applySystemSupabaseSession(data);
        setAuthenticated(true);
      } catch (error: any) {
        setLoginError(error?.message || "system管理者セッションを確認できませんでした。");
        setAuthenticated(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/system/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ loginId, password }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setLoginError(data.error || "ログインできませんでした。");
    try {
      await applySystemSupabaseSession(data);
    } catch (error: any) {
      return setLoginError(error?.message || "system管理者のDBセッションを作成できませんでした。");
    }
    setAuthenticated(true);
    setPassword("");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/system/session", { method: "DELETE" });
    setAuthenticated(false);
  };

  const load = async () => {
    setLoading(true);
    setMessage("");
    const results = await Promise.all([
      supabase.from("neighborhoods").select("id,name,created_at").order("id", { ascending: false }).limit(1000),
      supabase.from("resident_rosters").select("id,neighborhood_id,withdrawal_status,user_auth_id,family_user_auth_id_1,family_user_auth_id_2,family_withdrawal_status_1,family_withdrawal_status_2").limit(20000),
      supabase.from("neighborhood_admins").select("id,neighborhood_id,status,admin_email").limit(5000),
      supabase.from("circulars").select("id,neighborhood_id,created_at,is_pushed").eq("is_pushed", true).gte("created_at", month.start).lt("created_at", month.end).limit(20000),
      supabase.from("system_settings").select("*").limit(1000),
      supabase.from("system_usage_billings").select("*").eq("billing_month", billingMonth).limit(1000),
      supabase.from("system_usage_payment_profiles").select("*").limit(1000),
      supabase.from("membership_fee_standard_versions").select("*").order("version_number", { ascending: false }).limit(100),
      supabase.from("neighborhood_fee_settings").select("*").limit(1000),
    ]);
    const fatal = results[0].error || results[1].error;
    if (fatal) setMessage(fatal.message);
    setTowns((results[0].data || []) as Town[]);
    setMembers(results[1].data || []);
    setAdmins(results[2].data || []);
    setPushes(results[3].data || []);
    setSettings(results[4].data || []);
    setBillings(results[5].data || []);
    setPaymentProfiles(results[6].data || []);
    setFeeStandards(results[7].data || []);
    setFeeSettings(results[8].data || []);
    const base = results[4].data?.[0] || {};
    setDraft({
      monthlyHouseholdPrice: String(base.monthly_household_price ?? 0),
      freePushLimit: String(base.free_push_limit ?? 0),
      pushUnitPrice: String(base.push_unit_price ?? 0),
      taxRate: String(base.tax_rate ?? base.consumption_tax_rate ?? 10),
    });
    const publishedStandard = (results[7].data || []).find((item: any) => item.status === "published");
    if (publishedStandard) {
      setFeeStandardDraft({
        feeName: String(publishedStandard.fee_name || "年会費"),
        amount: String(publishedStandard.default_amount ?? 3000),
        cashEnabled: publishedStandard.cash_enabled !== false,
        stripeCardEnabled: publishedStandard.stripe_card_enabled !== false,
        revenueCategory: String(publishedStandard.revenue_category || "会費"),
        changeReason: "",
      });
    }
    setLoading(false);
  };

  const confirmBankPayment = async (billing: any) => {
    if (!window.confirm(`${billing.billing_month}利用分 ${yen(Number(billing.total_amount))}の銀行口座への入金を確認済みですか？全額入金済みとして登録します。`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/system-usage/confirm-bank-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ billingId: billing.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "入金登録に失敗しました。");
      await load();
      setMessage("銀行口座への入金を登録しました。");
    } catch (error: any) { setMessage(error.message); } finally { setBusy(false); }
  };

  const loadBillingStatus = async () => {
    try {
      const response = await fetch("/api/system-usage/billing-run");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "請求機能の状態を取得できませんでした。");
      setBillingEnabled(Boolean(data.enabled));
      setManualBillingEnabled(Boolean(data.manualEnabled));
    } catch (error: any) {
      setManualBillingEnabled(false);
      setMessage(error.message || "請求機能の状態を取得できませんでした。再読み込みしてください。");
    }
  };

  useEffect(() => {
    if (authenticated) {
      void load();
      void loadBillingStatus();
    }
  }, [authenticated, month.start, month.end]);

  const townRows = useMemo(() => towns.map((town) => {
    const townMembers = members.filter((row) => String(row.neighborhood_id) === String(town.id));
    const townAdmins = admins.filter((row) => String(row.neighborhood_id) === String(town.id) && row.status !== "retired" && row.status !== "rejected");
    return { town, rosterCount: townMembers.length, linked: townMembers.reduce((sum, row) => sum + linkedCount(row), 0), adminCount: townAdmins.length };
  }), [towns, members, admins]);

  const billingRows = useMemo(() => townRows.map((row) => {
    const setting = settings.find((item) => String(item.neighborhood_id) === String(row.town.id)) || {};
    const unit = Number(setting.monthly_household_price ?? draft.monthlyHouseholdPrice) || 0;
    const free = Number(setting.free_push_limit ?? draft.freePushLimit) || 0;
    const pushUnit = Number(setting.push_unit_price ?? draft.pushUnitPrice) || 0;
    const taxRate = Number(setting.tax_rate ?? draft.taxRate) || 0;
    const pushCount = pushes.filter((item) => String(item.neighborhood_id) === String(row.town.id)).length;
    const overage = Math.max(pushCount - free, 0);
    const subtotal = row.linked * unit + overage * pushUnit;
    const tax = Math.round(subtotal * taxRate / 100);
    return {
      ...row,
      pushCount,
      overage,
      subtotal,
      tax,
      total: subtotal + tax,
      billing: billings.find((item) => String(item.neighborhood_id) === String(row.town.id)),
      paymentProfile: paymentProfiles.find((item) => String(item.neighborhood_id) === String(row.town.id)),
    };
  }), [townRows, settings, draft, pushes, billings, paymentProfiles]);

  const totals = billingRows.reduce((sum, row) => ({ linked: sum.linked + row.linked, pushes: sum.pushes + row.pushCount, subtotal: sum.subtotal + row.subtotal, tax: sum.tax + row.tax, total: sum.total + row.total }), { linked: 0, pushes: 0, subtotal: 0, tax: 0, total: 0 });
  const publishedFeeStandard = feeStandards.find((item) => item.status === "published");
  const feeConfiguredTownCount = feeSettings.length;

  const publishFeeStandard = async () => {
    const amount = Number(feeStandardDraft.amount);
    if (!feeStandardDraft.feeName.trim()) return setMessage("会費名称を入力してください。");
    if (!Number.isInteger(amount) || amount < 0) return setMessage("標準会費額は0円以上の整数で入力してください。");
    if (!feeStandardDraft.revenueCategory.trim()) return setMessage("会費収入科目を入力してください。");
    if (!feeStandardDraft.changeReason.trim()) return setMessage("変更理由を入力してください。");

    const summary = `${feeStandardDraft.feeName} ${yen(amount)}／年1回`;
    if (!window.confirm(`${summary} を新しい標準設定として公開します。既存の請求・入金実績は変更しません。よろしいですか？`)) return;

    setBusy(true);
    setMessage("");
    try {
      const nextVersion = Math.max(0, ...feeStandards.map((item) => Number(item.version_number) || 0)) + 1;
      const insertResult = await supabase
        .from("membership_fee_standard_versions")
        .insert({
          version_number: nextVersion,
          status: "draft",
          fee_name: feeStandardDraft.feeName.trim(),
          default_amount: amount,
          billing_frequency: "annual",
          billing_target: "active_households",
          cash_enabled: feeStandardDraft.cashEnabled,
          stripe_card_enabled: feeStandardDraft.stripeCardEnabled,
          revenue_category: feeStandardDraft.revenueCategory.trim(),
          change_reason: feeStandardDraft.changeReason.trim(),
        })
        .select("id")
        .single();
      if (insertResult.error) throw insertResult.error;

      const publishResult = await supabase.rpc("publish_membership_fee_standard", { p_version_id: insertResult.data.id });
      if (publishResult.error) throw publishResult.error;

      setMessage(`会費標準設定 v${nextVersion} を公開しました。新規の町内会・自治会には登録時に自動適用されます。`);
      setFeeStandardDraft((current) => ({ ...current, changeReason: "" }));
      await load();
    } catch (error: any) {
      setMessage(error?.message || "会費標準設定を公開できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    setBusy(true); setMessage("");
    try {
      for (const town of towns) {
        const payload = { neighborhood_id: town.id, monthly_household_price: Number(draft.monthlyHouseholdPrice), free_push_limit: Number(draft.freePushLimit), push_unit_price: Number(draft.pushUnitPrice), tax_rate: Number(draft.taxRate), updated_at: new Date().toISOString() };
        const result = await supabase.from("system_settings").upsert(payload, { onConflict: "neighborhood_id" });
        if (result.error) throw result.error;
      }
      setMessage(`${towns.length}件の町内会・自治会へ料金設定を反映しました。`);
      await load();
    } catch (error: any) { setMessage(error.message || "料金設定を保存できませんでした。"); }
    finally { setBusy(false); }
  };

  const runSystemUsageBilling = async (mode: "snapshot" | "invoice") => {
    const label = mode === "snapshot" ? "現在の接続数を確定" : "請求書を発行";
    if (mode === "invoice") {
      const typed = window.prompt(`${billingMonth}利用分の${billingEnabled ? "本番" : "銀行口座振込の"}請求書を発行します。${billingEnabled ? "" : "カード決済は行いません。"}確認のため「${billingMonth}」と入力してください。`);
      if (typed !== billingMonth) return;
    } else if (!window.confirm(`${billingMonth}利用分として現在の接続数を保存します。過去の16日時点の人数を復元する処理ではありません。よろしいですか？`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/system-usage/billing-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, billingMonth }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `${label}できませんでした。`);
      const failed = (data.results || []).filter((row: any) => String(row.status).includes("failed")).length;
      const attention = (data.results || []).filter((row: any) => ["payment_method_required", "card_setup_required", "bank_account_required"].includes(row.status)).length;
      const cardSkipped = (data.results || []).filter((row: any) => row.status === "card_billing_disabled").length;
      await load();
      setMessage(`${billingMonth}利用分: ${data.processed || 0}件の町内会・自治会を処理しました。${failed ? ` 失敗${failed}件。` : ""}${attention ? ` 決済設定待ち${attention}件。` : ""}${cardSkipped ? ` カード決済停止のため対象外${cardSkipped}件。` : ""}`);
    } catch (error: any) {
      setMessage(error?.message || `${label}できませんでした。`);
    } finally {
      setBusy(false);
    }
  };

  const deleteTown = async (town: Town) => {
    const typed = window.prompt(`「${town.name}」を完全削除します。取り消せません。確認のため町内会・自治会名を入力してください。`);
    if (typed !== town.name) return typed === null ? undefined : setMessage("名称が一致しないため削除しませんでした。");
    if (!window.confirm(`${town.name} と関連データを完全に削除します。よろしいですか？`)) return;
    setBusy(true); setMessage("");
    try {
      const circularIds = (await supabase.from("circulars").select("id").eq("neighborhood_id", town.id)).data?.map((row) => row.id) || [];
      if (circularIds.length) {
        for (const table of ["event_applications", "read_receipts"]) {
          const result = await supabase.from(table).delete().in("circular_id", circularIds);
          if (result.error && !isMissingRelationError(result.error)) throw result.error;
        }
      }
      for (const table of ["system_usage_billings", "system_settings", "fee_records", "resident_rosters", "neighborhood_admins", "circulars"]) {
        const result = await supabase.from(table).delete().eq("neighborhood_id", town.id);
        if (result.error && !isMissingRelationError(result.error)) throw result.error;
      }
      const result = await supabase.from("neighborhoods").delete().eq("id", town.id);
      if (result.error) throw result.error;
      setSelectedTown(null);
      setMessage(`${town.name}を完全削除しました。`);
      await load();
    } catch (error: any) { setMessage(error.message || "削除できませんでした。"); }
    finally { setBusy(false); }
  };

  if (authenticated === null) return <main className="system-admin-screen"><section className="system-admin-card">認証状態を確認しています…</section></main>;
  if (!authenticated) return (
    <main className="system-admin-login">
      <form onSubmit={login} className="system-admin-login-card">
        <p className="el-kicker">el-town システム管理</p><h1>システム管理ログイン</h1>
        <label><span>ログインID</span><input value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" required /></label>
        <label><span>パスワード</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {loginError && <p className="system-admin-error">{loginError}</p>}
        <button type="submit">ログイン</button>
      </form>
    </main>
  );

  if (managingTown) return (
    <main className="system-admin-screen">
      <button className="system-admin-back" type="button" onClick={() => setManagingTown(null)}>← 町内会・自治会管理へ戻る</button>
      <AdminView townId={Number(managingTown.id)} townName={managingTown.name} />
    </main>
  );

  return (
    <main className="system-admin-screen">
      <section className="system-admin-hero"><div><p className="el-kicker">el-town システム管理</p><h1>{tab === "towns" ? "町内会・自治会管理" : tab === "feeStandards" ? "会費標準設定" : tab === "paypay" ? "PayPay申請承認" : "システム利用料設定"}</h1><p>{tab === "towns" ? "登録済み町内会・自治会の状況確認、管理画面の照査、完全削除を行います。" : tab === "feeStandards" ? "町内会・自治会が会員世帯へ請求する会費の初期値を版管理します。" : tab === "paypay" ? "町内会・自治会から届いたPayPay利用・変更・停止申請を確認します。" : "接続数単価、プッシュ超過単価、消費税率と月次請求を管理します。"}</p></div><div className="system-admin-hero-actions"><button onClick={load} disabled={loading || busy}>再読込</button><button onClick={logout}>ログアウト</button></div></section>
      <nav className="system-admin-tabs"><button className={tab === "towns" ? "active" : ""} onClick={() => setTab("towns")}>町内会・自治会管理</button><button className={tab === "feeStandards" ? "active" : ""} onClick={() => setTab("feeStandards")}>会費標準設定</button><button className={tab === "paypay" ? "active" : ""} onClick={() => setTab("paypay")}>PayPay申請</button><button className={tab === "billing" ? "active" : ""} onClick={() => setTab("billing")}>システム利用料設定</button></nav>
      {message && <div className="system-admin-message">{message}</div>}

      {tab === "towns" && <>
        <section className="system-admin-card"><div className="system-admin-heading"><div><h2>登録済み町内会・自治会一覧</h2><p>「照査」で登録状況を確認し、「管理画面」で各町内会・自治会の管理画面を開けます。</p></div><span>{townRows.length}件</span></div>
          <div className="system-town-table"><div className="system-town-row head"><span>町内会・自治会</span><span>名簿</span><span>LINE連携</span><span>役員</span><span>操作</span></div>{townRows.map((row) => <div className="system-town-row" key={row.town.id}><span><strong>{row.town.name}</strong><small>ID: {row.town.id}</small></span><span>{row.rosterCount}名</span><span>{row.linked}件</span><span>{row.adminCount}名</span><span className="system-town-actions"><button onClick={() => setSelectedTown(row.town)}>照査</button><button onClick={() => setManagingTown(row.town)}>管理画面</button><button className="danger" onClick={() => deleteTown(row.town)} disabled={busy}>完全削除</button></span></div>)}</div>
        </section>
        {selectedTown && <div className="system-town-modal" role="dialog" aria-modal="true"><section><button className="close" onClick={() => setSelectedTown(null)}>×</button><p className="el-kicker">登録内容の照査</p><h2>{selectedTown.name}</h2><dl><div><dt>町内会・自治会ID</dt><dd>{selectedTown.id}</dd></div><div><dt>名簿登録</dt><dd>{townRows.find((row) => row.town.id === selectedTown.id)?.rosterCount || 0}名</dd></div><div><dt>LINE連携</dt><dd>{townRows.find((row) => row.town.id === selectedTown.id)?.linked || 0}件</dd></div><div><dt>役員</dt><dd>{townRows.find((row) => row.town.id === selectedTown.id)?.adminCount || 0}名</dd></div></dl><button className="system-admin-primary" onClick={() => { setManagingTown(selectedTown); setSelectedTown(null); }}>管理画面を開く</button></section></div>}
      </>}

      {tab === "feeStandards" && <>
        <section className="system-admin-grid">
          <section className="system-admin-card accent">
            <p className="el-kicker">現在の公開設定</p>
            <h2>{publishedFeeStandard ? `v${publishedFeeStandard.version_number} ${publishedFeeStandard.fee_name}` : "DB設定を確認してください"}</h2>
            {publishedFeeStandard ? <>
              <div className="system-admin-metrics">
                <span><strong>{yen(Number(publishedFeeStandard.default_amount))}</strong>1世帯・年額</span>
                <span><strong>基本情報</strong>決算月を使用</span>
                <span><strong>{publishedFeeStandard.cash_enabled ? "利用可" : "利用不可"}</strong>手集金</span>
                <span><strong>{publishedFeeStandard.stripe_card_enabled ? "利用可" : "利用不可"}</strong>Stripeカード</span>
              </div>
              <p>{feeConfiguredTownCount} / {towns.length}件の町内会・自治会に会費設定があります。公開済み設定は既存の請求・入金実績を変更しません。</p>
            </> : <p>会費標準設定SQLを本番DBへ適用すると、初期標準設定が表示されます。</p>}
          </section>

          <section className="system-admin-card">
            <h2>新しい標準版を公開</h2>
            <p>公開すると今後の新規の町内会・自治会へ自動コピーされます。既存の町内会・自治会への一括上書きは行いません。</p>
            <div className="system-admin-form">
              <label><span>会費名称</span><input value={feeStandardDraft.feeName} onChange={(e) => setFeeStandardDraft({ ...feeStandardDraft, feeName: e.target.value })} /></label>
              <label><span>標準会費額（円／世帯）</span><input type="number" min="0" step="1" value={feeStandardDraft.amount} onChange={(e) => setFeeStandardDraft({ ...feeStandardDraft, amount: e.target.value })} /></label>
              <label><span>請求頻度</span><input value="年1回" readOnly /></label>
              <label><span>請求対象</span><input value="請求作成時点の有効な全会員世帯" readOnly /></label>
              <label><span>会費収入科目</span><input value={feeStandardDraft.revenueCategory} onChange={(e) => setFeeStandardDraft({ ...feeStandardDraft, revenueCategory: e.target.value })} /></label>
              <label><span>変更理由</span><input value={feeStandardDraft.changeReason} onChange={(e) => setFeeStandardDraft({ ...feeStandardDraft, changeReason: e.target.value })} placeholder="例：2027年度の標準額改定" /></label>
              <label><span><input type="checkbox" checked={feeStandardDraft.cashEnabled} onChange={(e) => setFeeStandardDraft({ ...feeStandardDraft, cashEnabled: e.target.checked })} /> 手集金を利用可能にする</span></label>
              <label><span><input type="checkbox" checked={feeStandardDraft.stripeCardEnabled} onChange={(e) => setFeeStandardDraft({ ...feeStandardDraft, stripeCardEnabled: e.target.checked })} /> Stripeカード決済を利用可能にする</span></label>
            </div>
            <div className="system-admin-actions"><button onClick={publishFeeStandard} disabled={busy || !publishedFeeStandard}>新しい標準版として公開</button></div>
          </section>
        </section>

        <section className="system-admin-card">
          <div className="system-admin-heading"><div><h2>標準設定の履歴</h2><p>公開済み版は上書きせず、新しい版として保存します。</p></div><span>{feeStandards.length}版</span></div>
          <div className="system-admin-table">
            <div className="system-admin-row system-admin-head"><span>版</span><span>状態</span><span>名称</span><span>金額</span><span>年度基準</span><span>手集金</span><span>Stripe</span><span>変更理由</span></div>
            {feeStandards.map((item) => <div className="system-admin-row" key={item.id}><span><strong>v{item.version_number}</strong></span><span>{item.status === "published" ? "公開中" : item.status === "retired" ? "廃止" : "下書き"}</span><span>{item.fee_name}</span><span>{yen(Number(item.default_amount))}</span><span>基本情報の決算月</span><span>{item.cash_enabled ? "可" : "不可"}</span><span>{item.stripe_card_enabled ? "可" : "不可"}</span><span>{item.change_reason}</span></div>)}
          </div>
        </section>
      </>}

      {tab === "paypay" && <PayPayApprovalPanel />}

      {tab === "billing" && <>
        <SystemUsageBankAccountPanel />
        <section className="system-admin-grid"><section className="system-admin-card"><h2>料金単価</h2><div className="system-admin-form"><label><span>請求対象月</span><input type="month" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} /></label><label><span>接続数1件あたり単価</span><input value={draft.monthlyHouseholdPrice} onChange={(e) => setDraft({ ...draft, monthlyHouseholdPrice: e.target.value })} /></label><label><span>無料プッシュ件数</span><input value={draft.freePushLimit} onChange={(e) => setDraft({ ...draft, freePushLimit: e.target.value })} /></label><label><span>プッシュ超過単価</span><input value={draft.pushUnitPrice} onChange={(e) => setDraft({ ...draft, pushUnitPrice: e.target.value })} /></label><label><span>消費税率</span><input value={draft.taxRate} onChange={(e) => setDraft({ ...draft, taxRate: e.target.value })} /></label></div><div className="system-admin-actions"><button onClick={saveSettings} disabled={busy}>全町内会へ反映</button></div></section>
        <section className="system-admin-card accent"><h2>{month.label} 利用分</h2><p>定期処理の予定：毎月16日9時に接続数を固定し、{month.invoice} 9時に請求書を発行します。</p>{!billingEnabled && <p className="system-admin-message">定期集計・カード自動決済は停止中です。手動で接続数を確定し、銀行口座振込の請求書を発行できます。</p>}<div className="system-admin-metrics"><span><strong>{totals.linked}</strong>接続数</span><span><strong>{totals.pushes}</strong>プッシュ件数</span><span><strong>{yen(totals.subtotal)}</strong>税抜</span><span><strong>{yen(totals.tax)}</strong>消費税</span><span><strong>{yen(totals.total)}</strong>税込請求額</span></div><div className="system-admin-billing-commands"><button onClick={() => void runSystemUsageBilling("snapshot")} disabled={busy || !manualBillingEnabled}>現在の接続数を手動確定</button><button className="primary" onClick={() => void runSystemUsageBilling("invoice")} disabled={busy || !manualBillingEnabled}>請求書を発行・再処理</button></div></section></section>
        <section className="system-admin-card"><div className="system-admin-heading"><div><h2>町内会・自治会別 請求計算</h2><p>町内会・自治会ごとの接続数とプッシュ件数から請求額を計算します。</p></div><span>{billingRows.length}件</span></div><div className="system-admin-table"><div className="system-admin-row system-admin-head"><span>町内会・自治会</span><span>接続数</span><span>プッシュ</span><span>超過</span><span>税抜</span><span>消費税</span><span>税込</span><span>状態</span></div>{billingRows.map((row) => <div className="system-admin-row" key={row.town.id}><span><strong>{row.town.name}</strong><small>ID: {row.town.id}</small></span><span>{row.billing?.linked_account_count ?? row.linked}</span><span>{row.billing?.push_count ?? row.pushCount}</span><span>{row.billing?.push_overage_count ?? row.overage}</span><span>{yen(Number(row.billing?.subtotal_amount ?? row.subtotal))}</span><span>{yen(Number(row.billing?.tax_amount ?? row.tax))}</span><span><strong>{yen(Number(row.billing?.total_amount ?? row.total))}</strong></span><span><strong>{row.billing ? row.billing.status === "paid" ? "入金済み" : row.billing.stripe_invoice_id ? "Stripe請求済み" : row.billing.status === "draft" ? "16日実績確定" : row.billing.payment_method === "bank_transfer" && row.billing.status === "open" ? "銀行入金待ち" : "処理待ち" : "未確定"}</strong><small>{row.paymentProfile?.payment_method === "card" ? `カード${row.paymentProfile.card_setup_status === "ready" ? "登録済み" : "登録待ち"}` : row.paymentProfile?.payment_method === "bank_transfer" ? "銀行振込" : "決済方法未選択"}</small>{row.billing?.payment_method === "bank_transfer" && row.billing.status === "open" && !row.billing.stripe_invoice_id && <button type="button" disabled={busy || !manualBillingEnabled} onClick={() => void confirmBankPayment(row.billing)}>入金確認済みにする</button>}</span></div>)}</div></section>
      </>}
    </main>
  );
}
