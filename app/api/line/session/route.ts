import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { isStagingInviteTarget } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';

const STAGING_ORIGIN = 'https://el-town-staging.netlify.app';
const STAGING_CHANNEL_ID = '2009700969';
const STAGING_LIFF_ID = '2009700969-9dn0R2dB';

const reply = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const findLineUser = async (admin: SupabaseClient<any, 'public', any>, email: string) => {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((entry) => entry.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  throw new Error('LINE利用者一覧を安全に確認できませんでした。');
};

const isServerCreatedLineUser = (user: User, lineUserId: string) =>
  user.app_metadata?.eltown_line_channel_id === STAGING_CHANNEL_ID
  && user.app_metadata?.eltown_line_user_id === lineUserId;

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const secret = process.env.SUPABASE_SECRET_KEY || '';
  if (request.headers.get('origin') !== STAGING_ORIGIN
    || !isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')
    || process.env.NEXT_PUBLIC_LIFF_ID !== STAGING_LIFF_ID
    || !anonKey || !secret) {
    return reply({ error: '検証用LINE認証は利用できません。' }, 503);
  }

  const body = await request.json().catch(() => ({}));
  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  if (!idToken || idToken.length > 8192) return reply({ error: 'LINE認証情報がありません。' }, 400);

  try {
    const verification = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: STAGING_CHANNEL_ID }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!verification.ok) return reply({ error: 'LINE認証を確認できませんでした。' }, 401);
    const verified = await verification.json();
    const lineUserId = typeof verified.sub === 'string' ? verified.sub : '';
    if (verified.iss !== 'https://access.line.me'
      || verified.aud !== STAGING_CHANNEL_ID
      || typeof verified.exp !== 'number' || verified.exp <= Math.floor(Date.now() / 1000)
      || !/^U[0-9a-f]{32}$/i.test(lineUserId)) {
      return reply({ error: 'LINE認証の内容が一致しません。' }, 401);
    }

    const email = `${lineUserId}@line.eltown.local`.toLowerCase();
    const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
    let user = await findLineUser(admin, email);
    if (user && !isServerCreatedLineUser(user, lineUserId)) {
      // An older account may still have the predictable password. Never issue
      // a new session for it until its sessions and password are migrated.
      return reply({ error: 'このLINE利用者は認証方式の移行が必要です。管理者に連絡してください。' }, 409);
    }
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: randomBytes(48).toString('base64url'),
        email_confirm: true,
        app_metadata: { eltown_line_channel_id: STAGING_CHANNEL_ID, eltown_line_user_id: lineUserId },
        user_metadata: {
          name: typeof verified.name === 'string' ? verified.name : '',
          avatar_url: typeof verified.picture === 'string' ? verified.picture : '',
        },
      });
      if (error || !data.user) return reply({ error: 'LINE利用者を登録できませんでした。' }, 503);
      user = data.user;
    }

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) return reply({ error: 'LINE利用者のセッションを作成できませんでした。' }, 503);

    const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: result, error: sessionError } = await auth.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
    if (sessionError || !result.session || result.user?.id !== user.id) {
      return reply({ error: 'LINE利用者のセッションを確認できませんでした。' }, 503);
    }
    return reply({ accessToken: result.session.access_token, refreshToken: result.session.refresh_token }, 200);
  } catch {
    return reply({ error: 'LINE認証を完了できませんでした。' }, 503);
  }
}
