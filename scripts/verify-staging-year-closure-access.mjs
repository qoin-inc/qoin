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
const actor = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const uid = process.env.STAGING_SYSTEM_ADMIN_AUTH_ID;
const { data: user, error: userError } = await admin.auth.admin.getUserById(uid);
if (userError || !user.user?.email) throw new Error('Staging admin missing');
const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.user.email });
if (linkError || !link.properties?.hashed_token) throw new Error('Could not generate staging session');
const { data: session, error: sessionError } = await actor.auth.verifyOtp({
  token_hash: link.properties.hashed_token, type: 'magiclink',
});
if (sessionError || session.user?.id !== uid || !session.session?.access_token) {
  throw new Error('Staging session mismatch');
}

const endpoint = 'http://localhost:3001/api/admin/year-closure';
const send = async (body, token) => fetch(endpoint, {
  method: 'POST', headers: { 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});
const nonexistentTown = '999999999999999';
const base = { townId: nonexistentTown, fiscalYear: 2026 };
const checks = [
  ['unauthenticated', { ...base, action: 'finalizeFee' }, undefined, 401],
  ['invalid-year', { ...base, action: 'finalizeFee', fiscalYear: 1800 }, session.session.access_token, 400],
  ['short-reason', { ...base, action: 'unlockAssembly', reason: 'x' }, session.session.access_token, 400],
  ['unknown-town-fee', { ...base, action: 'finalizeFee' }, session.session.access_token, 403],
  ['unknown-town-assembly', { ...base, action: 'finalizeAssembly' }, session.session.access_token, 403],
];
for (const [label, body, token, expected] of checks) {
  const response = await send(body, token);
  if (response.status !== expected) throw new Error(`${label}: expected ${expected}, got ${response.status}`);
  console.log(`${label}: ${response.status}`);
}
