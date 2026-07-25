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
    const { townId } = await req.json();
    if (!townId) return NextResponse.json({ error: 'townId is required' }, { status: 400 });

    const { client, writeClient } = await requireNeighborhoodAdmin(req, townId);
    const { stripe, stripeMode } = createStripeClient();

    const { data: town, error: townError } = await client
      .from('neighborhoods')
      .select('*')
      .eq('id', townId)
      .single();
    if (townError || !town) return NextResponse.json({ error: 'Neighborhood not found' }, { status: 404 });

    const { data: adminData } = await client
      .from('neighborhood_admins')
      .select('admin_email')
      .eq('neighborhood_id', townId)
      .eq('status', 'active')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    let account: Stripe.Account | null = null;
    if (town.stripe_account_id && (!town.stripe_account_mode || town.stripe_account_mode === stripeMode)) {
      try {
        account = await stripe.accounts.retrieve(town.stripe_account_id);
      } catch (error: any) {
        if (error?.code !== 'resource_missing') throw error;
      }
    }

    if (!account) {
      account = await findRecoverableStripeAccount(stripe, town, adminData?.admin_email);
    }

    if (!account) {
      return NextResponse.json({ error: 'Stripe側の既存Connectアカウントを一意に確認できませんでした。新規登録は行っていません。' }, { status: 404 });
    }

    if (account.metadata?.el_town_neighborhood_id !== String(townId)) {
      account = await stripe.accounts.update(account.id, {
        metadata: { el_town_neighborhood_id: String(townId) },
      });
    }

    const neighborhoodName = String(town.name || '').trim();
    if (neighborhoodName && String(account.business_profile?.name || '').trim() !== neighborhoodName) {
      account = await stripe.accounts.update(account.id, {
        business_profile: {
          name: neighborhoodName,
        },
        metadata: { el_town_neighborhood_id: String(townId) },
      });
    }

    let payoutAccounts: Array<{
      id: string;
      bankName: string;
      last4: string;
      currency: string;
      country: string;
      defaultForCurrency: boolean;
      status: string;
    }> = [];
    try {
      const externalAccounts = await stripe.accounts.listExternalAccounts(account.id, {
        object: 'bank_account',
        limit: 10,
      });
      payoutAccounts = externalAccounts.data
        .filter((externalAccount): externalAccount is Stripe.BankAccount => externalAccount.object === 'bank_account')
        .map((bankAccount) => ({
          id: bankAccount.id,
          bankName: bankAccount.bank_name || '登録済み銀行',
          last4: bankAccount.last4 || '',
          currency: String(bankAccount.currency || '').toUpperCase(),
          country: bankAccount.country || '',
          defaultForCurrency: Boolean(bankAccount.default_for_currency),
          status: bankAccount.status || '',
        }));
    } catch (externalAccountError) {
      console.warn('Stripe payout account lookup failed:', externalAccountError);
    }

    const statusPayload = stripeAccountStatusPayload(account, stripeMode);
    await updateNeighborhoodStripe(writeClient, townId, statusPayload);

    return NextResponse.json({
      town: statusPayload,
      status: statusPayload.stripe_onboarding_status,
      onboardingProfile: {
        businessType: account.business_type || 'non_profit',
        organizationName: neighborhoodName,
        supportEmail: account.business_profile?.support_email || account.email || adminData?.admin_email || '',
        supportPhone: account.business_profile?.support_phone || '',
        website: account.business_profile?.url || '',
        productDescription: account.business_profile?.product_description || '',
      },
      payoutAccounts,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        pastDue: account.requirements?.past_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        disabledReason: account.requirements?.disabled_reason || '',
      },
    });
  } catch (err: any) {
    console.error('Stripe sync error:', err);
    const message = String(err?.message || 'Stripe連携状態の同期に失敗しました。');
    const status = message.includes('ログイン') ? 401 : message.includes('権限') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
