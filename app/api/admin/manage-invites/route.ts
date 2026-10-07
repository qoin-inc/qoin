import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { canChangeAdminStatus, countsTowardAdminLimit } from '@/lib/adminInviteManagement.mjs';
import { isStagingInviteTarget } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const visibleColumns = 'id,neighborhood_id,admin_auth_id,admin_name,admin_email,admin_role,status,invited_at,retired_at';
const reservedSystemEmail = 'admin@el-town.jp';
const toBrowser = ({ admin_auth_id: _authId, ...row }: Record<string, any>) => row;
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

class InviteRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

const townIdFrom = (value: unknown) => {
  const text = String(value ?? '');
  if (!/^[1-9]\d{0,14}$/.test(text)) throw new InviteRequestError('町内会・自治会を確認してください。', 400);
  return text;
};

const recordIdFrom = (value: unknown) => {
  const text = String(value ?? '');
  if (!/^[1-9]\d{0,18}$/.test(text)) throw new InviteRequestError('役員情報を確認してください。', 400);
  return text;
};

const parseBody = async (request: Request): Promise<Record<string, unknown>> => {
  const value = await request.json().catch(() => null);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const authorize = async (request: Request, townId: string) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!token) throw new InviteRequestError('管理者ログインを確認できません。', 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !secret) throw new InviteRequestError('役員管理のサーバー設定が未完了です。', 503);
  if (!isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')) {
    throw new InviteRequestError('検証用Supabaseの接続先が確認できません。', 503);
  }
  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user?.id) throw new InviteRequestError('管理者ログインの有効期限が切れています。', 401);

  const { data: membership, error } = await admin.from('neighborhood_admins')
    .select('id').eq('neighborhood_id', townId).eq('admin_auth_id', auth.user.id)
    .eq('status', 'active').maybeSingle();
  if (error) throw new InviteRequestError('役員権限を確認できません。', 503);
  if (!membership) throw new InviteRequestError('この町内会・自治会の役員管理権限がありません。', 403);
  return admin;
};

const run = async (work: () => Promise<NextResponse>) => {
  try { return await work(); }
  catch (error) {
    if (error instanceof InviteRequestError) return json({ error: error.message }, error.status);
    console.error('[admin-manage-invites] unexpected error', { message: String((error as Error)?.message || 'unknown') });
    return json({ error: '役員情報を処理できませんでした。' }, 500);
  }
};

const loadRows = async (admin: SupabaseClient, townId: string) => {
  const { data, error } = await admin.from('neighborhood_admins')
    .select(visibleColumns).eq('neighborhood_id', townId).order('id', { ascending: false }).limit(1000);
  if (error) throw new InviteRequestError('役員一覧を取得できませんでした。', 503);
  if ((data || []).length >= 1000) throw new InviteRequestError('役員件数が上限を超えています。管理者へ連絡してください。', 409);
  return data || [];
};

export async function GET(request: Request) {
  return run(async () => {
    const townId = townIdFrom(new URL(request.url).searchParams.get('townId'));
    const admin = await authorize(request, townId);
    return json({ admins: (await loadRows(admin, townId)).map(toBrowser) });
  });
}

export async function POST(request: Request) {
  return run(async () => {
    const body = await parseBody(request);
    const townId = townIdFrom(body.townId);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || '').trim();
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || role.length > 100) {
      throw new InviteRequestError('役員候補者の名前、メールアドレス、役職を確認してください。', 400);
    }
    if (email === reservedSystemEmail) throw new InviteRequestError('このメールアドレスは役員招待に使用できません。', 403);
    const admin = await authorize(request, townId);
    const rows = await loadRows(admin, townId);
    const now = Date.now();
    const live = rows.filter((row) => countsTowardAdminLimit(row, now));
    if (live.length >= 20) throw new InviteRequestError('役員は最大20名までです。', 409);
    const sameEmail = rows.filter((row) => String(row.admin_email || '').trim().toLowerCase() === email);
    if (sameEmail.some((row) => live.some((item) => item.id === row.id))) {
      throw new InviteRequestError('同じメールアドレスの有効な役員または招待があります。', 409);
    }

    const token = crypto.randomUUID();
    const payload = {
      neighborhood_id: Number(townId), admin_email: email, admin_name: name, admin_role: role,
      admin_auth_id: null, status: 'pending', admin_invite_token: token, invite_token: token,
      invited_at: new Date(now).toISOString(), retired_at: null,
    };
    const reusable = sameEmail[0];
    const query = reusable
      ? admin.from('neighborhood_admins').update(payload).eq('id', reusable.id)
        .eq('neighborhood_id', townId).eq('status', reusable.status)
      : admin.from('neighborhood_admins').insert(payload);
    const { data, error } = await query.select(visibleColumns).maybeSingle();
    if (error) {
      if (error.code === '23505') throw new InviteRequestError('同じメールアドレスの招待があります。', 409);
      throw new InviteRequestError('役員招待を作成できませんでした。', 503);
    }
    if (!data) throw new InviteRequestError('招待情報が変更されました。再読み込みしてください。', 409);
    return json({ admin: toBrowser(data), token }, 201);
  });
}

export async function PATCH(request: Request) {
  return run(async () => {
    const body = await parseBody(request);
    const townId = townIdFrom(body.townId);
    const id = recordIdFrom(body.id);
    const nextStatus = body.status;
    if (nextStatus !== 'active' && nextStatus !== 'retired') throw new InviteRequestError('役員状態を確認してください。', 400);
    const admin = await authorize(request, townId);
    const rows = await loadRows(admin, townId);
    const target = rows.find((row) => String(row.id) === id);
    if (!target) throw new InviteRequestError('役員が見つかりません。', 404);
    if (String(target.admin_email || '').trim().toLowerCase() === reservedSystemEmail) {
      throw new InviteRequestError('この役員は変更できません。', 403);
    }
    if (!canChangeAdminStatus(rows, target, nextStatus)) {
      throw new InviteRequestError(nextStatus === 'active'
        ? '登録済みの退任役員だけ復活できます。'
        : '在任中の役員を退任できません。最後の管理者は残してください。', 409);
    }
    const { data, error } = await admin.from('neighborhood_admins')
      .update({ status: nextStatus, retired_at: nextStatus === 'retired' ? new Date().toISOString() : null })
      .eq('id', id).eq('neighborhood_id', townId).eq('status', target.status)
      .select(visibleColumns).maybeSingle();
    if (error) throw new InviteRequestError('役員状態を更新できませんでした。', 503);
    if (!data) throw new InviteRequestError('役員状態が変更されました。再読み込みしてください。', 409);
    return json({ admin: toBrowser(data) });
  });
}

export async function DELETE(request: Request) {
  return run(async () => {
    const body = await parseBody(request);
    const townId = townIdFrom(body.townId);
    const id = recordIdFrom(body.id);
    const admin = await authorize(request, townId);
    const rows = await loadRows(admin, townId);
    const target = rows.find((row) => String(row.id) === id);
    if (!target) throw new InviteRequestError('役員が見つかりません。', 404);
    if (String(target.admin_email || '').trim().toLowerCase() === reservedSystemEmail) {
      throw new InviteRequestError('この役員は削除できません。', 403);
    }
    const { data, error } = await admin.from('neighborhood_admins').delete()
      .eq('id', id).eq('neighborhood_id', townId).in('status', ['pending', 'waiting_approval'])
      .select('id').maybeSingle();
    if (error) throw new InviteRequestError('役員招待を削除できませんでした。', 503);
    if (!data) throw new InviteRequestError('削除できる招待が見つかりません。', 409);
    return json({ deleted: true });
  });
}
