import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  createStripeClient,
  findRecoverableStripeAccount,
  requireNeighborhoodAdmin,
  stripeAccountStatusPayload,
  updateNeighborhoodStripe,
} from '@/lib/stripeConnectServer';

export async function POST(req: Request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const { stripe, stripeMode } = createStripeClient();
    const liveRequired = process.env.NODE_ENV === 'production' || baseUrl.includes('el-town.jp');

    if (liveRequired && stripeMode !== 'live') {
      return NextResponse.json({ error: '本番環境ではStripe本番キーでの登録のみ許可されています。' }, { status: 500 });
    }

    const { townId } = await req.json();

    if (!townId) {
      return NextResponse.json({ error: 'townId is required' }, { status: 400 });
    }

    const { client, writeClient } = await requireNeighborhoodAdmin(req, townId);

    // 1. 認証済み管理者の町内会情報を取得
    const { data: town, error: townError } = await client
      .from('neighborhoods')
      .select('*')
      .eq('id', townId)
      .single();

    if (townError || !town) {
      return NextResponse.json({ error: 'Neighborhood not found' }, { status: 404 });
    }

    // 2. 役員（代表者）のメールアドレスを取得（プリフィル用）
    const { data: adminData } = await client
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
        await updateNeighborhoodStripe(writeClient, townId, stripeAccountStatusPayload(account, stripeMode));
      } catch (error: any) {
        if (error?.code !== 'resource_missing') throw error;
        stripeAccountId = '';
      }
    }

    // 3. DB保存に失敗した既存アカウントを、町内会IDまたは名称+代表者メールで一意に復旧
    if (!stripeAccountId) {
      const recoveredAccount = await findRecoverableStripeAccount(stripe, town, adminData?.admin_email);
      if (recoveredAccount) {
        stripeAccountId = recoveredAccount.id;
        await stripe.accounts.update(stripeAccountId, {
          metadata: { el_town_neighborhood_id: String(townId) },
        });
        await updateNeighborhoodStripe(writeClient, townId, stripeAccountStatusPayload(recoveredAccount, stripeMode));
      }
    }

    // 4. 復旧対象がない場合だけExpressアカウントを新規作成
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
          name: town.name,
          url: baseUrl,
          product_description: '町内会・自治会の会員世帯から、年度ごとの会費を受け付けます。',
        },
        metadata: {
          el_town_neighborhood_id: String(townId),
        },
      };

      if (adminData?.admin_email) {
        accountParams.email = adminData.admin_email;
        accountParams.business_profile = {
          ...accountParams.business_profile,
          support_email: adminData.admin_email,
        };
      }

      const account = await stripe.accounts.create(accountParams);
      stripeAccountId = account.id;

      // DBに保存
      try {
        await updateNeighborhoodStripe(writeClient, townId, stripeAccountStatusPayload(account, stripeMode));
      } catch (updateError) {
        console.error('Failed to save stripe_account_id to DB', updateError);
        return NextResponse.json({ error: 'Failed to save account' }, { status: 500 });
      }
    }

    // 5. el-townで確定できる団体情報を事前入力する。
    await stripe.accounts.update(stripeAccountId, {
      business_profile: {
        name: town.name,
        url: baseUrl,
        product_description: '町内会・自治会の会員世帯から、年度ごとの会費を受け付けます。',
        ...(adminData?.admin_email ? { support_email: adminData.admin_email } : {}),
      },
      metadata: {
        el_town_neighborhood_id: String(townId),
      },
    });

    // 6. Account Link (Hosted Onboarding URL) を発行
    const accountLinkParams: Stripe.AccountLinkCreateParams & {
      collection_options: {
        fields: 'eventually_due';
        future_requirements: 'include';
      };
    } = {
      account: stripeAccountId,
      refresh_url: `${baseUrl}/admin/stripe/refresh?townId=${townId}`,
      return_url: `${baseUrl}/admin/stripe/return?townId=${townId}`,
      type: 'account_onboarding',
      collection_options: {
        fields: 'eventually_due',
        future_requirements: 'include',
      },
    };
    const accountLink = await stripe.accountLinks.create(accountLinkParams);

    return NextResponse.json({ url: accountLink.url, accountId: stripeAccountId });
  } catch (err: any) {
    console.error('Stripe API error:', err);
    const message = String(err?.message || 'Stripe本番登録の開始に失敗しました。');
    const status = message.includes('ログイン') ? 401 : message.includes('権限') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
