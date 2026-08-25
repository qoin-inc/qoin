import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

const membershipColumns = 'id,admin_auth_id,admin_email,admin_role,neighborhood_id,neighborhoods(id,name,admin_auth_id,admin_email)';

export async function GET(request: Request) {
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!accessToken) return json({ error: 'ログイン情報を確認できません。もう一度ログインしてください。' }, 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseSecretKey) {
    return json({ error: '所属情報を確認できません。しばらくしてから再度お試しください。' }, 503);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  const user = authData.user;
  const userEmail = String(user?.email || '').trim().toLowerCase();
  if (authError || !user || !userEmail) {
    return json({ error: 'ログイン情報の有効期限が切れています。もう一度ログインしてください。' }, 401);
  }
  const emailPattern = userEmail.replace(/[\\%_]/g, (character) => `\\${character}`);

  const [authIdResult, emailResult] = await Promise.all([
    supabase
      .from('neighborhood_admins')
      .select(membershipColumns)
      .eq('admin_auth_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('neighborhood_admins')
      .select(membershipColumns)
      .ilike('admin_email', emailPattern)
      .eq('status', 'active'),
  ]);

  if (authIdResult.error || emailResult.error) {
    console.error('[admin-memberships] lookup failed', {
      authIdError: authIdResult.error?.message,
      emailError: emailResult.error?.message,
    });
    return json({ error: '所属する町内会・自治会を確認できません。しばらくしてから再度お試しください。' }, 500);
  }

  let records = new Map<string, any>();
  for (const record of [...(authIdResult.data || []), ...(emailResult.data || [])]) {
    records.set(String(record.id), record);
  }

  const relinkIds = [...records.values()]
    .filter((record) => record.admin_auth_id !== user.id && String(record.admin_email || '').trim().toLowerCase() === userEmail)
    .map((record) => record.id);

  if (relinkIds.length > 0) {
    const { error: relinkError } = await supabase
      .from('neighborhood_admins')
      .update({ admin_auth_id: user.id })
      .in('id', relinkIds)
      .eq('status', 'active');
    if (relinkError) {
      console.error('[admin-memberships] relink failed', { message: relinkError.message });
      return json({ error: '役員情報の紐付けを更新できません。管理者へお問い合わせください。' }, 409);
    }
  }

  if (records.size === 0) {
    const { data: legacyTowns, error: legacyError } = await supabase
      .from('neighborhoods')
      .select('id,name,admin_email,admin_name')
      .eq('admin_auth_id', user.id);

    if (legacyError) {
      console.error('[admin-memberships] legacy lookup failed', { message: legacyError.message });
    } else {
      for (const legacyTown of legacyTowns || []) {
        const { error: insertError } = await supabase.from('neighborhood_admins').insert({
          neighborhood_id: legacyTown.id,
          admin_auth_id: user.id,
          admin_email: legacyTown.admin_email || userEmail,
          admin_name: legacyTown.admin_name || '初期管理者',
          status: 'active',
        });
        if (insertError && insertError.code !== '23505') {
          console.error('[admin-memberships] legacy migration failed', { message: insertError.message });
        }
      }

      if ((legacyTowns || []).length > 0) {
        const { data: migratedRecords } = await supabase
          .from('neighborhood_admins')
          .select(membershipColumns)
          .eq('admin_auth_id', user.id)
          .eq('status', 'active');
        records = new Map((migratedRecords || []).map((record) => [String(record.id), record]));
      }
    }
  }

  const memberships = [...records.values()]
    .map((record) => {
      const neighborhood = Array.isArray(record.neighborhoods)
        ? record.neighborhoods[0]
        : record.neighborhoods;
      if (!neighborhood?.id || !neighborhood?.name) return null;
      return {
        adminId: String(record.id),
        role: String(record.admin_role || '役員'),
        isRepresentative: Boolean(
          neighborhood.admin_auth_id === user.id
          || String(neighborhood.admin_email || '').trim().toLowerCase() === userEmail
        ),
        town: {
          id: Number(neighborhood.id),
          name: String(neighborhood.name),
        },
      };
    })
    .filter(Boolean)
    .sort((left: any, right: any) => left.town.name.localeCompare(right.town.name, 'ja'));

  if (memberships.length === 0) {
    return json({ error: '有効な役員登録が見つかりません。町内会・自治会の代表者へご確認ください。' }, 404);
  }

  return json({ memberships });
}
