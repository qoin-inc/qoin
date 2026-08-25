import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createWebhookSupabaseClient } from '@/lib/stripeConnectServer';
import { payPayCapabilityStatus } from '@/lib/paypayServer';

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
    if (!result.error && result.data) return result.data;
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
    if (!result.error && result.data) return result.data;
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

const updateSystemUsagePaymentProfileWithFallback = async (supabase: SupabaseClient, neighborhoodId: string, payload: Record<string, any>) => {
  let nextPayload = { ...payload };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await supabase
      .from('system_usage_payment_profiles')
      .update(nextPayload)
      .eq('neighborhood_id', neighborhoodId)
      .select('id')
      .maybeSingle();
    if (!result.error && result.data) return;
    if (!result.error && !result.data) throw new Error(`System usage payment profile ${neighborhoodId} was not updated.`);
    const missingColumn = missingColumnFromError(result.error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
      delete nextPayload[missingColumn];
      continue;
    }
    throw result.error;
  }
};

const saveSystemUsageCard = async (
  stripe: Stripe,
  supabase: SupabaseClient,
  setupIntentId: string,
  neighborhoodId: string,
) => {
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, { expand: ['payment_method'] });
  const paymentMethod = setupIntent.payment_method;
  if (!paymentMethod || typeof paymentMethod === 'string') throw new Error('Registered card details were not returned by Stripe.');
  const customerId = typeof setupIntent.customer === 'string' ? setupIntent.customer : setupIntent.customer?.id;
  if (!customerId) throw new Error('Stripe Customer was not found for the registered card.');
  await stripe.customers.update(customerId, {
    preferred_locales: ['ja'],
    invoice_settings: { default_payment_method: paymentMethod.id },
  });
  await updateSystemUsagePaymentProfileWithFallback(supabase, neighborhoodId, {
    payment_method: 'card',
    stripe_customer_id: customerId,
    stripe_default_payment_method_id: paymentMethod.id,
    card_setup_status: 'ready',
    card_brand: paymentMethod.card?.brand || null,
    card_last4: paymentMethod.card?.last4 || null,
    card_exp_month: paymentMethod.card?.exp_month || null,
    card_exp_year: paymentMethod.card?.exp_year || null,
    updated_at: new Date().toISOString(),
  });
};

const syncSystemUsageInvoice = async (supabase: SupabaseClient, invoice: Stripe.Invoice, eventType: string) => {
  const billingId = invoice.metadata?.system_usage_billing_id;
  if (!billingId || invoice.metadata?.payment_source !== 'system_usage_billings') return;
  const invoiceAny = invoice as any;
  const paidAtUnix = invoice.status_transitions?.paid_at;
  const paidAt = paidAtUnix ? new Date(paidAtUnix * 1000).toISOString() : null;
  const paymentIntentId = typeof invoiceAny.payment_intent === 'string'
    ? invoiceAny.payment_intent
    : invoiceAny.payment_intent?.id || null;
  const billingMonth = invoice.metadata?.billing_month || '';
  const status = eventType === 'invoice.paid'
    ? 'paid'
    : eventType === 'invoice.payment_failed'
      ? 'payment_failed'
      : eventType === 'invoice.payment_action_required'
        ? 'payment_action_required'
        : eventType === 'invoice.voided'
          ? 'cancelled'
          : invoice.status || 'open';
  const payload: Record<string, any> = {
    status,
    invoice_number: invoice.number || null,
    stripe_customer_id: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: paymentIntentId,
    stripe_hosted_invoice_url: invoice.hosted_invoice_url,
    stripe_invoice_pdf_url: invoice.invoice_pdf,
    paid_amount: invoice.amount_paid || 0,
    updated_at: new Date().toISOString(),
  };
  if (eventType === 'invoice.finalized') payload.invoice_issued_at = new Date().toISOString();
  if (eventType === 'invoice.paid') {
    payload.paid_at = paidAt || new Date().toISOString();
    payload.receipt_number = `RCPT-${String(billingMonth).replace('-', '')}-${billingId}`;
  }
  if (eventType === 'invoice.payment_failed' || eventType === 'invoice.payment_action_required') {
    payload.stripe_last_error = eventType === 'invoice.payment_failed'
      ? 'Stripeカードの自動決済に失敗しました。'
      : 'カード決済に追加認証が必要です。';
  }
  await updateSystemUsageBillingWithFallback(supabase, billingId, payload);
};

const findOrCreateStripeFeeCategory = async (supabase: SupabaseClient, neighborhoodId: string | number) => {
  const existing = await supabase
    .from('assembly_categories')
    .select('id')
    .eq('neighborhood_id', neighborhoodId)
    .eq('type', 'expense')
    .eq('name', '支払手数料')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1);
  if (existing.error) throw existing.error;
  if (existing.data?.[0]?.id) return existing.data[0].id;

  const created = await supabase
    .from('assembly_categories')
    .insert({
      neighborhood_id: neighborhoodId,
      type: 'expense',
      name: '支払手数料',
      parent_id: null,
      sort_order: 180,
      is_standard: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (created.error) throw created.error;
  return created.data.id;
};

const insertStripeFeeSettlement = async (
  supabase: SupabaseClient,
  feeRecord: any,
  paymentIntentId: string,
  balanceTransactionId: string,
  stripeFeeAmount: number,
  paidAt: string,
) => {
  if (stripeFeeAmount <= 0 || !feeRecord?.neighborhood_id) return;

  const sourceId = balanceTransactionId || paymentIntentId;
  const description = `Stripe決済手数料 / ${feeRecord.resident_name || '会費'} / ${sourceId}`;
  let existing = await supabase
    .from('assembly_settlements')
    .select('id')
    .eq('neighborhood_id', feeRecord.neighborhood_id)
    .eq('source_type', 'stripe_fee')
    .eq('source_id', sourceId)
    .limit(1);

  if (existing.error && missingColumnFromError(existing.error)) {
    existing = await supabase
      .from('assembly_settlements')
      .select('id')
      .eq('neighborhood_id', feeRecord.neighborhood_id)
      .eq('description', description)
      .limit(1);
  }
  if (existing.error) throw existing.error;
  if (existing.data?.length) return;

  const categoryId = await findOrCreateStripeFeeCategory(supabase, feeRecord.neighborhood_id);
  let settlementPayload: Record<string, any> = {
    neighborhood_id: feeRecord.neighborhood_id,
    fiscal_year: Number(feeRecord.fiscal_year || new Date(paidAt).getFullYear()),
    category_id: categoryId,
    type: 'expense',
    amount: stripeFeeAmount,
    paid_date: paidAt.slice(0, 10),
    description,
    receipt_url: null,
    receipt_name: null,
    source_type: 'stripe_fee',
    source_id: sourceId,
    created_at: paidAt,
    updated_at: paidAt,
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await supabase.from('assembly_settlements').insert(settlementPayload);
    if (!result.error || result.error.code === '23505') return;
    const missingColumn = missingColumnFromError(result.error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(settlementPayload, missingColumn)) {
      delete settlementPayload[missingColumn];
      continue;
    }
    throw result.error;
  }
};

const getStripeFeeDetails = async (stripe: Stripe, event: Stripe.Event, paymentIntentId: string) => {
  const options = event.account ? { stripeAccount: event.account } : undefined;
  const paymentIntent = options
    ? await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge.balance_transaction'] }, options)
    : await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge.balance_transaction'] });
  let charge = paymentIntent.latest_charge;
  if (typeof charge === 'string') {
    charge = options
      ? await stripe.charges.retrieve(charge, { expand: ['balance_transaction'] }, options)
      : await stripe.charges.retrieve(charge, { expand: ['balance_transaction'] });
  }
  if (!charge || typeof charge === 'string') return null;

  let balanceTransaction = charge.balance_transaction;
  if (typeof balanceTransaction === 'string') {
    balanceTransaction = options
      ? await stripe.balanceTransactions.retrieve(balanceTransaction, options)
      : await stripe.balanceTransactions.retrieve(balanceTransaction);
  }
  if (!balanceTransaction || typeof balanceTransaction === 'string') return null;
  return {
    id: balanceTransaction.id,
    fee: Number(balanceTransaction.fee || 0),
    net: Number(balanceTransaction.net || 0),
  };
};

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe API key is not configured.' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-02-24.acacia' as any,
  });

  const webhookSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET || '',
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET || '',
  ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);
  if (!webhookSecrets.length) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 500 });
  }

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Stripe signature is missing.' }, { status: 400 });

  let event: Stripe.Event | null = null;

  let signatureError = '';
  for (const webhookSecret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      break;
    } catch (err: any) {
      signatureError = err.message;
    }
  }
  if (!event) {
    console.error(`Webhook Error: ${signatureError}`);
    return NextResponse.json({ error: `Webhook Error: ${signatureError}` }, { status: 400 });
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

    const capabilityStatus = payPayCapabilityStatus(account);
    const neighborhood = await updateNeighborhoodStripeWithFallback(supabase, account.id, {
      stripe_account_mode: mode,
      stripe_onboarding_status: active ? 'active' : account.details_submitted ? 'reviewing' : 'pending',
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_details_submitted: account.details_submitted,
      stripe_account_updated_at: new Date().toISOString(),
      stripe_paypay_status: capabilityStatus,
      stripe_paypay_last_error: null,
      stripe_paypay_updated_at: new Date().toISOString(),
    });
    if (neighborhood?.id) {
      const { data: disclosure } = await supabase
        .from('neighborhood_commercial_disclosures')
        .select('publication_status')
        .eq('neighborhood_id', neighborhood.id)
        .maybeSingle();
      const paypayEnabled = capabilityStatus === 'active' && disclosure?.publication_status === 'published';
      if (capabilityStatus === 'active' && !paypayEnabled) {
        await supabase.from('neighborhoods').update({
          stripe_paypay_status: 'inactive',
          stripe_paypay_updated_at: new Date().toISOString(),
        }).eq('id', neighborhood.id);
      }
      await supabase.from('neighborhood_fee_settings').update({
        stripe_paypay_enabled: paypayEnabled,
      }).eq('neighborhood_id', neighborhood.id);
    }
    
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

    if (paymentSource === 'system_usage_card_setup') {
      const neighborhoodId = session.metadata?.neighborhood_id || '';
      const setupIntentId = typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id || '';
      if (neighborhoodId && setupIntentId) {
        await saveSystemUsageCard(stripe, supabase, setupIntentId, neighborhoodId);
      }
    }

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

      const feeFiscalYear = Number(currentFee?.fiscal_year ?? currentFee?.year);
      const closureResult = currentFee?.neighborhood_id && Number.isFinite(feeFiscalYear)
        ? await supabase
          .from('fee_year_closures')
          .select('id')
          .eq('neighborhood_id', currentFee.neighborhood_id)
          .eq('fiscal_year', feeFiscalYear)
          .maybeSingle()
        : { data: null, error: null };
      if (closureResult.error && closureResult.error.code !== '42P01' && closureResult.error.code !== 'PGRST205') {
        throw closureResult.error;
      }
      if (closureResult.data?.id) {
        const latePayment = await supabase.from('fee_year_post_lock_payments').upsert({
          closure_id: closureResult.data.id,
          neighborhood_id: currentFee.neighborhood_id,
          fiscal_year: feeFiscalYear,
          fee_record_id: String(feeRecordId),
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          amount: session.amount_total || 0,
          status: 'pending_review',
          payment_data: {
            payment_status: session.payment_status,
            payment_source: session.metadata?.payment_source || null,
          },
        }, { onConflict: 'stripe_checkout_session_id' });
        if (latePayment.error) throw latePayment.error;
        return NextResponse.json({ received: true, finalizedFeePaymentStored: true });
      }

      const paidAt = new Date().toISOString();
      const alreadyRecorded = Boolean(paymentIntentId && currentFee?.stripe_payment_intent_id === paymentIntentId);
      const cashPaid = Number(currentFee?.paid_amount_cash || 0);
      const stripePaid = Number(currentFee?.paid_amount_stripe || 0) + (alreadyRecorded ? 0 : amountPaid);
      const totalPaid = cashPaid + stripePaid;
      const billingAmount = Number(currentFee?.expected_amount || currentFee?.billing_amount || currentFee?.amount || amountPaid);
      const stripeFee = paymentIntentId ? await getStripeFeeDetails(stripe, event, paymentIntentId) : null;

      await updateFeeRecordWithFallback(supabase, feeRecordId, {
        paid_amount_cash: cashPaid,
        paid_amount_stripe: stripePaid,
        paid_amount: totalPaid,
        payment_method: 'stripe',
        last_payment_method: 'stripe',
        status: totalPaid >= billingAmount ? 'paid' : 'partial',
        stripe_payment_intent_id: paymentIntentId,
        stripe_balance_transaction_id: stripeFee?.id || null,
        stripe_fee_amount: stripeFee?.fee || 0,
        stripe_net_amount: stripeFee?.net ?? amountPaid,
        paid_at: currentFee?.paid_at || paidAt,
      });

      if (stripeFee && paymentIntentId) {
        await insertStripeFeeSettlement(supabase, currentFee, paymentIntentId, stripeFee.id, stripeFee.fee, paidAt);
      }
    }
  }

  if (event.type === 'setup_intent.succeeded') {
    const setupIntent = event.data.object as Stripe.SetupIntent;
    if (setupIntent.metadata?.payment_source === 'system_usage_card_setup' && setupIntent.metadata?.neighborhood_id) {
      await saveSystemUsageCard(stripe, supabase, setupIntent.id, setupIntent.metadata.neighborhood_id);
    }
  }

  if ([
    'invoice.finalized',
    'invoice.paid',
    'invoice.payment_failed',
    'invoice.payment_action_required',
    'invoice.voided',
  ].includes(event.type)) {
    await syncSystemUsageInvoice(supabase, event.data.object as Stripe.Invoice, event.type);
  }

  return NextResponse.json({ received: true });
}
