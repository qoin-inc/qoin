import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isStagingInviteTarget } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const householdsByScale: Record<string, number> = {
  '500世帯未満': 499,
  '500世帯～1000世帯': 1000,
  '1000世帯～5000世帯': 5000,
  '5000世帯以上': 5001,
};
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!token) return json({ error: 'メール認証後にログインしてから、登録を完了してください。' }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!secret || !isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')) {
    return json({ error: '検証環境の接続先を確認できません。' }, 503);
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: '登録内容を確認してください。' }, 400);
  const name = String(body.townName || '').trim();
  const postalCode = String(body.postalCode || '').trim();
  const scale = String(body.memberScale || '').trim();
  const adminName = String(body.adminName || '').trim();
  const adminRole = String(body.adminRole || '').trim();
  const email = String(body.adminEmail || '').trim().toLowerCase();
  if (!name || name.length > 150 || !/^\d{3}-?\d{4}$/.test(postalCode)
    || !Object.hasOwn(householdsByScale, scale) || !adminName || adminName.length > 100
    || !adminRole || adminRole.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ error: '町内会名、郵便番号、規模、役職、氏名、メールアドレスを確認してください。' }, 400);
  }
  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
  try {
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    const user = auth.user;
    if (authError || !user?.id) return json({ error: 'ログインの有効期限が切れています。' }, 401);
    if (!user.email_confirmed_at) return json({ error: 'メール認証を完了してください。' }, 403);
    if (String(user.email || '').trim().toLowerCase() !== email) {
      return json({ error: 'ログイン中のメールアドレスと登録内容が一致しません。' }, 403);
    }
    const { data: existing, error: existingError } = await admin.from('neighborhoods')
      .select('id').eq('admin_auth_id', user.id).limit(1);
    if (existingError) throw existingError;
    if (existing?.length) return json({ error: 'このアカウントには登録済みの町内会があります。' }, 409);
    const { data: town, error: townError } = await admin.from('neighborhoods').insert({
      name, postal_code: postalCode, households: householdsByScale[scale],
      admin_email: email, admin_name: adminName, admin_auth_id: user.id,
    }).select('id,name').single();
    if (townError || !town) throw townError || new Error('Town insert returned no row');
    const { error: memberError } = await admin.from('neighborhood_admins').insert({
      neighborhood_id: town.id, admin_auth_id: user.id, admin_email: email,
      admin_name: adminName, admin_role: adminRole, status: 'active',
    });
    if (memberError) {
      const { error: cleanupError } = await admin.from('neighborhoods').delete().eq('id', town.id);
      if (cleanupError) console.error('[signup-town] cleanup failed', { townId: town.id, message: cleanupError.message });
      throw memberError;
    }
    return json({ town: { id: town.id, name: town.name } }, 201);
  } catch (error) {
    console.error('[signup-town] failed', { message: String((error as Error)?.message || 'unknown') });
    return json({ error: '町内会を登録できませんでした。管理者にお問い合わせください。' }, 503);
  }
}
