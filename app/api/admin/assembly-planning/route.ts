import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isStagingInviteTarget, isStagingSystemAdmin } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});
const positiveId = (value: unknown) => /^[1-9]\d{0,14}$/.test(String(value ?? ''));
const int32 = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 2147483647;

type Action = 'categoryCreate' | 'categoryUpdate' | 'categoryDelete' | 'budgetSave';
const actions: Action[] = ['categoryCreate', 'categoryUpdate', 'categoryDelete', 'budgetSave'];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const action = body?.action as Action;
  if (!body || typeof body !== 'object' || Array.isArray(body) || !actions.includes(action)
    || !positiveId(body.townId) || !Number.isInteger(body.fiscalYear)
    || body.fiscalYear < 2000 || body.fiscalYear > 2200) {
    return json({ error: '町内会・年度・操作内容を確認してください。' }, 400);
  }
  if (action === 'categoryCreate' || action === 'categoryUpdate') {
    if ((action === 'categoryUpdate' && !positiveId(body.categoryId))
      || (body.parentId !== null && !positiveId(body.parentId))
      || !['income', 'expense'].includes(body.type)
      || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100
      || !Number.isInteger(body.sortOrder) || body.sortOrder < -100000 || body.sortOrder > 100000) {
      return json({ error: '科目の入力内容を確認してください。' }, 400);
    }
  }
  if (action === 'categoryDelete' && !positiveId(body.categoryId)) {
    return json({ error: '削除する科目を確認してください。' }, 400);
  }
  if (action === 'budgetSave' && (!Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > 500
    || body.rows.some((row: unknown) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return true;
      const item = row as Record<string, unknown>;
      return !positiveId(item.categoryId) || !int32(item.amount) || !int32(item.previousAmount)
        || typeof item.note !== 'string' || item.note.length > 500;
    }))) {
    return json({ error: '予算の入力内容を確認してください。' }, 400);
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
    const representative = String(town.admin_auth_id || '').toLowerCase() === auth.user.id.toLowerCase();
    if (closure?.status === 'locked') return json({ error: 'この年度は確定済みです。' }, 409);
    if (closure?.status === 'unlocked' && !representative) {
      return json({ error: '訂正中の年度を操作できるのは代表者だけです。' }, 403);
    }
    if (action !== 'budgetSave') {
      if (closure?.status === 'unlocked') {
        return json({ error: '確定解除中の科目変更は監査対象外のため停止しています。' }, 409);
      }
      if (action !== 'categoryCreate') {
        const { count, error: historyError } = await admin.from('assembly_year_closures')
          .select('id', { count: 'exact', head: true }).eq('neighborhood_id', townId);
        if (historyError) throw historyError;
        if (count) return json({ error: '過年度の確定履歴があるため、共通科目の更新・削除は停止しています。' }, 409);
      }
    }
    const actor = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data, error } = action === 'budgetSave'
      ? await actor.rpc('save_assembly_budgets', {
        p_neighborhood_id: Number(townId), p_fiscal_year: fiscalYear, p_rows: body.rows,
      })
      : await actor.rpc('manage_assembly_category', {
        p_neighborhood_id: Number(townId), p_fiscal_year: fiscalYear,
        p_action: action === 'categoryCreate' ? 'create' : action === 'categoryUpdate' ? 'update' : 'delete',
        p_category_id: action === 'categoryCreate' ? null : Number(body.categoryId),
        p_type: action === 'categoryDelete' ? null : body.type,
        p_name: action === 'categoryDelete' ? null : body.name.trim(),
        p_parent_id: action === 'categoryDelete' ? null : body.parentId === null ? null : Number(body.parentId),
        p_sort_order: action === 'categoryDelete' ? null : body.sortOrder,
      });
    if (error) {
      console.error('[admin-assembly-planning] RPC failed', { action, code: error.code, message: error.message });
      return json({ error: '総会会計の科目・予算を保存できませんでした。' }, 503);
    }
    return json({ data });
  } catch (error) {
    console.error('[admin-assembly-planning] operation failed', { action,
      message: String((error as Error)?.message || 'unknown') });
    return json({ error: '総会会計の科目・予算を保存できませんでした。' }, 503);
  }
}
