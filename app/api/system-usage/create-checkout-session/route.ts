import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const missingColumnFromError = (error: any) => {
  const message = String(error?.message || "");
  const quoted = message.match(/'([^']+)' column/);
  if (quoted?.[1]) return quoted[1];
  const plain = message.match(/column ["']?([a-zA-Z0-9_]+)["']?/);
  return plain?.[1] || "";
};

const updateSystemUsageBillingWithFallback = async (billingId: string, payload: Record<string, any>) => {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await supabase.from("system_usage_billings").update(nextPayload).eq("id", billingId);
    if (!result.error) return;

    const missingColumn = missingColumnFromError(result.error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
      delete nextPayload[missingColumn];
      continue;
    }

    throw result.error;
  }
};

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe API key is not configured." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const billingId = String(body.billingId || "");

  if (!billingId) {
    return NextResponse.json({ error: "System usage billing ID is missing." }, { status: 400 });
  }

  const { data: billing, error } = await supabase
    .from("system_usage_billings")
    .select("*")
    .eq("id", billingId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!billing) {
    return NextResponse.json({ error: "System usage billing was not found." }, { status: 404 });
  }

  if (billing.status === "paid" || billing.paid_at) {
    return NextResponse.json({ error: "This system usage billing is already paid." }, { status: 400 });
  }

  const amount = Number(billing.total_amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Payment amount is missing." }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-02-24.acacia" as any,
  });

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const billingMonth = String(billing.billing_month || body.billingMonth || "");
  const townName = String(body.townName || "町内会・自治会");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: Math.round(amount),
          product_data: {
            name: `el-town システム利用料 ${billingMonth}`,
            description: `${townName} ${billingMonth} 利用分`,
          },
        },
      },
    ],
    metadata: {
      payment_source: "system_usage_billings",
      system_usage_billing_id: billingId,
      neighborhood_id: String(billing.neighborhood_id || ""),
      billing_month: billingMonth,
    },
    success_url: `${origin}/admin?payment=system_usage_success`,
    cancel_url: `${origin}/admin?payment=system_usage_cancel`,
  });

  await updateSystemUsageBillingWithFallback(billingId, {
    stripe_checkout_session_id: session.id,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ url: session.url });
}
