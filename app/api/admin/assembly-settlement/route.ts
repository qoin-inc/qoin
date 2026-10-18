import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isStagingInviteTarget, isStagingSystemAdmin } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

const positiveId = (value: unknown) => /^[1-9]\d{0,14}$/.test(String(value ?? ''));
const validYear = (value: unknown) => Number.isInteger(value) && Number(value) >= 2000 && Number(value) <= 2200;
const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

async function operate(request: NextRequest, action: 'create' | 'delete') {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || !positiveId(body.townId) || !validYear(body.fiscalYear)
    || (action === 'create' && (!positiveId(body.categoryId)
      || !Number.isSafeInteger(body.amount) || body.amount <= 0 || body.amount > 2147483647
      || !validDate(body.paidDate) || typeof body.description !== 'string' || body.description.length > 500))
    || (action === 'delete' && !positiveId(body.settlementId))) {
    return json({ error: '決算明細の入力内容を確認してください。' }, 400);
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
      admin.from('assembly_year_closures').select('status').eq('neighborhood_id', townId)
        .eq('fiscal_year', fiscalYear).maybeSingle(),
    ]);
    if (membershipError || townError || closureError) throw membershipError || townError || closureError;
    if (!membership || !town) return json({ error: 'この町内会・自治会の操作権限がありません。' }, 403);
    if (closure?.status === 'locked') return json({ error: 'この年度は確定済みです。' }, 409);
    if (closure?.status === 'unlocked'
      && String(town.admin_auth_id || '').toLowerCase() !== auth.user.id.toLowerCase()) {
      return json({ error: '訂正中の年度を操作できるのは代表者だけです。' }, 403);
    }
    if (action === 'create') {
      const { data: category, error: categoryError } = await admin.from('assembly_categories')
        .select('id,type,name,parent_id,is_active').eq('id', body.categoryId).eq('neighborhood_id', townId).maybeSingle();
      if (categoryError) throw categoryError;
      if (!category || !category.is_active || (category.type === 'income' && category.parent_id === null
        && category.name?.trim() === '会費')) {
        return json({ error: '利用できる決算科目を選択してください。' }, 400);
      }
    } else {
      const { data: row, error: rowError } = await admin.from('assembly_settlements')
        .select('id,source_type,source_id').eq('id', body.settlementId)
        .eq('neighborhood_id', townId).eq('fiscal_year', fiscalYear).maybeSingle();
      if (rowError) throw rowError;
      if (!row) return json({ error: '決算明細が見つかりません。' }, 404);
      if (row.source_type !== null || row.source_id !== null) {
        return json({ error: '自動作成された明細はここから削除できません。' }, 403);
      }
    }
    const actor = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data, error } = action === 'create'
      ? await actor.rpc('create_assembly_settlement', {
        p_neighborhood_id: Number(townId), p_fiscal_year: fiscalYear,
        p_category_id: Number(body.categoryId), p_amount: body.amount,
        p_paid_date: body.paidDate, p_description: body.description,
      })
      : await actor.rpc('delete_assembly_settlement', {
        p_neighborhood_id: Number(townId), p_fiscal_year: fiscalYear,
        p_settlement_id: Number(body.settlementId),
      });
    if (error) {
      console.error('[admin-assembly-settlement] RPC failed', { action, code: error.code, message: error.message });
      return json({ error: '決算明細の操作を完了できませんでした。' }, 503);
    }
    if (action === 'delete' && data === false) return json({ error: '決算明細が見つかりません。' }, 404);
    return json({ data });
  } catch (error) {
    console.error('[admin-assembly-settlement] operation failed', { action,
      message: String((error as Error)?.message || 'unknown') });
    return json({ error: '決算明細の操作を完了できませんでした。' }, 503);
  }
}

export const POST = (request: NextRequest) => operate(request, 'create');
export const DELETE = (request: NextRequest) => operate(request, 'delete');
