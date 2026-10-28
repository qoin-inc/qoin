import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isStagingInviteTarget } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

const fields = [
  'full_name', 'kana_name', 'postal_code', 'address2', 'address3',
  'family_name_1', 'family_kana_name_1', 'family_name_2', 'family_kana_name_2',
] as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || !/^[1-9]\d{0,14}$/.test(String(body.townId ?? ''))
    || (body.memberId != null && !/^[0-9a-fA-F-]{36}$/.test(String(body.memberId)))
    || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
    return json({ error: '会員情報の入力を確認してください。' }, 400);
  }
  const source = body.payload as Record<string, unknown>;
  if (Object.keys(source).some((key) => !fields.includes(key as typeof fields[number]))
    || fields.some((key) => source[key] != null && (typeof source[key] !== 'string' || source[key].length > 500))
    || typeof source.full_name !== 'string' || !source.full_name.trim()
    || typeof source.kana_name !== 'string' || !source.kana_name.trim()
    || Boolean(String(source.family_name_1 || '').trim()) !== Boolean(String(source.family_kana_name_1 || '').trim())
    || Boolean(String(source.family_name_2 || '').trim()) !== Boolean(String(source.family_kana_name_2 || '').trim())) {
    return json({ error: '会員情報の入力を確認してください。' }, 400);
  }
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  if (!token) return json({ error: '役員ログインを確認できません。' }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!secret || !isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')) {
    return json({ error: '検証環境の設定を確認できません。' }, 503);
  }
  try {
    const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user?.id) return json({ error: '役員ログインの有効期限が切れています。' }, 401);
    const townId = Number(body.townId);
    const { data: membership, error: membershipError } = await admin.from('neighborhood_admins')
      .select('id').eq('neighborhood_id', townId).eq('admin_auth_id', auth.user.id)
      .eq('status', 'active').maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return json({ error: 'この町内会の名簿管理権限がありません。' }, 403);

    const payload: Record<string, string | null | number> = {
      neighborhood_id: townId,
      full_name: source.full_name.trim(),
      last_name: source.full_name.trim(),
      kana_name: String(source.kana_name).trim(),
    };
    for (const field of fields) {
      if (field === 'full_name' || field === 'kana_name') continue;
      payload[field] = source[field] == null ? null : String(source[field]).trim() || null;
    }
    if (body.memberId != null) {
      const { data, error } = await admin.from('resident_rosters').update(payload)
        .eq('id', body.memberId).eq('neighborhood_id', townId).select('*').maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: '対象の会員が見つかりません。' }, 404);
      return json({ data });
    }
    payload.withdrawal_status = 'active';
    const { data, error } = await admin.from('resident_rosters').insert(payload).select('*').single();
    if (error) throw error;
    return json({ data }, 201);
  } catch (error) {
    console.error('[admin-resident-rosters] save failed', { message: String((error as Error)?.message || 'unknown') });
    return json({ error: '会員情報を保存できませんでした。' }, 503);
  }
}
