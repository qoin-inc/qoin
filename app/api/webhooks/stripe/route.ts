import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe API key is not configured.' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-02-24.acacia' as any,
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      // 開発中などシークレットがない場合はそのままパース
      event = JSON.parse(payload) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // account.updated イベントを受け取る
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    
    // details_submitted が true になれば登録完了
    if (account.details_submitted) {
      console.log(`Stripe Account ${account.id} onboarding complete!`);
      // 必要に応じてDBのステータスを更新する処理をここに追加
      // 例: await supabase.from('neighborhoods').update({ stripe_status: 'active' }).eq('stripe_account_id', account.id);
    } else {
      console.log(`Stripe Account ${account.id} requires more details.`);
    }
  }

  return NextResponse.json({ received: true });
}
