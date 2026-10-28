import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isStagingInviteTarget } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});
const normalized = (value: unknown) => String(value || '').normalize('NFKC').replace(/[\s　]+/g, '').trim();
const postal = (value: unknown) => normalized(value).replace(/[^0-9]/g, '');
const stringField = (value: unknown) => typeof value === 'string' && value.length <= 500;

const context = async (request: Request) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || '';
  if (!secret || !isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')) {
    return { error: json({ error: '検証環境の設定を確認できません。' }, 503) };
  }
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  if (!token) return { error: json({ error: 'LINEログインを確認できません。' }, 401) };
  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  const user = data.user;
  if (error || !user?.id || user.app_metadata?.eltown_line_channel_id !== '2009700969'
    || !/^U[0-9a-f]{32}$/i.test(String(user.app_metadata?.eltown_line_user_id || ''))) {
    return { error: json({ error: '検証用LINEログインを確認できません。' }, 401) };
  }
  return { admin, user, lineUserId: user.app_metadata.eltown_line_user_id as string };
};

export async function GET(request: Request) {
  try {
    const access = await context(request);
    if (access.error) return access.error;
    const { admin, user, lineUserId } = access;
    const { data, error } = await admin.from('resident_rosters').select('*')
      .or(`user_auth_id.eq.${user.id},family_user_auth_id_1.eq.${user.id},family_user_auth_id_2.eq.${user.id}`)
      .not('neighborhood_id', 'is', null).order('id', { ascending: false }).limit(20);
    if (error) throw error;
    const rosters = data || [];
    const roster = rosters.find((item) => item.withdrawal_status !== 'withdrawn' && item.status !== 'withdrawn') || rosters[0];
    if (!roster) return json({ roster: null, town: null });
    const { data: town, error: townError } = await admin.from('neighborhoods').select('id,name')
      .eq('id', roster.neighborhood_id).maybeSingle();
    if (townError) throw townError;
    const lineColumn = roster.user_auth_id === user.id ? 'line_user_id'
      : roster.family_user_auth_id_1 === user.id ? 'family_line_user_id_1' : 'family_line_user_id_2';
    if (roster[lineColumn] !== lineUserId) {
      const synced = await admin.from('resident_rosters').update({ [lineColumn]: lineUserId })
        .eq('id', roster.id).eq('neighborhood_id', roster.neighborhood_id);
      if (synced.error) throw synced.error;
      roster[lineColumn] = lineUserId;
    }
    return json({ roster, town });
  } catch (error) {
    console.error('[resident-roster] read failed', { message: String((error as Error)?.message || 'unknown') });
    return json({ error: '会員情報を確認できませんでした。' }, 503);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const names = ['townName', 'fullName', 'kanaName', 'postalCode', 'addressLine2',
    'addressLine3', 'memberName', 'memberKanaName'] as const;
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || names.some((key) => !stringField(body[key]))
    || names.filter((key) => key !== 'addressLine3').some((key) => !String(body[key]).trim())) {
    return json({ error: '会員情報の入力を確認してください。' }, 400);
  }
  try {
    const access = await context(request);
    if (access.error) return access.error;
    const { admin, user, lineUserId } = access;
    const { data: towns, error: townError } = await admin.from('neighborhoods').select('id,name').limit(1000);
    if (townError) throw townError;
    const town = towns?.find((item) => normalized(item.name) === normalized(body.townName));
    if (!town) return json({ error: '入力内容に一致する会員名簿が見つかりません。' }, 404);
    const { data: rows, error: rosterError } = await admin.from('resident_rosters').select('*')
      .eq('neighborhood_id', town.id).limit(1000);
    if (rosterError) throw rosterError;
    const roster = rows?.find((row) => row.withdrawal_status !== 'withdrawn'
      && normalized(row.full_name || `${row.last_name || ''}${row.first_name || ''}`) === normalized(body.fullName)
      && normalized(row.kana_name || row.full_name_kana || row.kana) === normalized(body.kanaName)
      && postal(row.postal_code) === postal(body.postalCode)
      && normalized(row.address2 || row.address_line2 || row.address) === normalized(body.addressLine2)
      && normalized(row.address3 || row.address_line3) === normalized(body.addressLine3));
    if (!roster) return json({ error: '入力内容に一致する会員名簿が見つかりません。' }, 404);

    let result;
    if (!roster.user_auth_id || roster.user_auth_id === user.id) {
      const query = admin.from('resident_rosters').update({ user_auth_id: user.id, line_user_id: lineUserId })
        .eq('id', roster.id).eq('neighborhood_id', town.id);
      result = roster.user_auth_id ? await query.eq('user_auth_id', user.id).select('id').maybeSingle()
        : await query.is('user_auth_id', null).select('id').maybeSingle();
    } else {
      const slot = [1, 2].find((n) => roster[`family_user_auth_id_${n}`] === user.id)
        || [1, 2].find((n) => !roster[`family_user_auth_id_${n}`] && !roster[`family_invite_token_${n}`]);
      if (!slot) return json({ error: 'この世帯は家族2名まで連携済みです。' }, 409);
      const claim = roster[`family_user_auth_id_${slot}`] === user.id;
      const query = admin.from('resident_rosters').update({
        [`family_name_${slot}`]: body.memberName.trim(),
        [`family_kana_name_${slot}`]: body.memberKanaName.trim(),
        [`family_user_auth_id_${slot}`]: user.id,
        [`family_line_user_id_${slot}`]: lineUserId,
        [`family_withdrawal_status_${slot}`]: 'active',
      }).eq('id', roster.id).eq('neighborhood_id', town.id);
      result = claim ? await query.eq(`family_user_auth_id_${slot}`, user.id).select('id').maybeSingle()
        : await query.is(`family_user_auth_id_${slot}`, null).is(`family_invite_token_${slot}`, null).select('id').maybeSingle();
    }
    if (result.error) throw result.error;
    if (!result.data) return json({ error: '同時に登録内容が変更されました。もう一度お試しください。' }, 409);
    return json({ linked: true });
  } catch (error) {
    console.error('[resident-roster] link failed', { message: String((error as Error)?.message || 'unknown') });
    return json({ error: '会員情報を連携できませんでした。' }, 503);
  }
}
