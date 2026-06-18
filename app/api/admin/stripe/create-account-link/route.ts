import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe API key is not configured.' }, { status: 500 });
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
      .single();

    let stripeAccountId = town.stripe_account_id;

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
      const { error: updateError } = await supabase
        .from('neighborhoods')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', townId);

      if (updateError) {
        console.error('Failed to save stripe_account_id to DB', updateError);
        return NextResponse.json({ error: 'Failed to save account' }, { status: 500 });
      }
    }

    // 4. Account Link (Hosted Onboarding URL) を発行
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    
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
