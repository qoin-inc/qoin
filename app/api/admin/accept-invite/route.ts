import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ADMIN_INVITE_VALIDITY_MS, validateAdminInviteAcceptance } from '@/lib/adminInviteAcceptance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

export async function POST(request: Request) {
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!accessToken) return json({ error: 'ログインしてから招待を登録してください。' }, 401);

  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!token || token.length > 512 || !name || name.length > 100) {
    return json({ error: '招待情報とお名前を確認してください。' }, 400);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !secret) return json({ error: '招待の登録設定が未完了です。' }, 503);

  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
  const user = authData.user;
  if (authError || !user?.id || !user.email) {
    return json({ error: 'ログイン情報を確認できません。もう一度ログインしてください。' }, 401);
  }
  if (!user.email_confirmed_at) {
    return json({ error: 'メールアドレスの確認後、招待URLを開き直してください。' }, 403);
  }

  const columns = 'id,admin_email,admin_name,admin_auth_id,status,invited_at';
  let tokenColumn: 'admin_invite_token' | 'invite_token' = 'admin_invite_token';
  let result = await admin.from('neighborhood_admins').select(columns).eq(tokenColumn, token).maybeSingle();
  if (!result.data && (!result.error || result.error.message.includes('admin_invite_token'))) {
    tokenColumn = 'invite_token';
    result = await admin.from('neighborhood_admins').select(columns).eq(tokenColumn, token).maybeSingle();
  }
  if (result.error) return json({ error: '招待情報を確認できません。再度お試しください。' }, 503);
  if (!result.data) return json({ error: '招待情報が見つかりません。' }, 404);

  const invitation = result.data;
  const decision = validateAdminInviteAcceptance(invitation, { id: user.id, email: user.email });
  if (!decision.ok) {
    const message = decision.code === 'expired'
      ? '招待の有効期限が切れています。再発行を依頼してください。'
      : decision.code === 'used'
        ? 'この招待はすでに使用されています。'
        : decision.code === 'email_mismatch'
          ? '招待されたメールアドレスでログインしてください。'
          : 'この招待は利用できません。';
    return json({ error: message }, decision.code === 'email_mismatch' ? 403 : 409);
  }

  // The conditional update makes simultaneous uses of the same invitation single-use.
  const cutoff = new Date(Date.now() - ADMIN_INVITE_VALIDITY_MS).toISOString();
  const { data: accepted, error: updateError } = await admin
    .from('neighborhood_admins')
    .update({
      admin_auth_id: user.id,
      admin_name: name,
      status: 'active',
      admin_invite_token: null,
      invite_token: null,
    })
    .eq('id', invitation.id)
    .eq('admin_email', invitation.admin_email)
    .eq('status', 'pending')
    .is('admin_auth_id', null)
    .eq(tokenColumn, token)
    .gt('invited_at', cutoff)
    .select('id')
    .maybeSingle();

  if (updateError) return json({ error: '招待を登録できませんでした。再度お試しください。' }, 500);
  if (!accepted) return json({ error: '招待が変更または使用されました。招待URLを確認してください。' }, 409);
  return json({ accepted: true });
}
