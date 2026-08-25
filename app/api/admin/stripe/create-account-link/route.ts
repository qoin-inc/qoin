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

    const requestBody = await req.json();
    const { townId } = requestBody;
    const onboarding = requestBody?.onboarding || {};
    const allowedBusinessTypes = new Set(['non_profit', 'company', 'individual', 'government_entity']);

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
    let stripeAccount: Stripe.Account | null = null;
    const shouldReplaceStoredAccount = town.stripe_account_mode && town.stripe_account_mode !== stripeMode;
    if (shouldReplaceStoredAccount) {
      stripeAccountId = '';
    }

    if (stripeAccountId) {
      try {
        stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
        await updateNeighborhoodStripe(writeClient, townId, stripeAccountStatusPayload(stripeAccount, stripeMode));
      } catch (error: any) {
        if (error?.code !== 'resource_missing') throw error;
        stripeAccountId = '';
      }
    }

    // 3. DB保存に失敗した既存アカウントを、町内会IDまたは名称+代表者メールで一意に復旧
    if (!stripeAccountId) {
      const recoveredAccount = await findRecoverableStripeAccount(stripe, town, adminData?.admin_email);
      if (recoveredAccount) {
        stripeAccount = recoveredAccount;
        stripeAccountId = recoveredAccount.id;
        await stripe.accounts.update(stripeAccountId, {
          metadata: { el_town_neighborhood_id: String(townId) },
        });
        await updateNeighborhoodStripe(writeClient, townId, stripeAccountStatusPayload(recoveredAccount, stripeMode));
      }
    }

    const requestedBusinessType = String(onboarding.businessType || stripeAccount?.business_type || 'non_profit');
    // The neighborhood record is the tenant identity. Do not allow a stale value
    // from a previously linked Stripe account (for example "el-town") to replace it.
    const organizationName = String(town.name || '').trim();
    const supportEmail = String(onboarding.supportEmail || stripeAccount?.business_profile?.support_email || stripeAccount?.email || adminData?.admin_email || '').trim();
    const supportPhone = String(onboarding.supportPhone || stripeAccount?.business_profile?.support_phone || '').trim();
    const website = String(onboarding.website || stripeAccount?.business_profile?.url || baseUrl).trim();
    const productDescription = String(onboarding.productDescription || stripeAccount?.business_profile?.product_description || '町内会・自治会の会員世帯から、年度ごとの会費を受け付けます。').trim();

    if (!allowedBusinessTypes.has(requestedBusinessType)) {
      return NextResponse.json({ error: '組織区分の選択が正しくありません。' }, { status: 400 });
    }
    if (!organizationName) {
      return NextResponse.json({ error: 'Stripeへ登録する町内会・自治会名を入力してください。' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      return NextResponse.json({ error: 'Stripe連絡先メールアドレスを正しく入力してください。' }, { status: 400 });
    }
    if (supportPhone && !/^[0-9+() -]{8,20}$/.test(supportPhone)) {
      return NextResponse.json({ error: '電話番号を正しく入力してください。' }, { status: 400 });
    }
    try {
      const parsedWebsite = new URL(website);
      if (!['http:', 'https:'].includes(parsedWebsite.protocol)) throw new Error('invalid protocol');
    } catch {
      return NextResponse.json({ error: 'WebサイトURLを正しく入力してください。' }, { status: 400 });
    }
    if (productDescription.length < 10 || productDescription.length > 500) {
      return NextResponse.json({ error: 'サービス内容は10〜500文字で入力してください。' }, { status: 400 });
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
        business_type: requestedBusinessType as Stripe.AccountCreateParams.BusinessType,
        business_profile: {
          name: organizationName,
          url: website,
          product_description: productDescription,
          support_email: supportEmail,
          ...(supportPhone ? { support_phone: supportPhone } : {}),
        },
        metadata: {
          el_town_neighborhood_id: String(townId),
        },
      };

      accountParams.email = supportEmail;

      const account = await stripe.accounts.create(accountParams);
      stripeAccount = account;
      stripeAccountId = account.id;

      // DBに保存
      try {
        await updateNeighborhoodStripe(writeClient, townId, stripeAccountStatusPayload(account, stripeMode));
      } catch (updateError) {
        console.error('Failed to save stripe_account_id to DB', updateError);
        return NextResponse.json({ error: 'Failed to save account' }, { status: 500 });
      }
    }

    // 5. el-townで確定できる町内会・自治会情報を事前入力する。
    await stripe.accounts.update(stripeAccountId, {
      business_profile: {
        name: organizationName,
        url: website,
        product_description: productDescription,
        support_email: supportEmail,
        ...(supportPhone ? { support_phone: supportPhone } : {}),
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
