import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import Stripe from 'stripe';

const missingColumnFromError = (error: any) => {
  const message = String(error?.message || '');
  const quoted = message.match(/'([^']+)' column/);
  if (quoted?.[1]) return quoted[1];
  const plain = message.match(/column ["']?([a-zA-Z0-9_]+)["']?/);
  return plain?.[1] || '';
};

const updateNeighborhoodStripeWithFallback = async (townId: string | number, payload: Record<string, any>) => {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { error } = await supabase.from('neighborhoods').update(nextPayload).eq('id', townId);
    if (!error) return;

    const missingColumn = missingColumnFromError(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
      delete nextPayload[missingColumn];
      continue;
    }

    throw error;
  }
};

const stripeModeFromKey = (stripeKey: string) => (stripeKey.includes('_live_') ? 'live' : 'test');

export async function POST(req: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe API key is not configured.' }, { status: 500 });
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const stripeMode = stripeModeFromKey(stripeKey);
    const liveRequired = process.env.NODE_ENV === 'production' || baseUrl.includes('el-town.jp');

    if (liveRequired && stripeMode !== 'live') {
      return NextResponse.json({ error: '本番環境ではStripe本番キーでの登録のみ許可されています。' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-24.acacia' as any,
    });
    const { townId } = await req.json();

    if (!townId) {
      return NextResponse.json({ error: 'townId is required' }, { status: 400 });
    }

    // 1. 町内会の情報を取得
    const { data: town, error: townError } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('id', townId)
      .single();

    if (townError || !town) {
      return NextResponse.json({ error: 'Neighborhood not found' }, { status: 404 });
    }

    // 2. 役員（代表者）のメールアドレスを取得（プリフィル用）
    const { data: adminData } = await supabase
      .from('neighborhood_admins')
      .select('admin_email')
      .eq('neighborhood_id', townId)
      .limit(1)
      .maybeSingle();

    let stripeAccountId = town.stripe_account_id;
    const shouldReplaceStoredAccount = town.stripe_account_mode && town.stripe_account_mode !== stripeMode;
    if (shouldReplaceStoredAccount) {
      stripeAccountId = '';
    }

    if (stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(stripeAccountId);
        await updateNeighborhoodStripeWithFallback(townId, {
          stripe_account_mode: stripeMode,
          stripe_onboarding_status: account.charges_enabled && account.payouts_enabled ? 'active' : 'pending',
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_details_submitted: account.details_submitted,
          stripe_account_updated_at: new Date().toISOString(),
        });
      } catch (error: any) {
        if (error?.code !== 'resource_missing') throw error;
        stripeAccountId = '';
      }
    }

    // 3. Expressアカウント未作成の場合は新規作成
    if (!stripeAccountId) {
      const accountParams: Stripe.AccountCreateParams = {
        type: 'express',
        country: 'JP',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'non_profit',
        business_profile: {
          name: town.name, // プリフィル: 町内会名
        },
      };

      if (adminData?.admin_email) {
        accountParams.email = adminData.admin_email; // プリフィル: 代表者メール
      }

      const account = await stripe.accounts.create(accountParams);
      stripeAccountId = account.id;

      // DBに保存
      try {
        await updateNeighborhoodStripeWithFallback(townId, {
          stripe_account_id: stripeAccountId,
          stripe_account_mode: stripeMode,
          stripe_onboarding_status: 'pending',
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_details_submitted: account.details_submitted,
          stripe_account_updated_at: new Date().toISOString(),
        });
      } catch (updateError) {
        console.error('Failed to save stripe_account_id to DB', updateError);
        return NextResponse.json({ error: 'Failed to save account' }, { status: 500 });
      }
    }

    // 4. Account Link (Hosted Onboarding URL) を発行
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/admin/stripe/refresh?townId=${townId}`,
      return_url: `${baseUrl}/admin/stripe/return?townId=${townId}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    console.error('Stripe API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
