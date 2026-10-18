import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isStagingInviteTarget, isStagingSystemAdmin } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});
const positiveId = (value: unknown) => /^[1-9]\d{0,14}$/.test(String(value ?? ''));
const uuid = (value: unknown) => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const amount = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 2147483647;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const mode = body?.mode;
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || !positiveId(body.townId) || !Number.isInteger(body.fiscalYear)
    || body.fiscalYear < 2000 || body.fiscalYear > 2200
    || !['billing', 'cash'].includes(mode)
    || !Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > 5000
    || (mode === 'cash' && body.rows.length !== 1)
    || body.rows.some((row: unknown) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return true;
      const item = row as Record<string, unknown>;
      return !uuid(item.rosterId) || !amount(item.billingAmount)
        || (mode === 'cash' && !amount(item.cashAmount));
    })) {
    return json({ error: '会費の入力内容を確認してください。' }, 400);
  }
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  if (!token) return json({ error: '管理者ログインを確認できません。' }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const systemAdminId = process.env.STAGING_SYSTEM_ADMIN_AUTH_ID || '';
  if (!secret || !anonKey || !isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')
    || !isStagingSystemAdmin(systemAdminId, systemAdminId)) {
    return json({ error: '検証環境の設定を確認できません。' }, 503);
  }
  const townId = String(body.townId);
  const fiscalYear = Number(body.fiscalYear);
  try {
    const admin = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user?.id) return json({ error: '管理者ログインの有効期限が切れています。' }, 401);
    const [{ data: membership, error: membershipError }, { data: town, error: townError },
      { data: closure, error: closureError }] = await Promise.all([
      admin.from('neighborhood_admins').select('id').eq('neighborhood_id', townId)
        .eq('admin_auth_id', auth.user.id).eq('status', 'active').maybeSingle(),
      admin.from('neighborhoods').select('admin_auth_id').eq('id', townId).maybeSingle(),
      admin.from('fee_year_closures').select('status').eq('neighborhood_id', townId)
        .eq('fiscal_year', fiscalYear).maybeSingle(),
    ]);
    if (membershipError || townError || closureError) throw membershipError || townError || closureError;
    if (!membership || !town) return json({ error: 'この町内会・自治会の操作権限がありません。' }, 403);
    if (closure?.status === 'locked') return json({ error: 'この年度は確定済みです。' }, 409);
    if (closure?.status === 'unlocked' && (mode === 'billing'
      || String(town.admin_auth_id || '').toLowerCase() !== auth.user.id.toLowerCase())) {
      return json({ error: '確定解除中は代表者による個別訂正だけが可能です。' }, 403);
    }
    const actor = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data, error } = await actor.rpc('write_fee_records', {
      p_neighborhood_id: Number(townId), p_fiscal_year: fiscalYear,
      p_mode: mode, p_rows: body.rows,
    });
    if (error) {
      console.error('[admin-fee-records] RPC failed', { code: error.code, message: error.message });
      return json({ error: '会費を保存できませんでした。' }, 503);
    }
    return json({ data });
  } catch (error) {
    console.error('[admin-fee-records] operation failed', {
      message: String((error as Error)?.message || 'unknown'),
    });
    return json({ error: '会費を保存できませんでした。' }, 503);
  }
}
