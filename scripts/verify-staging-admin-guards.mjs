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
const { data: userResult, error: userError } = await admin.auth.admin.getUserById(uid);
const email = userResult.user?.email;
if (userError || !email) throw new Error('Staging admin missing');
const count = async (table) => {
  const { count: total, error } = await admin.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return total;
};
const before = [await count('neighborhoods'), await count('neighborhood_admins')];
const signupUrl = 'http://localhost:3001/api/admin/signup-town';
const systemUrl = 'http://localhost:3001/api/system';
const payload = {
  townName: `signup-check-${crypto.randomUUID()}`, postalCode: '100-0001',
  memberScale: '500世帯未満', adminRole: '会長', adminName: 'Staging Check', adminEmail: email,
};
let townId;
try {
  const unauth = await fetch(signupUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (unauth.status !== 401) throw new Error(`Signup without auth: ${unauth.status}`);
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError || !link.properties?.hashed_token) throw new Error('Could not generate temporary session');
  const { data: signedIn, error: signInError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (signInError || signedIn.user?.id !== uid || !signedIn.session?.access_token) throw new Error('Temporary session mismatch');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${signedIn.session.access_token}` };
  const wrongEmail = await fetch(signupUrl, { method: 'POST', headers, body: JSON.stringify({ ...payload, adminEmail: 'other@example.invalid' }) });
  if (wrongEmail.status !== 403) throw new Error(`Mismatched email: ${wrongEmail.status}`);
  const created = await fetch(signupUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
  const createdBody = await created.json();
  if (created.status !== 201 || !createdBody.town?.id) throw new Error(`Signup: ${created.status}: ${createdBody.error || ''}`);
  townId = createdBody.town.id;
  const { data: membership, error: membershipError } = await admin.from('neighborhood_admins')
    .select('admin_auth_id,status').eq('neighborhood_id', townId).single();
  if (membershipError || membership?.admin_auth_id !== uid || membership?.status !== 'active') throw new Error('Membership was not created');
  const repeated = await fetch(signupUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (repeated.status !== 409) throw new Error(`Repeat signup: ${repeated.status}`);

  const unauthOverview = await fetch(`${systemUrl}/overview?billingMonth=2026-10`);
  if (unauthOverview.status !== 401) throw new Error(`Overview without auth: ${unauthOverview.status}`);
  const unauthFee = await fetch(`${systemUrl}/fee-standard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (unauthFee.status !== 401) throw new Error(`Fee standard without auth: ${unauthFee.status}`);
  const login = await fetch(`${systemUrl}/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: process.env.SYSTEM_LOGIN_ID, password: process.env.SYSTEM_LOGIN_PASSWORD }),
  });
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  if (login.status !== 200 || !cookie) throw new Error(`System login: ${login.status}`);
  const overview = await fetch(`${systemUrl}/overview?billingMonth=2026-10`, { headers: { Cookie: cookie } });
  const overviewBody = await overview.json();
  if (overview.status !== 200 || overviewBody.results?.length !== 10) throw new Error(`System overview: ${overview.status}: ${overviewBody.error || ''}`);
  const invalidFee = await fetch(`${systemUrl}/fee-standard`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: '{}',
  });
  if (invalidFee.status !== 400) throw new Error(`Invalid fee standard: ${invalidFee.status}`);
  console.log('staging guards: signup 401/403/201/409; overview 401/200; fee standard 401/400');
} finally {
  if (townId) {
    const { error: memberCleanup } = await admin.from('neighborhood_admins').delete().eq('neighborhood_id', townId);
    const { error: townCleanup } = await admin.from('neighborhoods').delete().eq('id', townId);
    if (memberCleanup || townCleanup) throw memberCleanup || townCleanup;
  }
  const after = [await count('neighborhoods'), await count('neighborhood_admins')];
  if (after[0] !== before[0] || after[1] !== before[1]) throw new Error('Staging test data count not restored');
  console.log('staging guards: test data count restored');
}
