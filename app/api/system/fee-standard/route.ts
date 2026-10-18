import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isStagingInviteTarget, isStagingSystemAdmin } from '@/lib/stagingInviteTarget';
import { isSystemAdminRequest } from '@/lib/systemAdminServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

export async function POST(request: NextRequest) {
  if (!isSystemAdminRequest(request)) return json({ error: 'システム管理者の認証が必要です。' }, 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: '標準会費の内容を確認してください。' }, 400);
  const feeName = String(body.feeName || '').trim();
  const amount = Number(body.amount);
  const revenueCategory = String(body.revenueCategory || '').trim();
  const changeReason = String(body.changeReason || '').trim();
  if (!feeName || feeName.length > 100 || !Number.isSafeInteger(amount) || amount < 0 || amount > 10000000
    || !revenueCategory || revenueCategory.length > 100 || !changeReason || changeReason.length > 500
    || typeof body.cashEnabled !== 'boolean' || typeof body.stripeCardEnabled !== 'boolean') {
    return json({ error: '標準会費の入力内容を確認してください。' }, 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const systemAdminId = process.env.STAGING_SYSTEM_ADMIN_AUTH_ID || '';
  if (!secret || !anonKey || !isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')
    || !isStagingSystemAdmin(systemAdminId, systemAdminId)) {
    return json({ error: '検証環境の接続先を確認できません。' }, 503);
  }
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  if (!token) return json({ error: 'システム管理者のDBセッションが必要です。' }, 401);
  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
  try {
    const { data: systemAdmin, error: systemAdminError } = await admin.auth.getUser(token);
    if (systemAdminError || !isStagingSystemAdmin(systemAdmin.user?.id || '', systemAdminId)) {
      return json({ error: '検証用システム管理者を確認できません。' }, 403);
    }
    const actor = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data: latest, error: latestError } = await admin.from('membership_fee_standard_versions')
      .select('version_number').order('version_number', { ascending: false }).limit(1);
    if (latestError) throw latestError;
    const nextVersion = Number(latest?.[0]?.version_number || 0) + 1;
    const { data: draft, error: insertError } = await admin.from('membership_fee_standard_versions').insert({
      version_number: nextVersion, status: 'draft', fee_name: feeName, default_amount: amount,
      billing_frequency: 'annual', billing_target: 'active_households',
      cash_enabled: body.cashEnabled, stripe_card_enabled: body.stripeCardEnabled,
      revenue_category: revenueCategory, change_reason: changeReason,
    }).select('id').single();
    if (insertError || !draft) {
      if (insertError?.code === '23505') return json({ error: '別の更新が先に保存されました。再読み込みしてください。' }, 409);
      throw insertError || new Error('Draft insert returned no row');
    }
    const { error: publishError } = await actor.rpc('publish_membership_fee_standard', { p_version_id: draft.id });
    if (publishError) {
      const { error: cleanupError } = await admin.from('membership_fee_standard_versions').delete().eq('id', draft.id).eq('status', 'draft');
      if (cleanupError) console.error('[system-fee-standard] cleanup failed', { id: draft.id, message: cleanupError.message });
      throw publishError;
    }
    return json({ version: nextVersion }, 201);
  } catch (error) {
    console.error('[system-fee-standard] publish failed', { message: String((error as Error)?.message || 'unknown') });
    return json({ error: '標準会費を公開できませんでした。' }, 503);
  }
}
