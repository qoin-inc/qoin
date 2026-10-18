import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isStagingInviteTarget, isStagingSystemAdmin } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

type Action = 'finalizeFee' | 'unlockFee' | 'finalizeAssembly' | 'unlockAssembly';
const actions: Action[] = ['finalizeFee', 'unlockFee', 'finalizeAssembly', 'unlockAssembly'];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const townId = String(body?.townId ?? '');
  const fiscalYear = Number(body?.fiscalYear);
  const action = body?.action as Action;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || !/^[1-9]\d{0,14}$/.test(townId)
    || !Number.isInteger(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2200
    || !actions.includes(action)
    || (action.startsWith('unlock') && (reason.length < 3 || reason.length > 500))) {
    return json({ error: '町内会、対象年度、操作内容を確認してください。' }, 400);
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
  try {
    const admin = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user?.id) return json({ error: '管理者ログインの有効期限が切れています。' }, 401);
    const [{ data: membership, error: membershipError }, { data: town, error: townError }] = await Promise.all([
      admin.from('neighborhood_admins').select('id').eq('neighborhood_id', townId)
        .eq('admin_auth_id', auth.user.id).eq('status', 'active').maybeSingle(),
      admin.from('neighborhoods').select('admin_auth_id').eq('id', townId).maybeSingle(),
    ]);
    if (membershipError || townError) throw membershipError || townError;
    if (!membership || !town) return json({ error: 'この町内会・自治会の操作権限がありません。' }, 403);
    const representative = String(town.admin_auth_id || '').toLowerCase() === auth.user.id.toLowerCase();
    if (action.startsWith('unlock') && !representative) {
      return json({ error: '年度確定を解除できるのは代表者だけです。' }, 403);
    }

    const table = action.endsWith('Fee') ? 'fee_year_closures' : 'assembly_year_closures';
    const { data: closure, error: closureError } = await admin.from(table)
      .select('status').eq('neighborhood_id', townId).eq('fiscal_year', fiscalYear).maybeSingle();
    if (closureError) throw closureError;
    if (action.startsWith('finalize')) {
      if (closure?.status === 'locked') return json({ error: 'この年度は確定済みです。' }, 409);
      if (closure?.status === 'unlocked' && !representative) {
        return json({ error: '再確定できるのは代表者だけです。' }, 403);
      }
    } else if (closure?.status !== 'locked') {
      return json({ error: 'この年度は確定されていません。' }, 409);
    }

    const actor = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const functionName = ({ finalizeFee: 'finalize_fee_year', unlockFee: 'unlock_fee_year',
      finalizeAssembly: 'finalize_assembly_year', unlockAssembly: 'unlock_assembly_year' } as const)[action];
    const { data, error } = await actor.rpc(functionName, {
      p_neighborhood_id: Number(townId), p_fiscal_year: fiscalYear,
      ...(action.startsWith('unlock') ? { p_reason: reason } : {}),
    });
    if (error) {
      console.error('[admin-year-closure] RPC failed', { action, code: error.code, message: error.message });
      return json({ error: '年度確定の操作を完了できませんでした。' }, 503);
    }
    return json({ data });
  } catch (error) {
    console.error('[admin-year-closure] operation failed', { action, message: String((error as Error)?.message || 'unknown') });
    return json({ error: '年度確定の操作を完了できませんでした。' }, 503);
  }
}
