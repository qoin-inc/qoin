"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SystemSettingDraft = {
  monthlyHouseholdPrice: string;
  freePushLimit: string;
  pushUnitPrice: string;
  taxRate: string;
};

type TownRow = {
  id: number | string;
  name: string;
};

type MonthlyBillRow = {
  town: TownRow;
  linkedAccounts: number;
  pushCount: number;
  pushOverage: number;
  subtotal: number;
  tax: number;
  total: number;
  existingBilling?: any;
};

const yen = (value: number) => `¥${Math.round(value || 0).toLocaleString()}`;

const defaultBillingMonth = () => {
  const now = new Date();
  const usageMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${usageMonth.getFullYear()}-${String(usageMonth.getMonth() + 1).padStart(2, "0")}`;
};

const billingMonthRange = (billingMonth: string) => {
  const [yearText, monthText] = billingMonth.split("-");
  const year = Number(yearText) || new Date().getFullYear();
  const monthIndex = (Number(monthText) || 1) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  const invoiceDate = new Date(year, monthIndex + 1, 1);
  return {
    billingMonth,
    label: `${year}年${monthIndex + 1}月`,
    invoiceDate: invoiceDate.toISOString(),
    invoiceDateLabel: `${invoiceDate.getFullYear()}年${invoiceDate.getMonth() + 1}月1日`,
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

const toNumber = (value: string, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const getMemberLinkedAccountCount = (member: any) => {
  if (member.withdrawal_status === "withdrawn" || member.status === "withdrawn") return 0;
  return [member.user_auth_id, member.family_user_auth_id_1, member.family_user_auth_id_2].filter(Boolean).length;
};

const missingColumnFromError = (error: any) => {
  const message = String(error?.message || "");
  const quoted = message.match(/'([^']+)' column/);
  if (quoted?.[1]) return quoted[1];
  const plain = message.match(/column ["']?([a-zA-Z0-9_]+)["']?/);
  return plain?.[1] || "";
};

export default function SystemAdminView() {
  const [towns, setTowns] = useState<TownRow[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [pushes, setPushes] = useState<any[]>([]);
  const [billings, setBillings] = useState<any[]>([]);
  const [selectedBillingMonth, setSelectedBillingMonth] = useState(defaultBillingMonth());
  const [draft, setDraft] = useState<SystemSettingDraft>({
    monthlyHouseholdPrice: "0",
    freePushLimit: "0",
    pushUnitPrice: "0",
    taxRate: "10",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState("");

  const month = useMemo(() => billingMonthRange(selectedBillingMonth), [selectedBillingMonth]);

  const fetchSystemData = async () => {
    setLoading(true);
    setMessage("");
    try {
      const [townRows, settingRows, memberRows, pushRows, billingRows] = await Promise.all([
        supabase.from("neighborhoods").select("id,name").order("id", { ascending: false }).limit(1000),
        supabase.from("system_settings").select("*").limit(1000),
        supabase.from("resident_rosters").select("id,neighborhood_id,status,withdrawal_status,user_auth_id,family_user_auth_id_1,family_user_auth_id_2").limit(20000),
        supabase
          .from("circulars")
          .select("id,neighborhood_id,created_at,is_pushed")
          .eq("is_pushed", true)
          .gte("created_at", month.start)
          .lt("created_at", month.end)
          .limit(20000),
        supabase.from("system_usage_billings").select("*").eq("billing_month", month.billingMonth).limit(1000),
      ]);

      if (townRows.error) throw townRows.error;
      if (settingRows.error) throw settingRows.error;

      const nextTowns = (townRows.data || []).map((town: any) => ({
        id: town.id,
        name: town.name || `町内会 #${town.id}`,
      }));
      const nextSettings = settingRows.data || [];
      setTowns(nextTowns);
      setSettings(nextSettings);
      setMembers(memberRows.data || []);
      setPushes(pushRows.data || []);
      setBillings(billingRows.data || []);

      const baseSetting = nextSettings[0] || {};
      setDraft({
        monthlyHouseholdPrice: String(baseSetting.monthly_household_price ?? baseSetting.monthly_account_price ?? 0),
        freePushLimit: String(baseSetting.free_push_limit ?? 0),
        pushUnitPrice: String(baseSetting.push_unit_price ?? 0),
        taxRate: String(baseSetting.tax_rate ?? baseSetting.consumption_tax_rate ?? 10),
      });
    } catch (error: any) {
      setMessage(error?.message || "システム管理情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, [month.start, month.end]);

  const settingByTownId = useMemo(() => {
    return new Map(settings.map((setting) => [String(setting.neighborhood_id), setting]));
  }, [settings]);
  const billingByTownId = useMemo(() => {
    return new Map(billings.map((billing) => [String(billing.neighborhood_id), billing]));
  }, [billings]);

  const unit = toNumber(draft.monthlyHouseholdPrice);
  const freePushLimit = toNumber(draft.freePushLimit);
  const pushUnitPrice = toNumber(draft.pushUnitPrice);
  const taxRate = toNumber(draft.taxRate, 10);

  const monthlyRows: MonthlyBillRow[] = towns.map((town) => {
    const setting = settingByTownId.get(String(town.id)) || {};
    const townUnit = Number(setting.monthly_household_price ?? unit);
    const townFreePushLimit = Number(setting.free_push_limit ?? freePushLimit);
    const townPushUnitPrice = Number(setting.push_unit_price ?? pushUnitPrice);
    const townTaxRate = Number(setting.tax_rate ?? setting.consumption_tax_rate ?? taxRate);
    const linkedAccounts = members
      .filter((member) => String(member.neighborhood_id) === String(town.id))
      .reduce((sum, member) => sum + getMemberLinkedAccountCount(member), 0);
    const pushCount = pushes.filter((push) => String(push.neighborhood_id) === String(town.id)).length;
    const pushOverage = Math.max(pushCount - townFreePushLimit, 0);
    const subtotal = linkedAccounts * townUnit + pushOverage * townPushUnitPrice;
    const tax = Math.round(subtotal * (townTaxRate / 100));
    const existingBilling = billingByTownId.get(String(town.id));
    return {
      town,
      linkedAccounts,
      pushCount,
      pushOverage,
      subtotal,
      tax,
      total: subtotal + tax,
      existingBilling,
    };
  });

  const totals = monthlyRows.reduce(
    (sum, row) => ({
      linkedAccounts: sum.linkedAccounts + row.linkedAccounts,
      pushCount: sum.pushCount + row.pushCount,
      subtotal: sum.subtotal + row.subtotal,
      tax: sum.tax + row.tax,
      total: sum.total + row.total,
    }),
    { linkedAccounts: 0, pushCount: 0, subtotal: 0, tax: 0, total: 0 },
  );

  const updateDraft = (field: keyof SystemSettingDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage("");
  };

  const settingPayload = (townId: number | string) => ({
    neighborhood_id: townId,
    monthly_household_price: unit,
    free_push_limit: freePushLimit,
    push_unit_price: pushUnitPrice,
    tax_rate: taxRate,
    updated_at: new Date().toISOString(),
  });

  const saveSettingForTown = async (town: TownRow) => {
    let payload: Record<string, any> = settingPayload(town.id);
    const existing = settingByTownId.get(String(town.id));

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const result = existing?.id
        ? await supabase.from("system_settings").update(payload).eq("id", existing.id).select("*").maybeSingle()
        : await supabase.from("system_settings").insert(payload).select("*").single();

      if (!result.error) return result.data || payload;

      const missingColumn = missingColumnFromError(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
        delete payload[missingColumn];
        continue;
      }

      throw result.error;
    }

    throw new Error("システム設定の保存に失敗しました。");
  };

  const handleSaveSettings = async () => {
    if ([unit, freePushLimit, pushUnitPrice, taxRate].some((value) => !Number.isFinite(value) || value < 0)) {
      setMessage("単価、無料枠、消費税率は0以上の数値で入力してください。");
      return;
    }
    if (!towns.length) {
      setMessage("反映対象の町内会・自治会がありません。");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const savedRows: any[] = [];
      for (const town of towns) {
        savedRows.push(await saveSettingForTown(town));
      }
      setSettings(savedRows);
      setMessage(`${savedRows.length.toLocaleString()}件の町内会・自治会へシステム利用料設定を反映しました。`);
    } catch (error: any) {
      setMessage(error?.message || "システム利用料設定の保存に失敗しました。追加SQLの適用状況を確認してください。");
    } finally {
      setSaving(false);
    }
  };

  const handleIssueMonthlyBills = async () => {
    if (!monthlyRows.length) {
      setMessage("請求対象がありません。");
      return;
    }

    setIssuing(true);
    setMessage("");
    try {
      let issuedCount = 0;
      let skippedPaidCount = 0;

      for (const row of monthlyRows) {
        const isPaid = row.existingBilling?.status === "paid" || row.existingBilling?.paid_at;
        if (isPaid) {
          skippedPaidCount += 1;
          continue;
        }

        const invoiceNumber = row.existingBilling?.invoice_number || `SYS-${month.billingMonth.replace("-", "")}-${row.town.id}`;
        const payload = {
          neighborhood_id: row.town.id,
          billing_month: month.billingMonth,
          invoice_number: invoiceNumber,
          linked_account_count: row.linkedAccounts,
          push_count: row.pushCount,
          free_push_limit: freePushLimit,
          push_overage_count: row.pushOverage,
          monthly_household_price: unit,
          push_unit_price: pushUnitPrice,
          subtotal_amount: row.subtotal,
          tax_rate: taxRate,
          tax_amount: row.tax,
          total_amount: row.total,
          status: "billed",
          billed_at: row.existingBilling?.billed_at || new Date().toISOString(),
          invoice_issued_at: row.existingBilling?.invoice_issued_at || month.invoiceDate,
          due_date: row.existingBilling?.due_date || month.invoiceDate,
          updated_at: new Date().toISOString(),
        };

        const result = await supabase.from("system_usage_billings").upsert(payload, { onConflict: "neighborhood_id,billing_month" });
        if (result.error) throw result.error;
        issuedCount += 1;
      }
      await fetchSystemData();
      setMessage(`${month.label}分のシステム利用料請求を${issuedCount.toLocaleString()}件確定しました。${skippedPaidCount ? ` 入金済み${skippedPaidCount.toLocaleString()}件は変更していません。` : ""}`);
    } catch (error: any) {
      setMessage(error?.message || "月次請求の確定に失敗しました。追加SQLでsystem_usage_billingsを作成してください。");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <main className="system-admin-screen">
      <section className="system-admin-hero">
        <div>
          <p className="el-kicker">el-town システム管理</p>
          <h1>システム利用料設定</h1>
          <p>接続数単価、プッシュ超過単価、消費税率を設定し、月ごとの請求額を翌月1日付で確定します。</p>
        </div>
        <button type="button" onClick={fetchSystemData} disabled={loading || saving || issuing}>
          <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-rotate-right"}`} />
          <span>再読込</span>
        </button>
      </section>

      <section className="system-admin-grid">
        <section className="system-admin-card">
          <div className="system-admin-heading">
            <div>
              <h2>料金単価</h2>
              <p>保存すると、全町内会・自治会のシステム利用料計算に反映します。</p>
            </div>
          </div>
          <div className="system-admin-form">
            <label>
              <span>請求対象月</span>
              <input type="month" value={selectedBillingMonth} onChange={(event) => setSelectedBillingMonth(event.target.value)} />
            </label>
            <label>
              <span>接続数1件あたり単価</span>
              <input value={draft.monthlyHouseholdPrice} onChange={(event) => updateDraft("monthlyHouseholdPrice", event.target.value)} inputMode="numeric" />
            </label>
            <label>
              <span>無料プッシュ件数</span>
              <input value={draft.freePushLimit} onChange={(event) => updateDraft("freePushLimit", event.target.value)} inputMode="numeric" />
            </label>
            <label>
              <span>プッシュ超過単価</span>
              <input value={draft.pushUnitPrice} onChange={(event) => updateDraft("pushUnitPrice", event.target.value)} inputMode="numeric" />
            </label>
            <label>
              <span>消費税率</span>
              <input value={draft.taxRate} onChange={(event) => updateDraft("taxRate", event.target.value)} inputMode="decimal" />
            </label>
          </div>
          <div className="system-admin-actions">
            <button type="button" onClick={handleSaveSettings} disabled={saving || issuing || loading}>
              <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} />
              <span>{saving ? "保存中" : "全町内会へ反映"}</span>
            </button>
          </div>
          {message && (
            <div className={`admin-basic-message ${message.includes("失敗") || message.includes("確認") || message.includes("ありません") ? "error" : "success"}`}>
              {message}
            </div>
          )}
        </section>

        <section className="system-admin-card accent">
          <h2>{month.label} 利用分</h2>
          <p className="admin-basic-note">請求日 {month.invoiceDateLabel}</p>
          <div className="system-admin-metrics">
            <span><strong>{totals.linkedAccounts.toLocaleString()}</strong>接続数</span>
            <span><strong>{totals.pushCount.toLocaleString()}</strong>プッシュ件数</span>
            <span><strong>{yen(totals.subtotal)}</strong>税抜</span>
            <span><strong>{yen(totals.tax)}</strong>消費税</span>
            <span><strong>{yen(totals.total)}</strong>税込請求額</span>
          </div>
          <button className="system-admin-primary" type="button" onClick={handleIssueMonthlyBills} disabled={issuing || saving || loading}>
            <i className={`fas ${issuing ? "fa-spinner fa-spin" : "fa-file-invoice-dollar"}`} />
            <span>{issuing ? "確定中" : `${month.label}利用分を請求確定`}</span>
          </button>
        </section>
      </section>

      <section className="system-admin-card">
        <div className="system-admin-heading">
          <div>
            <h2>町内会・自治会別 請求計算</h2>
            <p>接続数は本人・家族アカウントのLINE連携数で計算します。無料枠を超えたプッシュ件数に超過単価を掛け、翌月1日付の請求として月ごとに保存します。</p>
          </div>
          <span>{monthlyRows.length.toLocaleString()}件</span>
        </div>
        <div className="system-admin-table">
          <div className="system-admin-row system-admin-head">
            <span>町内会・自治会</span>
            <span>接続数</span>
            <span>プッシュ</span>
            <span>超過</span>
            <span>税抜</span>
            <span>消費税</span>
            <span>税込</span>
            <span>状態</span>
          </div>
          {(monthlyRows.length ? monthlyRows : [{ town: { id: "empty", name: "町内会・自治会がありません" }, linkedAccounts: 0, pushCount: 0, pushOverage: 0, subtotal: 0, tax: 0, total: 0 }]).map((row) => (
            <div key={row.town.id} className="system-admin-row">
              <span><strong>{row.town.name}</strong><small>ID: {row.town.id}</small></span>
              <span>{row.linkedAccounts.toLocaleString()}</span>
              <span>{row.pushCount.toLocaleString()}</span>
              <span>{row.pushOverage.toLocaleString()}</span>
              <span>{yen(row.subtotal)}</span>
              <span>{yen(row.tax)}</span>
              <span><strong>{yen(row.total)}</strong></span>
              <span>{row.existingBilling?.status === "paid" || row.existingBilling?.paid_at ? "入金済み" : row.existingBilling ? "請求済み" : "未確定"}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
