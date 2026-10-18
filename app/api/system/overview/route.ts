import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isStagingInviteTarget, isStagingSystemAdmin } from '@/lib/stagingInviteTarget';
import { isSystemAdminRequest } from '@/lib/systemAdminServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

export async function GET(request: NextRequest) {
  if (!isSystemAdminRequest(request)) return json({ error: 'システム管理者の認証が必要です。' }, 401);
  const billingMonth = new URL(request.url).searchParams.get('billingMonth') || '';
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(billingMonth);
  if (!match) return json({ error: '対象月を確認してください。' }, 400);
  const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1) - 9 * 3600000).toISOString();
  const end = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1) - 9 * 3600000).toISOString();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const systemAdminId = process.env.STAGING_SYSTEM_ADMIN_AUTH_ID || '';
  if (!secret || !isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')
    || !isStagingSystemAdmin(systemAdminId, systemAdminId)) {
    return json({ error: '検証環境の接続先を確認できません。' }, 503);
  }
  try {
    const admin = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data: systemAdmin, error: systemAdminError } = await admin.auth.admin.getUserById(systemAdminId);
    if (systemAdminError || !isStagingSystemAdmin(systemAdmin.user?.id || '', systemAdminId)) {
      return json({ error: '検証用システム管理者を確認できません。' }, 503);
    }
    const results = await Promise.all([
      admin.from('neighborhoods').select('id,name,created_at').order('id', { ascending: false }).limit(1000),
      admin.from('resident_rosters').select('id,neighborhood_id,withdrawal_status,user_auth_id,family_user_auth_id_1,family_user_auth_id_2,family_withdrawal_status_1,family_withdrawal_status_2').limit(20000),
      admin.from('neighborhood_admins').select('id,neighborhood_id,status,admin_email').limit(5000),
      admin.from('circulars').select('id,neighborhood_id,created_at,is_pushed').eq('is_pushed', true).gte('created_at', start).lt('created_at', end).limit(20000),
      admin.from('system_settings').select('*').limit(1000),
      admin.from('system_usage_billings').select('*').eq('billing_month', billingMonth).limit(1000),
      admin.from('system_usage_payment_profiles').select('*').limit(1000),
      admin.from('membership_fee_standard_versions').select('*').order('version_number', { ascending: false }).limit(100),
      admin.from('neighborhood_fee_settings').select('*').limit(1000),
      admin.from('system_usage_rate_versions').select('*').order('effective_month', { ascending: false }).limit(1000),
    ]);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
    return json({ results: results.map((result) => ({ data: result.data || [] })) });
  } catch (error) {
    console.error('[system-overview] read failed', { message: String((error as Error)?.message || 'unknown') });
    return json({ error: 'システム管理情報を取得できませんでした。' }, 503);
  }
}
