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
  const kind = params.get('kind') || '';
  const fiscalYear = params.get('fiscalYear') || '';
  if (!/^[1-9]\d{0,14}$/.test(townId) || !['feeClosures', 'assembly'].includes(kind)
    || (kind === 'assembly' && (!/^\d{4}$/.test(fiscalYear) || Number(fiscalYear) < 1900 || Number(fiscalYear) > 2200))) {
    return json({ error: '町内会または対象年度を確認してください。' }, 400);
  }
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
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
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user?.id) return json({ error: '管理者ログインの有効期限が切れています。' }, 401);
    const { data: membership, error: membershipError } = await admin.from('neighborhood_admins')
      .select('id').eq('neighborhood_id', townId).eq('admin_auth_id', auth.user.id)
      .eq('status', 'active').maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return json({ error: 'この町内会・自治会の閲覧権限がありません。' }, 403);

    if (kind === 'feeClosures') {
      const { data, error } = await admin.from('fee_year_closures')
        .select('id,neighborhood_id,fiscal_year,status,revision,locked_at,unlocked_at,unlock_reason')
        .eq('neighborhood_id', townId).order('fiscal_year', { ascending: false });
      if (error) throw error;
      return json({ closures: data || [] });
    }

    const { data: closure, error: closureError } = await admin.from('assembly_year_closures')
      .select('id,neighborhood_id,fiscal_year,status,revision,locked_at,unlocked_at,unlock_reason')
      .eq('neighborhood_id', townId).eq('fiscal_year', Number(fiscalYear)).maybeSingle();
    const closureMessage = String(closureError?.message || '').toLowerCase();
    const missingClosureSchema = closureError?.code === 'PGRST205'
      || closureMessage.includes('schema cache') || closureMessage.includes('does not exist');
    if (closureError && !missingClosureSchema) throw closureError;
    if (closure?.status === 'locked') {
      const { data: snapshot, error: snapshotError } = await admin.from('assembly_year_snapshots')
        .select('categories,budgets,settlements,fee_rows,fee_revenue')
        .eq('closure_id', closure.id).eq('revision', closure.revision).maybeSingle();
      if (snapshotError) throw snapshotError;
      if (!snapshot) return json({ error: '確定済み総会会計の固定データを取得できませんでした。' }, 503);
      return json({ closure, closureAvailable: true, snapshot });
    }

    const [categories, budgets, settlements] = await Promise.all([
      admin.from('assembly_categories').select('*').eq('neighborhood_id', townId)
        .order('sort_order', { ascending: true }).order('id', { ascending: true }),
      admin.from('assembly_budgets').select('*').eq('neighborhood_id', townId)
        .eq('fiscal_year', Number(fiscalYear)),
      admin.from('assembly_settlements').select('*').eq('neighborhood_id', townId)
        .eq('fiscal_year', Number(fiscalYear))
        .order('paid_date', { ascending: false }).order('id', { ascending: false }),
    ]);
    const failure = [categories, budgets, settlements].find((result) => result.error);
    if (failure?.error) throw failure.error;
    return json({ closure: missingClosureSchema ? null : closure, closureAvailable: !missingClosureSchema,
      categories: categories.data || [], budgets: budgets.data || [], settlements: settlements.data || [] });
  } catch (error) {
    const message = String((error as Error)?.message || 'unknown');
    console.error('[admin-accounting-read] read failed', { message });
    const missingSchema = ['assembly_categories', 'assembly_budgets', 'assembly_settlements', 'schema cache']
      .some((name) => message.toLowerCase().includes(name));
    return json({ error: missingSchema
      ? '総会会計DBが未作成です。docs/sql/assembly_accounting_columns_2026-07-09.sql をSupabase SQL Editorで実行してください。'
      : '会計データを取得できませんでした。' }, 503);
  }
}
