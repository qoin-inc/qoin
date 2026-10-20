import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isSystemAdminRequest } from '@/lib/systemAdminServer';
import { isStagingInviteTarget, isStagingSystemAdmin } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

export async function POST(request: Request) {
  if (!isSystemAdminRequest(request)) {
    return json({ error: 'システム管理者としてログインしてください。' }, 401);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const systemAdminId = process.env.STAGING_SYSTEM_ADMIN_AUTH_ID || '';
  if (!secret || !isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')
    || !isStagingSystemAdmin(systemAdminId, systemAdminId)) {
    return json({ error: '検証環境の管理者設定を確認できません。' }, 503);
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!token) return json({ error: 'システム管理者の認証情報を確認できません。' }, 401);
  const body = await request.json().catch(() => null);
  const townId = String(body?.townId ?? '');
  if (!/^[1-9]\d{0,14}$/.test(townId)) return json({ error: '町内会・自治会を選択してください。' }, 400);

  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !isStagingSystemAdmin(auth.user?.id || '', systemAdminId)) {
      return json({ error: '検証用システム管理者の認証情報を確認できません。' }, 403);
    }
    const { data: systemUser, error: systemUserError } = await admin.auth.admin.getUserById(systemAdminId);
    const email = String(systemUser.user?.email || '').trim().toLowerCase();
    if (systemUserError || !email || !isStagingSystemAdmin(systemUser.user?.id || '', systemAdminId)) {
      return json({ error: '検証用システム管理者のユーザーを確認できません。' }, 503);
    }

    const { data: town, error: townError } = await admin.from('neighborhoods')
      .select('id,name').eq('id', townId).maybeSingle();
    if (townError) throw townError;
    if (!town) return json({ error: '町内会・自治会が見つかりません。' }, 404);

    const { data: existing, error: existingError } = await admin.from('neighborhood_admins')
      .select('id,status').eq('neighborhood_id', townId).eq('admin_auth_id', systemAdminId)
      .order('id', { ascending: false }).limit(1);
    if (existingError) throw existingError;
    if (existing?.length) {
      if (existing[0].status !== 'active') {
        return json({ error: 'この町内会のシステム管理者所属は無効です。設定を確認してください。' }, 409);
      }
    } else {
      const { error: insertError } = await admin.from('neighborhood_admins').insert({
        neighborhood_id: town.id,
        admin_auth_id: systemAdminId,
        admin_name: 'el-town システム管理者',
        admin_email: email,
        admin_role: 'システム管理者',
        status: 'active',
      });
      if (insertError) {
        if (insertError.code === '23505') {
          return json({ error: 'この町内会のシステム管理者所属を確認できません。再読込してください。' }, 409);
        }
        throw insertError;
      }
    }

    return json({ town: { id: Number(town.id), name: String(town.name) } });
  } catch (error) {
    console.error('[system-town-access] failed', { message: String((error as Error)?.message || 'unknown') });
    return json({ error: '町内会の管理画面を開けませんでした。' }, 503);
  }
}
