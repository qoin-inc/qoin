"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminView from "@/components/AdminView";

type Tab = "towns" | "billing";
type Town = { id: string | number; name: string; created_at?: string | null };
type Draft = { monthlyHouseholdPrice: string; freePushLimit: string; pushUnitPrice: string; taxRate: string };

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
  return { label: `${year}年${month}月`, start: start.toISOString(), end: end.toISOString(), invoice: `${year}年${month + 1}月1日` };
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
  const [billingMonth, setBillingMonth] = useState(previousMonth());
  const [draft, setDraft] = useState<Draft>({ monthlyHouseholdPrice: "0", freePushLimit: "0", pushUnitPrice: "0", taxRate: "10" });
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
    ]);
    const fatal = results[0].error || results[1].error;
    if (fatal) setMessage(fatal.message);
    setTowns((results[0].data || []) as Town[]);
    setMembers(results[1].data || []);
    setAdmins(results[2].data || []);
    setPushes(results[3].data || []);
    setSettings(results[4].data || []);
    setBillings(results[5].data || []);
    const base = results[4].data?.[0] || {};
    setDraft({
      monthlyHouseholdPrice: String(base.monthly_household_price ?? 0),
      freePushLimit: String(base.free_push_limit ?? 0),
      pushUnitPrice: String(base.push_unit_price ?? 0),
      taxRate: String(base.tax_rate ?? base.consumption_tax_rate ?? 10),
    });
    setLoading(false);
  };

  useEffect(() => { if (authenticated) load(); }, [authenticated, month.start, month.end]);

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
    return { ...row, pushCount, overage, subtotal, tax, total: subtotal + tax, billing: billings.find((item) => String(item.neighborhood_id) === String(row.town.id)) };
  }), [townRows, settings, draft, pushes, billings]);

  const totals = billingRows.reduce((sum, row) => ({ linked: sum.linked + row.linked, pushes: sum.pushes + row.pushCount, subtotal: sum.subtotal + row.subtotal, tax: sum.tax + row.tax, total: sum.total + row.total }), { linked: 0, pushes: 0, subtotal: 0, tax: 0, total: 0 });

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
      for (const table of ["system_usage_billings", "system_settings", "resident_rosters", "neighborhood_admins", "circulars"]) {
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
      <section className="system-admin-hero"><div><p className="el-kicker">el-town システム管理</p><h1>{tab === "towns" ? "町内会・自治会管理" : "システム利用料設定"}</h1><p>{tab === "towns" ? "登録団体の状況確認、管理画面の照査、完全削除を行います。" : "接続数単価、プッシュ超過単価、消費税率と月次請求を管理します。"}</p></div><div className="system-admin-hero-actions"><button onClick={load} disabled={loading || busy}>再読込</button><button onClick={logout}>ログアウト</button></div></section>
      <nav className="system-admin-tabs"><button className={tab === "towns" ? "active" : ""} onClick={() => setTab("towns")}>町内会・自治会管理</button><button className={tab === "billing" ? "active" : ""} onClick={() => setTab("billing")}>システム利用料設定</button></nav>
      {message && <div className="system-admin-message">{message}</div>}

      {tab === "towns" ? <>
        <section className="system-admin-card"><div className="system-admin-heading"><div><h2>登録団体一覧</h2><p>「照査」で登録状況を確認し、「管理画面」で各団体の管理画面を開けます。</p></div><span>{townRows.length}件</span></div>
          <div className="system-town-table"><div className="system-town-row head"><span>町内会・自治会</span><span>名簿</span><span>LINE連携</span><span>役員</span><span>操作</span></div>{townRows.map((row) => <div className="system-town-row" key={row.town.id}><span><strong>{row.town.name}</strong><small>ID: {row.town.id}</small></span><span>{row.rosterCount}名</span><span>{row.linked}件</span><span>{row.adminCount}名</span><span className="system-town-actions"><button onClick={() => setSelectedTown(row.town)}>照査</button><button onClick={() => setManagingTown(row.town)}>管理画面</button><button className="danger" onClick={() => deleteTown(row.town)} disabled={busy}>完全削除</button></span></div>)}</div>
        </section>
        {selectedTown && <div className="system-town-modal" role="dialog" aria-modal="true"><section><button className="close" onClick={() => setSelectedTown(null)}>×</button><p className="el-kicker">登録内容の照査</p><h2>{selectedTown.name}</h2><dl><div><dt>団体ID</dt><dd>{selectedTown.id}</dd></div><div><dt>名簿登録</dt><dd>{townRows.find((row) => row.town.id === selectedTown.id)?.rosterCount || 0}名</dd></div><div><dt>LINE連携</dt><dd>{townRows.find((row) => row.town.id === selectedTown.id)?.linked || 0}件</dd></div><div><dt>役員</dt><dd>{townRows.find((row) => row.town.id === selectedTown.id)?.adminCount || 0}名</dd></div></dl><button className="system-admin-primary" onClick={() => { setManagingTown(selectedTown); setSelectedTown(null); }}>管理画面を開く</button></section></div>}
      </> : <>
        <section className="system-admin-grid"><section className="system-admin-card"><h2>料金単価</h2><div className="system-admin-form"><label><span>請求対象月</span><input type="month" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} /></label><label><span>接続数1件あたり単価</span><input value={draft.monthlyHouseholdPrice} onChange={(e) => setDraft({ ...draft, monthlyHouseholdPrice: e.target.value })} /></label><label><span>無料プッシュ件数</span><input value={draft.freePushLimit} onChange={(e) => setDraft({ ...draft, freePushLimit: e.target.value })} /></label><label><span>プッシュ超過単価</span><input value={draft.pushUnitPrice} onChange={(e) => setDraft({ ...draft, pushUnitPrice: e.target.value })} /></label><label><span>消費税率</span><input value={draft.taxRate} onChange={(e) => setDraft({ ...draft, taxRate: e.target.value })} /></label></div><div className="system-admin-actions"><button onClick={saveSettings} disabled={busy}>全町内会へ反映</button></div></section>
        <section className="system-admin-card accent"><h2>{month.label} 利用分</h2><p>請求日 {month.invoice}</p><div className="system-admin-metrics"><span><strong>{totals.linked}</strong>接続数</span><span><strong>{totals.pushes}</strong>プッシュ件数</span><span><strong>{yen(totals.subtotal)}</strong>税抜</span><span><strong>{yen(totals.tax)}</strong>消費税</span><span><strong>{yen(totals.total)}</strong>税込請求額</span></div></section></section>
        <section className="system-admin-card"><div className="system-admin-heading"><div><h2>町内会・自治会別 請求計算</h2><p>団体ごとの接続数とプッシュ件数から請求額を計算します。</p></div><span>{billingRows.length}件</span></div><div className="system-admin-table"><div className="system-admin-row system-admin-head"><span>町内会・自治会</span><span>接続数</span><span>プッシュ</span><span>超過</span><span>税抜</span><span>消費税</span><span>税込</span><span>状態</span></div>{billingRows.map((row) => <div className="system-admin-row" key={row.town.id}><span><strong>{row.town.name}</strong><small>ID: {row.town.id}</small></span><span>{row.linked}</span><span>{row.pushCount}</span><span>{row.overage}</span><span>{yen(row.subtotal)}</span><span>{yen(row.tax)}</span><span><strong>{yen(row.total)}</strong></span><span>{row.billing ? "請求済み" : "未確定"}</span></div>)}</div></section>
      </>}
    </main>
  );
}
