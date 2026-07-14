import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const createSupabaseClient = (key: string, authorization?: string) => createClient(supabaseUrl, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: authorization ? { headers: { Authorization: authorization } } : undefined,
});

const missingColumnFromError = (error: any) => {
  const message = String(error?.message || '');
  const quoted = message.match(/'([^']+)' column/);
  if (quoted?.[1]) return quoted[1];
  const plain = message.match(/column ["']?([a-zA-Z0-9_]+)["']?/);
  return plain?.[1] || '';
};

export const getStripeMode = (stripeKey: string) => (stripeKey.includes('_live_') ? 'live' : 'test');

export const createStripeClient = () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error('Stripe API key is not configured.');

  return {
    stripe: new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' as any }),
    stripeMode: getStripeMode(stripeKey),
  };
};

export const requireNeighborhoodAdmin = async (req: Request, townId: string | number) => {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase is not configured.');

  const authorization = req.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('管理者ログインを確認できません。再ログインしてください。');

  const client = createSupabaseClient(supabaseAnonKey, `Bearer ${token}`);
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) throw new Error('管理者セッションが無効です。再ログインしてください。');

  const { data: admin, error: adminError } = await client
    .from('neighborhood_admins')
    .select('id, neighborhood_id, status')
    .eq('admin_auth_id', userData.user.id)
    .eq('neighborhood_id', townId)
    .eq('status', 'active')
    .maybeSingle();

  if (adminError || !admin) throw new Error('この町内会・自治会のStripe連携を操作する権限がありません。');

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const writeClient = serviceRoleKey ? createSupabaseClient(serviceRoleKey) : client;
  return { client, writeClient, user: userData.user };
};

export const createWebhookSupabaseClient = () => {
  if (!supabaseUrl) throw new Error('Supabase is not configured.');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createSupabaseClient(serviceRoleKey);
};

export const updateNeighborhoodStripe = async (
  client: SupabaseClient,
  townId: string | number,
  payload: Record<string, any>,
) => {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await client
      .from('neighborhoods')
      .update(nextPayload)
      .eq('id', townId)
      .select('id, stripe_account_id')
      .maybeSingle();

    if (!error && data) return data;
    if (!error && !data) throw new Error('Stripe連携情報を保存できませんでした。管理者権限またはRLS設定を確認してください。');

    const missingColumn = missingColumnFromError(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
      delete nextPayload[missingColumn];
      continue;
    }

    throw error;
  }

  throw new Error('Stripe連携情報を保存できませんでした。');
};

export const stripeAccountStatusPayload = (account: Stripe.Account, stripeMode: string) => {
  const active = Boolean(account.charges_enabled && account.payouts_enabled);
  return {
    stripe_account_id: account.id,
    stripe_account_mode: stripeMode,
    stripe_onboarding_status: active ? 'active' : account.details_submitted ? 'reviewing' : 'pending',
    stripe_charges_enabled: account.charges_enabled,
    stripe_payouts_enabled: account.payouts_enabled,
    stripe_details_submitted: account.details_submitted,
    stripe_account_updated_at: new Date().toISOString(),
  };
};

export const findRecoverableStripeAccount = async (
  stripe: Stripe,
  town: any,
  adminEmail?: string | null,
) => {
  const townId = String(town.id);
  const accounts: Stripe.Account[] = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const result = await stripe.accounts.list({ limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    accounts.push(...result.data);
    if (!result.has_more || result.data.length === 0) break;
    startingAfter = result.data[result.data.length - 1].id;
  }

  const metadataMatches = accounts.filter((account) => account.metadata?.el_town_neighborhood_id === townId);
  if (metadataMatches.length === 1) return metadataMatches[0];
  if (metadataMatches.length > 1) throw new Error('同じ町内会IDのStripeアカウントが複数あります。Stripeサポートで重複を確認してください。');

  if (!adminEmail || !town.name) return null;
  const normalizedEmail = String(adminEmail).trim().toLowerCase();
  const normalizedName = String(town.name).trim();
  const identityMatches = accounts.filter((account) => (
    account.type === 'express'
    && String(account.email || '').trim().toLowerCase() === normalizedEmail
    && String(account.business_profile?.name || '').trim() === normalizedName
  ));

  if (identityMatches.length === 1) return identityMatches[0];
  if (identityMatches.length > 1) throw new Error('同じ名称・メールアドレスのStripeアカウントが複数あります。Stripeサポートで重複を確認してください。');
  return null;
};
