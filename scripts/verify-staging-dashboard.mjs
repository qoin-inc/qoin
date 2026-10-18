import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const ref = 'zghcorbdtslrjtkkspfe';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== `https://${ref}.supabase.co` || process.env.STAGING_SUPABASE_PROJECT_REF !== ref) {
  throw new Error('Staging target mismatch');
}
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const uid = process.env.STAGING_SYSTEM_ADMIN_AUTH_ID;
const { data: user, error: userError } = await admin.auth.admin.getUserById(uid);
if (userError || !user.user?.email) throw new Error('Staging admin missing');
const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.user.email });
if (linkError || !link.properties?.hashed_token) throw new Error('Could not generate temporary session');
const { data: signedIn, error: signInError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
if (signInError || !signedIn.session?.access_token) throw new Error('Could not verify temporary session');
const token = signedIn.session.access_token;
if (signedIn.user?.id !== uid) throw new Error('Temporary session UID mismatch');
const base = 'http://localhost:3001/api/admin/dashboard';
const query = (townId) => `${base}?${new URLSearchParams({ townId: String(townId), monthStart: '2026-10-01T00:00:00.000Z', monthEnd: '2026-11-01T00:00:00.000Z' })}`;
const request = async (townId) => fetch(query(townId), { headers: { Authorization: `Bearer ${token}` } });
const counts = async () => {
  const [towns, members] = await Promise.all([
    admin.from('neighborhoods').select('id', { count: 'exact', head: true }),
    admin.from('neighborhood_admins').select('id', { count: 'exact', head: true }),
  ]);
  if (towns.error || members.error) throw towns.error || members.error;
  return { towns: towns.count, members: members.count };
};
const beforeCounts = await counts();
let townId;
let memberId;
try {
  const { data: town, error: townError } = await admin.from('neighborhoods')
    .insert({ name: `dashboard-check-${crypto.randomUUID()}` }).select('id').single();
  if (townError) throw townError;
  townId = town.id;
  const before = await request(townId);
  if (before.status !== 403) throw new Error(`Expected 403 without membership; got ${before.status}`);
  const { data: member, error: memberError } = await admin.from('neighborhood_admins')
    .insert({ neighborhood_id: townId, admin_auth_id: uid, admin_email: user.user.email,
      admin_name: 'Staging dashboard check', status: 'active' }).select('id').single();
  if (memberError) throw memberError;
  memberId = member.id;
  const { data: stored, error: storedError } = await admin.from('neighborhood_admins').select('admin_auth_id,status,neighborhood_id').eq('id', memberId).single();
  if (storedError || stored?.admin_auth_id !== uid || stored?.status !== 'active' || String(stored?.neighborhood_id) !== String(townId)) throw new Error('Temporary membership mismatch');
  const { data: filtered, error: filteredError } = await admin.from('neighborhood_admins').select('id')
    .eq('neighborhood_id', String(townId)).eq('admin_auth_id', uid).eq('status', 'active').maybeSingle();
  if (filteredError || !filtered) throw new Error('Temporary membership filtered lookup failed');
  const { data: viaServerAuth, error: viaServerAuthError } = await admin.auth.getUser(token);
  if (viaServerAuthError || viaServerAuth.user?.id !== uid) throw new Error('Server auth UID mismatch');
  const { data: afterAuth, error: afterAuthError } = await admin.from('neighborhood_admins').select('id')
    .eq('neighborhood_id', String(townId)).eq('admin_auth_id', uid).eq('status', 'active').maybeSingle();
  if (afterAuthError || !afterAuth) throw new Error('Server auth changed service client membership lookup');
  const own = await request(townId);
  if (own.status !== 200) throw new Error(`Expected own town 200; got ${own.status}: ${(await own.json()).error || ''}`);
  const payload = await own.json();
  if (String(payload.townInfo?.data?.id) !== String(townId)) throw new Error('Wrong town returned');
  const other = await request(Number(townId) + 999999);
  if (other.status !== 403) throw new Error(`Expected other town 403; got ${other.status}`);
  const { error: retireError } = await admin.from('neighborhood_admins').update({ status: 'retired' }).eq('id', memberId);
  if (retireError) throw retireError;
  const retired = await request(townId);
  if (retired.status !== 403) throw new Error(`Expected retired 403; got ${retired.status}`);
  console.log('staging dashboard: no membership 403; own town 200; other town 403; retired 403');
} finally {
  const cleanupErrors = [];
  if (memberId) {
    const { error } = await admin.from('neighborhood_admins').delete().eq('id', memberId);
    if (error) cleanupErrors.push(error);
  }
  if (townId) {
    const { error } = await admin.from('neighborhoods').delete().eq('id', townId);
    if (error) cleanupErrors.push(error);
  }
  if (cleanupErrors.length) throw cleanupErrors[0];
  const afterCounts = await counts();
  if (afterCounts.towns !== beforeCounts.towns || afterCounts.members !== beforeCounts.members) {
    throw new Error('Staging test data cleanup did not restore counts');
  }
  console.log('staging dashboard: test data count restored');
}
