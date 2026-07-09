import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe API key is not configured." }, { status: 500 });
  }

  const body = await req.json();
  const feeRecordId = String(body.feeRecordId || "");
  const amount = Number(body.amount || 0);
  const stripeAccountId = String(body.stripeAccountId || "");
  const residentName = String(body.residentName || "Resident");
  const townName = String(body.townName || "Neighborhood");

  if (!feeRecordId || !Number.isFinite(amount) || amount <= 0 || !stripeAccountId) {
    return NextResponse.json({ error: "Fee billing data or Stripe account is missing." }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-02-24.acacia" as any,
  });

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const liveRequired = process.env.NODE_ENV === "production" || origin.includes("el-town.jp");
  const stripeMode = stripeKey.includes("_live_") ? "live" : "test";
  if (liveRequired && stripeMode !== "live") {
    return NextResponse.json({ error: "本番環境ではStripe本番キーでの決済のみ許可されています。" }, { status: 500 });
  }
  const connectedAccount = await stripe.accounts.retrieve(stripeAccountId);
  if (!connectedAccount.charges_enabled) {
    return NextResponse.json({ error: "Stripe本番連携の決済受付がまだ有効ではありません。" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "jpy",
            unit_amount: Math.round(amount),
            product_data: {
              name: `${townName} membership fee`,
              description: `${residentName}`,
            },
          },
        },
      ],
      metadata: {
        fee_record_id: feeRecordId,
        payment_source: "fee_records",
      },
      success_url: `${origin}/resident?tab=payment&payment=success`,
      cancel_url: `${origin}/resident?tab=payment&payment=cancel`,
    },
    { stripeAccount: stripeAccountId },
  );

  return NextResponse.json({ url: session.url });
}
