import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const PAYPAY_API_VERSION = "2025-11-17.preview";

export const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Supabaseのサーバー設定が不足しています。");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
};

export const createPayPayStripeClient = () => {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) throw new Error("Stripe APIキーが設定されていません。");
  return new Stripe(key, { apiVersion: PAYPAY_API_VERSION as any });
};

const requiredText = (value: unknown, label: string, max = 500) => {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label}を入力してください。`);
  if (text.length > max) throw new Error(`${label}は${max}文字以内で入力してください。`);
  return text;
};

export const normalizeDisclosurePayload = (value: any, fallback: { sellerName: string; feeName: string; feeAmount: number }) => {
  const feeAmount = Number(value?.fee_amount ?? fallback.feeAmount);
  if (!Number.isInteger(feeAmount) || feeAmount < 0) throw new Error("会費金額を0円以上の整数で入力してください。");

  const postalCode = requiredText(value?.postal_code, "郵便番号", 12).replace(/[^\d-]/g, "");
  if (!/^\d{3}-?\d{4}$/.test(postalCode)) throw new Error("郵便番号を7桁で入力してください。");

  const email = requiredText(value?.email, "メールアドレス", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("メールアドレスを正しく入力してください。");

  const phone = requiredText(value?.phone, "電話番号", 30);
  if (!/^[0-9+() -]{8,30}$/.test(phone)) throw new Error("電話番号を正しく入力してください。");

  return {
    seller_name: requiredText(value?.seller_name || fallback.sellerName, "町内会・自治会名", 200),
    representative_name: requiredText(value?.representative_name, "運営責任者", 100),
    postal_code: postalCode,
    address: requiredText(value?.address, "所在地", 300),
    phone,
    email,
    fee_name: requiredText(value?.fee_name || fallback.feeName, "会費名称", 100),
    fee_amount: feeAmount,
    additional_fees: requiredText(value?.additional_fees, "会費以外の負担", 500),
    payment_methods: requiredText(value?.payment_methods, "支払方法", 500),
    payment_timing: requiredText(value?.payment_timing, "支払時期", 500),
    service_timing: requiredText(value?.service_timing, "役務の提供時期", 500),
    application_period: requiredText(value?.application_period, "申込期間", 500),
    cancellation_refund: requiredText(value?.cancellation_refund, "解約・返金条件", 1000),
    business_hours: String(value?.business_hours || "").trim().slice(0, 300) || null,
  };
};

export const payPayCapabilityStatus = (account: Stripe.Account) => {
  const raw = String((account.capabilities as any)?.paypay_payments || "unrequested");
  if (raw === "active") return "active";
  if (raw === "pending") return "pending";
  if (raw === "inactive") return "inactive";
  if (raw === "unrequested") return "not_requested";
  return "restricted";
};

export const syncPayPayCapability = async (townId: string | number, accountId: string) => {
  const stripe = createPayPayStripeClient();
  const service = createServiceClient();
  const account = await stripe.accounts.retrieve(accountId);
  const capabilityStatus = payPayCapabilityStatus(account);
  const { data: disclosure } = await service
    .from("neighborhood_commercial_disclosures")
    .select("publication_status")
    .eq("neighborhood_id", townId)
    .maybeSingle();
  const published = disclosure?.publication_status === "published";
  const status = capabilityStatus === "active" && !published ? "inactive" : capabilityStatus;
  const enabled = capabilityStatus === "active" && published;

  await service.from("neighborhoods").update({
    stripe_paypay_status: status,
    stripe_paypay_last_error: null,
    stripe_paypay_updated_at: new Date().toISOString(),
  }).eq("id", townId);

  await service.from("neighborhood_fee_settings").update({
    stripe_paypay_enabled: enabled,
  }).eq("neighborhood_id", townId);

  return { status, enabled, account };
};
