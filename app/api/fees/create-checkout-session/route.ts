import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPayPayStripeClient, payPayCapabilityStatus } from "@/lib/paypayServer";
import { createWebhookSupabaseClient } from "@/lib/stripeConnectServer";
import { getStripeBankAccount, stripeBankPaymentOptions, type StripeBankAccount } from "@/lib/stripeBankTransfer";

const billingAmount = (fee: any) => Number(fee?.expected_amount ?? fee?.billing_amount ?? fee?.amount ?? 0);
const paidAmount = (fee: any) => Number(fee?.paid_amount ?? (
  Number(fee?.paid_amount_cash || 0) + Number(fee?.paid_amount_stripe || 0)
));

export async function POST(req: Request) {
  try {
    const authorization = req.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "会員ログインを確認できません。" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !supabaseKey) throw new Error("会費データベースが設定されていません。");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "会員ログインの有効期限が切れています。" }, { status: 401 });

    const body = await req.json();
    const feeRecordId = String(body?.feeRecordId || "");
    if (!feeRecordId) return NextResponse.json({ error: "会費請求を指定してください。" }, { status: 400 });

    // 金額・町内会/自治会情報・Stripeアカウントはブラウザから受け取らず、会員権限で参照できる請求から確定する。
    const { data: fee, error: feeError } = await supabase
      .from("fee_records")
      .select("*")
      .eq("id", feeRecordId)
      .single();
    if (feeError || !fee) return NextResponse.json({ error: "この会費請求を確認できません。" }, { status: 404 });

    const townId = fee.neighborhood_id;
    const { data: roster } = await supabase
      .from("resident_rosters")
      .select("id")
      .eq("neighborhood_id", townId)
      .or(`user_auth_id.eq.${userData.user.id},family_user_auth_id_1.eq.${userData.user.id},family_user_auth_id_2.eq.${userData.user.id}`)
      .maybeSingle();
    if (!roster?.id || !fee.roster_id || String(roster.id) !== String(fee.roster_id)) {
      return NextResponse.json({ error: "この会費請求を支払う権限がありません。" }, { status: 403 });
    }

    const closureResult = await supabase
      .from("fee_year_closures")
      .select("status")
      .eq("neighborhood_id", townId)
      .eq("fiscal_year", Number(fee.fiscal_year ?? fee.year))
      .maybeSingle();
    if (closureResult.error && closureResult.error.code !== "42P01" && closureResult.error.code !== "PGRST205") {
      throw closureResult.error;
    }
    if (closureResult.data) {
      return NextResponse.json({ error: "この年度の会費は確定済みのため、オンライン決済を開始できません。" }, { status: 409 });
    }

    const [{ data: town }, { data: feeSetting }] = await Promise.all([
      supabase
        .from("neighborhoods")
        .select("id,name,stripe_account_id,stripe_charges_enabled,stripe_paypay_status")
        .eq("id", townId)
        .single(),
      supabase
        .from("neighborhood_fee_settings")
        .select("stripe_card_enabled,stripe_paypay_enabled,stripe_bank_transfer_enabled")
        .eq("neighborhood_id", townId)
        .maybeSingle(),
    ]);
    if (!town?.stripe_account_id || town.stripe_charges_enabled === false) {
      return NextResponse.json({ error: "この町内会・自治会のオンライン決済は現在利用できません。" }, { status: 400 });
    }

    const amount = Math.max(billingAmount(fee) - paidAmount(fee), 0);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "未納額はありません。" }, { status: 400 });
    }

    const stripe = createPayPayStripeClient();
    const connectedAccount = await stripe.accounts.retrieve(town.stripe_account_id);
    if (!connectedAccount.charges_enabled) {
      return NextResponse.json({ error: "この町内会・自治会のStripe決済は確認中です。" }, { status: 400 });
    }

    const paypayActive = Boolean(
      feeSetting?.stripe_paypay_enabled
      && town.stripe_paypay_status === "active"
      && payPayCapabilityStatus(connectedAccount) === "active"
    );
    const cardActive = feeSetting?.stripe_card_enabled !== false;
    const bankActive = feeSetting?.stripe_bank_transfer_enabled === true && (connectedAccount.capabilities as any)?.jp_bank_transfer_payments === "active";
    const paymentMethods = [
      ...(cardActive ? ["card"] : []),
      ...(paypayActive ? ["paypay"] : []),
      ...(bankActive ? ["customer_balance"] : []),
    ];
    if (!paymentMethods.length) {
      return NextResponse.json({ error: feeSetting?.stripe_bank_transfer_enabled ? "Stripe銀行振込の利用審査中です。役員へお問い合わせください。" : "利用可能なオンライン決済方法がありません。" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const liveRequired = process.env.NODE_ENV === "production" || origin.includes("el-town.jp");
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    if (liveRequired && !stripeKey.includes("_live_")) {
      return NextResponse.json({ error: "本番環境ではStripe本番決済だけを利用できます。" }, { status: 500 });
    }

    const service = createWebhookSupabaseClient();
    const previous = await service.from("fee_stripe_sessions").select("*").eq("fee_record_id", feeRecordId).maybeSingle();
    if (previous.error) throw previous.error;
    if (previous.data && previous.data.stripe_account_id === town.stripe_account_id) {
      const existing = await stripe.checkout.sessions.retrieve(previous.data.stripe_session_id, {}, { stripeAccount: town.stripe_account_id });
      if (existing.payment_status === "paid") return NextResponse.json({ error: "Stripeで入金済みです。画面を再読み込みしてください。" }, { status: 409 });
      if (existing.status === "open") {
        if (existing.amount_total === amount) return NextResponse.json({ url: existing.url });
        await stripe.checkout.sessions.expire(existing.id, {}, { stripeAccount: town.stripe_account_id });
      }
      if (existing.status === "complete") {
        if (existing.amount_total !== amount) return NextResponse.json({ error: "支払手続き開始後に会費の残額が変わっています。追加の振込前に役員へご確認ください。" }, { status: 409 });
        const intentId = typeof existing.payment_intent === "string" ? existing.payment_intent : existing.payment_intent?.id;
        if (!intentId) return NextResponse.json({ error: "Stripeの決済状況を確認できません。役員へお問い合わせください。" }, { status: 409 });
        const intent = await stripe.paymentIntents.retrieve(intentId, {}, { stripeAccount: town.stripe_account_id });
        if (!["canceled", "requires_payment_method"].includes(intent.status)) {
          const instructions = intent.next_action?.display_bank_transfer_instructions;
          return NextResponse.json({ bankAccount: instructions ? previous.data.bank_account_snapshot : null, message: instructions ? "Stripeで入金確認中です。支払案内の残額をお振り込みください。" : "Stripeで入金確認中です。時間をおいて画面を再読み込みしてください。", instructionsUrl: instructions?.hosted_instructions_url || null });
        }
      }
    }
    let customerId: string | undefined;
    let bankAccount: StripeBankAccount | null = null;
    if (bankActive) {
      const saved = await service.from("fee_stripe_customers").select("stripe_customer_id").eq("stripe_account_id", town.stripe_account_id).eq("roster_id", String(fee.roster_id)).maybeSingle();
      if (saved.error) throw saved.error;
      customerId = saved.data?.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({ name: fee.resident_name || "会員", preferred_locales: ["ja"], metadata: { neighborhood_id: String(townId), roster_id: String(fee.roster_id) } }, { stripeAccount: town.stripe_account_id, idempotencyKey: `fee-customer-${townId}-${fee.roster_id}` });
        customerId = customer.id;
        const stored = await service.from("fee_stripe_customers").upsert({ stripe_account_id: town.stripe_account_id, roster_id: String(fee.roster_id), stripe_customer_id: customerId }, { onConflict: "stripe_account_id,roster_id" });
        if (stored.error) throw stored.error;
      }
      bankAccount = await getStripeBankAccount(stripe, customerId!, town.stripe_account_id);
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(customerId ? { customer: customerId, payment_method_options: stripeBankPaymentOptions } : {}),
      payment_method_types: paymentMethods as any,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: amount,
          product_data: {
            name: `${town.name || "町内会・自治会"} ${fee.fiscal_year || fee.year || ""}年度会費`,
          },
        },
      }],
      metadata: {
        fee_record_id: feeRecordId,
        neighborhood_id: String(townId),
        payment_source: "fee_records",
      },
      payment_intent_data: {
        metadata: {
          fee_record_id: feeRecordId,
          neighborhood_id: String(townId),
          payment_source: "fee_records",
        },
      },
      success_url: `${origin}/resident?tab=payment&payment=success`,
      cancel_url: `${origin}/resident?tab=payment&payment=cancel`,
    } as any, { stripeAccount: town.stripe_account_id, idempotencyKey: `fee-session-${feeRecordId}-${amount}-${previous.data?.stripe_session_id || "first"}` });

    const storedSession = await service.from("fee_stripe_sessions").upsert({ fee_record_id: feeRecordId, stripe_account_id: town.stripe_account_id, stripe_customer_id: customerId || "", stripe_session_id: session.id, bank_account_snapshot: bankAccount, updated_at: new Date().toISOString() }, { onConflict: "fee_record_id" });
    if (storedSession.error) throw storedSession.error;

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "決済画面を作成できませんでした。" }, { status: 500 });
  }
}
