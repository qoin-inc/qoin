import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPayPayStripeClient, payPayCapabilityStatus } from "@/lib/paypayServer";

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

    // 金額・団体・Stripeアカウントはブラウザから受け取らず、会員権限で参照できる請求から確定する。
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

    const [{ data: town }, { data: feeSetting }] = await Promise.all([
      supabase
        .from("neighborhoods")
        .select("id,name,stripe_account_id,stripe_charges_enabled,stripe_paypay_status")
        .eq("id", townId)
        .single(),
      supabase
        .from("neighborhood_fee_settings")
        .select("stripe_card_enabled,stripe_paypay_enabled")
        .eq("neighborhood_id", townId)
        .maybeSingle(),
    ]);
    if (!town?.stripe_account_id || town.stripe_charges_enabled === false) {
      return NextResponse.json({ error: "この団体のオンライン決済は現在利用できません。" }, { status: 400 });
    }

    const amount = Math.max(billingAmount(fee) - paidAmount(fee), 0);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "未納額はありません。" }, { status: 400 });
    }

    const stripe = createPayPayStripeClient();
    const connectedAccount = await stripe.accounts.retrieve(town.stripe_account_id);
    if (!connectedAccount.charges_enabled) {
      return NextResponse.json({ error: "この団体のStripe決済は確認中です。" }, { status: 400 });
    }

    const paypayActive = Boolean(
      feeSetting?.stripe_paypay_enabled
      && town.stripe_paypay_status === "active"
      && payPayCapabilityStatus(connectedAccount) === "active"
    );
    const cardActive = feeSetting?.stripe_card_enabled !== false;
    const paymentMethods = [
      ...(cardActive ? ["card"] : []),
      ...(paypayActive ? ["paypay"] : []),
    ];
    if (!paymentMethods.length) {
      return NextResponse.json({ error: "利用可能なオンライン決済方法がありません。" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const liveRequired = process.env.NODE_ENV === "production" || origin.includes("el-town.jp");
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    if (liveRequired && !stripeKey.includes("_live_")) {
      return NextResponse.json({ error: "本番環境ではStripe本番決済だけを利用できます。" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
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
    } as any, { stripeAccount: town.stripe_account_id });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "決済画面を作成できませんでした。" }, { status: 500 });
  }
}
