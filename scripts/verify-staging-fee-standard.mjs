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
const tables = [
  'membership_fee_standard_versions', 'neighborhoods',
  'neighborhood_fee_settings', 'membership_fee_standard_applications',
];
const count = async (table) => {
  const { count: total, error } = await admin.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return total;
};
const before = await Promise.all(tables.map(count));
if (before.some((value) => value !== 0)) {
  throw new Error(`Staging fee test requires empty tables: ${JSON.stringify(before)}`);
}

const marker = `staging-fee-check-${crypto.randomUUID()}`;
const endpoint = 'http://localhost:3001/api/system/fee-standard';
try {
  const login = await fetch('http://localhost:3001/api/system/session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: process.env.SYSTEM_LOGIN_ID, password: process.env.SYSTEM_LOGIN_PASSWORD }),
  });
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  if (login.status !== 200 || !cookie) throw new Error(`System login: ${login.status}`);

  const payload = {
    feeName: '検証用年会費', amount: 3000, cashEnabled: true,
    stripeCardEnabled: false, revenueCategory: '会費', changeReason: marker,
  };
  const noToken = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(payload),
  });
  if (noToken.status !== 401) throw new Error(`Missing DB token: ${noToken.status}`);

  const uid = process.env.STAGING_SYSTEM_ADMIN_AUTH_ID;
  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(uid);
  const email = userResult.user?.email;
  if (userError || !email) throw new Error('Staging admin missing');
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError || !link.properties?.hashed_token) throw new Error('Could not generate temporary session');
  const { data: signedIn, error: signInError } = await client.auth.verifyOtp({
    token_hash: link.properties.hashed_token, type: 'magiclink',
  });
  if (signInError || signedIn.user?.id !== uid || !signedIn.session?.access_token) {
    throw new Error('Temporary staging session mismatch');
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, Authorization: `Bearer ${signedIn.session.access_token}` },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (response.status !== 201 || result.version !== 1) {
    throw new Error(`Fee publish: ${response.status}: ${result.error || ''}`);
  }
  const { data: published, error: publishedError } = await admin.from('membership_fee_standard_versions')
    .select('status,version_number').eq('change_reason', marker).single();
  if (publishedError || published.status !== 'published' || published.version_number !== 1) {
    throw new Error('Published staging version was not found');
  }
  console.log('staging fee standard: missing DB token 401; publish 201; published version verified');
} finally {
  const { error: cleanupError } = await admin.from('membership_fee_standard_versions')
    .delete().eq('change_reason', marker);
  if (cleanupError) throw cleanupError;
  const after = await Promise.all(tables.map(count));
  if (after.some((value, index) => value !== before[index])) {
    throw new Error(`Staging fee test data not restored: ${JSON.stringify(after)}`);
  }
  console.log('staging fee standard: all checked table counts restored');
}
