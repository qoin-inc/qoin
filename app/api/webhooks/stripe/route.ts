import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createWebhookSupabaseClient } from '@/lib/stripeConnectServer';

const missingColumnFromError = (error: any) => {
  const message = String(error?.message || '');
  const quoted = message.match(/'([^']+)' column/);
  if (quoted?.[1]) return quoted[1];
  const plain = message.match(/column ["']?([a-zA-Z0-9_]+)["']?/);
  return plain?.[1] || '';
};

const updateFeeRecordWithFallback = async (supabase: SupabaseClient, feeRecordId: string, payload: Record<string, any>) => {
  let nextPayload = { ...payload };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await supabase.from('fee_records').update(nextPayload).eq('id', feeRecordId).select('id').maybeSingle();
    if (!result.error && result.data) return;
    if (!result.error && !result.data) throw new Error(`Fee record ${feeRecordId} was not updated.`);

    const missingColumn = missingColumnFromError(result.error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
      delete nextPayload[missingColumn];
      continue;
    }
    throw result.error;
  }
};

const updateNeighborhoodStripeWithFallback = async (supabase: SupabaseClient, stripeAccountId: string, payload: Record<string, any>) => {
  let nextPayload = { ...payload };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await supabase.from('neighborhoods').update(nextPayload).eq('stripe_account_id', stripeAccountId).select('id').maybeSingle();
    if (!result.error && result.data) return;
    if (!result.error && !result.data) throw new Error(`Stripe account ${stripeAccountId} is not linked to a neighborhood.`);

    const missingColumn = missingColumnFromError(result.error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
      delete nextPayload[missingColumn];
      continue;
    }
    throw result.error;
  }
};

const updateSystemUsageBillingWithFallback = async (supabase: SupabaseClient, billingId: string, payload: Record<string, any>) => {
  let nextPayload = { ...payload };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await supabase.from('system_usage_billings').update(nextPayload).eq('id', billingId).select('id').maybeSingle();
    if (!result.error && result.data) return;
    if (!result.error && !result.data) throw new Error(`System usage billing ${billingId} was not updated.`);

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
    return NextResponse.json({ error: 'Stripe API key is not configured.' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-02-24.acacia' as any,
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 500 });
  }

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Stripe signature is missing.' }, { status: 400 });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  let supabase: SupabaseClient;
  try {
    supabase = createWebhookSupabaseClient();
  } catch (err: any) {
    console.error(`Webhook database configuration error: ${err.message}`);
    return NextResponse.json({ error: 'Webhook database is not configured.' }, { status: 500 });
  }

  // account.updated イベントを受け取る
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    const active = Boolean(account.charges_enabled && account.payouts_enabled);
    const mode = event.livemode ? 'live' : 'test';

    await updateNeighborhoodStripeWithFallback(supabase, account.id, {
      stripe_account_mode: mode,
      stripe_onboarding_status: active ? 'active' : account.details_submitted ? 'reviewing' : 'pending',
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_details_submitted: account.details_submitted,
      stripe_account_updated_at: new Date().toISOString(),
    });
    
    // details_submitted が true になれば登録完了
    if (account.details_submitted) {
      console.log(`Stripe Account ${account.id} onboarding complete!`);
    } else {
      console.log(`Stripe Account ${account.id} requires more details.`);
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentSource = session.metadata?.payment_source;
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
    const systemUsageBillingId = session.metadata?.system_usage_billing_id;

    if (paymentSource === 'system_usage_billings' && systemUsageBillingId) {
      const paidAt = new Date().toISOString();
      const { data: currentBilling } = await supabase
        .from('system_usage_billings')
        .select('*')
        .eq('id', systemUsageBillingId)
        .maybeSingle();
      const billingMonth = session.metadata?.billing_month || currentBilling?.billing_month || '';
      const receiptNumber = currentBilling?.receipt_number || `RCPT-${String(billingMonth).replace('-', '')}-${systemUsageBillingId}`;

      await updateSystemUsageBillingWithFallback(supabase, systemUsageBillingId, {
        status: 'paid',
        paid_amount: session.amount_total || currentBilling?.total_amount || 0,
        payment_method: 'stripe',
        paid_at: currentBilling?.paid_at || paidAt,
        receipt_number: receiptNumber,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        updated_at: paidAt,
      });
    }

    const feeRecordId = session.metadata?.fee_record_id;

    if (paymentSource !== 'system_usage_billings' && feeRecordId) {
      const amountPaid = session.amount_total || 0;
      const { data: currentFee } = await supabase
        .from('fee_records')
        .select('*')
        .eq('id', feeRecordId)
        .maybeSingle();

      const cashPaid = Number(currentFee?.paid_amount_cash || 0);
      const stripePaid = Number(currentFee?.paid_amount_stripe || 0) + amountPaid;
      const totalPaid = cashPaid + stripePaid;
      const billingAmount = Number(currentFee?.expected_amount || currentFee?.billing_amount || currentFee?.amount || amountPaid);

      await updateFeeRecordWithFallback(supabase, feeRecordId, {
        paid_amount_cash: cashPaid,
        paid_amount_stripe: stripePaid,
        paid_amount: totalPaid,
        payment_method: 'stripe',
        last_payment_method: 'stripe',
        status: totalPaid >= billingAmount ? 'paid' : 'partial',
        stripe_payment_intent_id: paymentIntentId,
        paid_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ received: true });
}
