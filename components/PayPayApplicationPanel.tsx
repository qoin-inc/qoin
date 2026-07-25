"use client";

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  townId: number;
  townName: string;
  stripeConnected: boolean;
};

type FormState = {
  seller_name: string;
  representative_name: string;
  postal_code: string;
  address: string;
  phone: string;
  email: string;
  fee_name: string;
  fee_amount: string;
  additional_fees: string;
  payment_methods: string;
  payment_timing: string;
  service_timing: string;
  application_period: string;
  cancellation_refund: string;
  business_hours: string;
};

const initialForm = (townName: string): FormState => ({
  seller_name: townName,
  representative_name: "",
  postal_code: "",
  address: "",
  phone: "",
  email: "",
  fee_name: "年会費",
  fee_amount: "",
  additional_fees: "インターネット接続料金その他の通信費は会員の負担となります。決済手数料は別途請求しません。",
  payment_methods: "クレジットカード、デビットカード、対応プリペイドカード、PayPay",
  payment_timing: "申込時に決済されます。",
  service_timing: "対象年度の町内会・自治会活動および会員向けサービスとして提供します。",
  application_period: "町内会・自治会が案内する会費納入期限まで。",
  cancellation_refund: "会費の性質上、納入後の返金は原則として行いません。ただし、重複決済・誤決済その他団体が相当と認めた場合は個別に対応します。",
  business_hours: "お問い合わせには原則として3営業日以内に返信します。",
});

const statusLabel = (status: string) => ({
  not_requested: "未申請",
  pending: "Stripe審査中",
  active: "利用可能",
  inactive: "利用停止",
  restricted: "追加確認が必要",
}[status] || "未申請");

export default function PayPayApplicationPanel({ townId, townName, stripeConnected }: Props) {
  const [form, setForm] = useState<FormState>(() => initialForm(townName));
  const [goodsType, setGoodsType] = useState<"general" | "digital_content">("general");
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const accessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("管理者ログインを確認できません。");
    return session.access_token;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await accessToken();
      const response = await fetch(`/api/admin/paypay-application?townId=${encodeURIComponent(townId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "申請情報を取得できませんでした。");
      setApplication(data);
      const source = data.request?.status === "pending" && data.request?.request_type !== "disable_paypay"
        ? data.request.requested_payload
        : data.disclosure;
      setForm((current) => ({
        ...current,
        seller_name: source?.seller_name || data.town?.name || townName,
        representative_name: source?.representative_name || current.representative_name,
        postal_code: source?.postal_code || current.postal_code,
        address: source?.address || current.address,
        phone: source?.phone || current.phone,
        email: source?.email || current.email,
        fee_name: source?.fee_name || data.feeSetting?.fee_name || current.fee_name,
        fee_amount: String(source?.fee_amount ?? data.feeSetting?.amount ?? current.fee_amount),
        additional_fees: source?.additional_fees || current.additional_fees,
        payment_methods: source?.payment_methods || current.payment_methods,
        payment_timing: source?.payment_timing || current.payment_timing,
        service_timing: source?.service_timing || current.service_timing,
        application_period: source?.application_period || current.application_period,
        cancellation_refund: source?.cancellation_refund || current.cancellation_refund,
        business_hours: source?.business_hours || current.business_hours,
      }));
      setGoodsType(source?.goods_type === "digital_content" ? "digital_content" : "general");
    } catch (error: any) {
      setMessage(error?.message || "申請情報を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [townId, townName]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (action: "enable_paypay" | "update_paypay" | "disable_paypay") => {
    const confirmation = action === "disable_paypay"
      ? "利用停止を申請します。運営承認まではPayPayと公開ページを維持します。よろしいですか？"
      : "入力内容をel-town運営へ申請します。公開情報に個人情報を含めていないことを確認しましたか？";
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setMessage("");
    try {
      const token = await accessToken();
      const response = await fetch("/api/admin/paypay-application", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          townId,
          action,
          goodsType,
          disclosure: { ...form, fee_amount: Number(form.fee_amount) },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "申請できませんでした。");
      setMessage(data.message);
      await load();
    } catch (error: any) {
      setMessage(error?.message || "申請できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const pending = application?.request?.status === "pending";
  const published = application?.disclosure?.publication_status === "published";
  const stripeStatus = application?.town?.stripe_paypay_status || "not_requested";

  return (
    <section className="admin-basic-card paypay-application">
      <div className="admin-basic-card-heading">
        <div>
          <p className="el-kicker">団体別オプション</p>
          <h3>Stripe PayPayの申請</h3>
          <p>利用する団体だけ申請します。el-town自身の決済方法には影響しません。</p>
        </div>
        <span className={`admin-stripe-badge ${stripeStatus === "active" ? "ready" : stripeStatus === "pending" ? "pending" : ""}`}>
          {statusLabel(stripeStatus)}
        </span>
      </div>

      {!stripeConnected && <div className="admin-basic-message error">先にStripe Connectの本番登録を完了してください。</div>}
      {pending && (
        <div className="admin-basic-message">
          el-town運営で確認中です。申請種別：{application.request.request_type === "disable_paypay" ? "利用停止" : application.request.request_type === "update_paypay" ? "掲載内容変更" : "利用開始"}
        </div>
      )}
      {application?.town?.stripe_paypay_last_error && <div className="admin-basic-message error">{application.town.stripe_paypay_last_error}</div>}

      <div className="paypay-workflow">
        <span>1. 団体が入力・申請</span><i>→</i><span>2. el-town運営が確認</span><i>→</i><span>3. 法定ページ公開</span><i>→</i><span>4. Stripe審査</span>
      </div>

      <h4>「特定商取引法に基づく表記」の公開情報</h4>
      <p className="admin-basic-note">承認後、以下の内容から公開ページを自動作成します。会長個人の自宅住所・個人メールではなく、団体の正式な連絡先を入力してください。</p>

      <div className="admin-basic-form paypay-form">
        <label><span>団体名</span><input value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} /></label>
        <label><span>運営責任者</span><input value={form.representative_name} onChange={(e) => setForm({ ...form, representative_name: e.target.value })} placeholder="例：会長 山田 太郎" /></label>
        <label><span>郵便番号</span><input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="123-4567" /></label>
        <label className="admin-basic-wide"><span>所在地</span><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="団体事務所・集会場などの正式な所在地" /></label>
        <label><span>問い合わせ電話番号</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" /></label>
        <label><span>問い合わせメール</span><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" /></label>
        <label><span>会費名称</span><input value={form.fee_name} onChange={(e) => setForm({ ...form, fee_name: e.target.value })} /></label>
        <label><span>会費金額（円）</span><input value={form.fee_amount} onChange={(e) => setForm({ ...form, fee_amount: e.target.value })} type="number" min="0" step="1" /></label>
        <label>
          <span>取扱内容</span>
          <select value={goodsType} onChange={(e) => setGoodsType(e.target.value as typeof goodsType)}>
            <option value="general">一般（町内会費・自治会費）</option>
            <option value="digital_content">デジタルコンテンツ</option>
          </select>
        </label>
        <label className="admin-basic-wide"><span>会費以外の負担</span><textarea rows={2} value={form.additional_fees} onChange={(e) => setForm({ ...form, additional_fees: e.target.value })} /></label>
        <label className="admin-basic-wide"><span>支払方法</span><textarea rows={2} value={form.payment_methods} onChange={(e) => setForm({ ...form, payment_methods: e.target.value })} /></label>
        <label className="admin-basic-wide"><span>支払時期</span><textarea rows={2} value={form.payment_timing} onChange={(e) => setForm({ ...form, payment_timing: e.target.value })} /></label>
        <label className="admin-basic-wide"><span>役務の提供時期</span><textarea rows={2} value={form.service_timing} onChange={(e) => setForm({ ...form, service_timing: e.target.value })} /></label>
        <label className="admin-basic-wide"><span>申込期間</span><textarea rows={2} value={form.application_period} onChange={(e) => setForm({ ...form, application_period: e.target.value })} /></label>
        <label className="admin-basic-wide"><span>解約・返金条件</span><textarea rows={3} value={form.cancellation_refund} onChange={(e) => setForm({ ...form, cancellation_refund: e.target.value })} /></label>
        <label className="admin-basic-wide"><span>問い合わせ対応時間</span><input value={form.business_hours} onChange={(e) => setForm({ ...form, business_hours: e.target.value })} /></label>
      </div>

      {application?.publicUrl && (
        <p className="paypay-public-link">
          <a href={application.businessPublicUrl} target="_blank" rel="noopener noreferrer">団体の公開ページを確認</a>
          {" ／ "}
          <a href={application.publicUrl} target="_blank" rel="noopener noreferrer">特定商取引法ページを確認</a>
        </p>
      )}

      <div className="admin-stripe-actions">
        <button
          type="button"
          className="admin-stripe-primary"
          disabled={loading || busy || pending || !stripeConnected}
          onClick={() => void submit(published ? "update_paypay" : "enable_paypay")}
        >
          {busy ? "送信中" : published ? "掲載内容の変更を申請" : "PayPay利用を申請"}
        </button>
        {(published || stripeStatus === "active" || stripeStatus === "pending") && (
          <button type="button" className="admin-stripe-sync" disabled={loading || busy || pending} onClick={() => void submit("disable_paypay")}>
            PayPay利用停止を申請
          </button>
        )}
      </div>
      {message && <div className={`admin-basic-message ${message.includes("できません") || message.includes("入力") ? "error" : "success"}`}>{message}</div>}
    </section>
  );
}
