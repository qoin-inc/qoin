import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isStagingInviteTarget, isStagingSystemAdmin } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const townId = params.get('townId') || '';
  const monthStart = params.get('monthStart') || '';
  const monthEnd = params.get('monthEnd') || '';
  if (!/^[1-9]\d{0,14}$/.test(townId)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(monthStart)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(monthEnd)
    || !Number.isFinite(Date.parse(monthStart)) || !Number.isFinite(Date.parse(monthEnd))
    || Date.parse(monthEnd) <= Date.parse(monthStart)
    || Date.parse(monthEnd) - Date.parse(monthStart) > 32 * 86400000) {
    return json({ error: '町内会または対象月を確認してください。' }, 400);
  }
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!token) return json({ error: '管理者ログインを確認できません。' }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const systemAdminId = process.env.STAGING_SYSTEM_ADMIN_AUTH_ID || '';
  if (!secret || !isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')
    || !isStagingSystemAdmin(systemAdminId, systemAdminId)) {
    return json({ error: '検証環境の設定を確認できません。' }, 503);
  }
  try {
    const admin = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data: systemAdmin, error: systemAdminError } = await admin.auth.admin.getUserById(systemAdminId);
    if (systemAdminError || !isStagingSystemAdmin(systemAdmin.user?.id || '', systemAdminId)) {
      return json({ error: '検証環境の管理者を確認できません。' }, 503);
    }
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user?.id) return json({ error: '管理者ログインの有効期限が切れています。' }, 401);
    const { data: membership, error: membershipError } = await admin.from('neighborhood_admins')
      .select('id').eq('neighborhood_id', townId).eq('admin_auth_id', auth.user.id)
      .eq('status', 'active').maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return json({ error: 'この町内会・自治会の閲覧権限がありません。' }, 403);

    const names = [
      'townInfo', 'billingRows', 'memberRows', 'pushes', 'feeRecords', 'feeSetting',
      'systemUsageBillings', 'systemPaymentProfile', 'settings', 'circulars',
      'facilities', 'reservations', 'liveSessions', 'liveApplications', 'rateVersions',
    ] as const;
    const results = await Promise.all([
      admin.from('neighborhoods').select('id,name,created_at,prefecture,households,admin_name,admin_email,status,admin_auth_id,postal_code,lat,lng,stripe_account_id,stripe_mode,fiscal_start_month,contract_agreed,contract_agreed_at,contract_signatory,stripe_account_mode,stripe_onboarding_status,stripe_charges_enabled,stripe_payouts_enabled,stripe_details_submitted,stripe_account_updated_at,stripe_paypay_status,stripe_paypay_last_error,stripe_paypay_updated_at').eq('id', townId).maybeSingle(),
      admin.from('resident_rosters').select('*').eq('neighborhood_id', townId).limit(10000),
      admin.from('resident_rosters').select('*').eq('neighborhood_id', townId).order('id', { ascending: false }).limit(1000),
      admin.from('circulars').select('id', { count: 'exact', head: true }).eq('neighborhood_id', townId)
        .eq('is_pushed', true).gte('created_at', monthStart).lt('created_at', monthEnd),
      admin.from('fee_records').select('*').eq('neighborhood_id', townId),
      admin.from('neighborhood_fee_settings').select('*').eq('neighborhood_id', townId).maybeSingle(),
      admin.from('system_usage_billings').select('*').eq('neighborhood_id', townId).order('billing_month', { ascending: false }).limit(36),
      admin.from('system_usage_payment_profiles').select('*').eq('neighborhood_id', townId).maybeSingle(),
      admin.from('system_settings').select('*').eq('neighborhood_id', townId).maybeSingle(),
      admin.from('circulars').select('*').eq('neighborhood_id', townId).order('created_at', { ascending: false }).limit(30),
      admin.from('facilities').select('*').eq('neighborhood_id', townId).order('name', { ascending: true }).limit(100),
      admin.from('facility_reservations').select('*').eq('neighborhood_id', townId).order('reservation_date', { ascending: false }).limit(500),
      admin.from('live_sessions').select('*').eq('neighborhood_id', townId).order('starts_at', { ascending: false }).limit(6),
      admin.from('live_session_applications').select('*').eq('neighborhood_id', townId).order('applied_at', { ascending: false }).limit(200),
      admin.from('system_usage_rate_versions').select('*').order('effective_month', { ascending: false }).limit(1000),
    ]);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
    const data: Record<string, unknown> = {};
    results.forEach((result, index) => { data[names[index]] = result; });
    const circularIds = (results[9].data || []).map((row: { id: number }) => row.id);
    if (circularIds.length) {
      const replies = await admin.from('event_applications').select('*')
        .eq('neighborhood_id', townId).in('circular_id', circularIds).limit(1000);
      if (replies.error) throw replies.error;
      data.replyRows = replies.data || [];
    } else {
      data.replyRows = [];
    }
    return json(data);
  } catch (error) {
    console.error('[admin-dashboard] read failed', { message: String((error as Error)?.message || 'unknown') });
    return json({ error: '管理画面データを取得できませんでした。' }, 503);
  }
}
