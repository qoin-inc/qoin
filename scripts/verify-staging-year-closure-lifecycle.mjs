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
if (userError || !user.user?.email) throw new Error('Staging actor missing');
const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.user.email });
if (linkError || !link.properties?.hashed_token) throw new Error('Could not generate staging session');
const { data: session, error: sessionError } = await actor.auth.verifyOtp({
  token_hash: link.properties.hashed_token, type: 'magiclink',
});
if (sessionError || session.user?.id !== uid || !session.session?.access_token) {
  throw new Error('Staging session mismatch');
}
const token = session.session.access_token;
const tables = ['neighborhoods', 'neighborhood_admins', 'resident_rosters', 'fee_records',
  'fee_year_closures', 'fee_year_snapshot_rows', 'fee_year_lock_events',
  'assembly_year_closures', 'assembly_year_snapshots', 'assembly_year_lock_events'];
const count = async (table) => {
  const { count: total, error } = await admin.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return total;
};
const before = await Promise.all(tables.map(count));
const endpoint = 'http://localhost:3001/api/admin/year-closure';
let townId;
let memberId;
let rosterId;
let feeId;
const call = async (action, reason) => {
  const response = await fetch(endpoint, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ townId, fiscalYear: 2026, action, reason }),
  });
  return { status: response.status, body: await response.json() };
};
const remove = async (table, column, value) => {
  const { error } = await admin.from(table).delete().eq(column, value);
  if (error) throw new Error(`${table} cleanup: ${error.message}`);
};
try {
  const { data: town, error: townError } = await admin.from('neighborhoods')
    .insert({ name: `staging-closure-check-${crypto.randomUUID()}`, admin_auth_id: uid })
    .select('id').single();
  if (townError) throw townError;
  townId = town.id;
  const { data: member, error: memberError } = await admin.from('neighborhood_admins')
    .insert({ neighborhood_id: townId, admin_auth_id: uid, admin_email: user.user.email,
      admin_name: 'Staging closure check', status: 'active' }).select('id').single();
  if (memberError) throw memberError;
  memberId = member.id;
  const { data: roster, error: rosterError } = await admin.from('resident_rosters')
    .insert({ neighborhood_id: townId, last_name: 'Staging', full_name: 'Staging closure check' })
    .select('id').single();
  if (rosterError) throw rosterError;
  rosterId = roster.id;
  const { data: fee, error: feeError } = await admin.from('fee_records')
    .insert({ neighborhood_id: townId, roster_id: rosterId, year: 2026, fiscal_year: 2026,
      resident_name: 'Staging closure check', expected_amount: 1000 })
    .select('id').single();
  if (feeError) throw feeError;
  feeId = fee.id;

  for (const kind of ['Fee', 'Assembly']) {
    const finalized = await call(`finalize${kind}`);
    if (finalized.status !== 200 || finalized.body.data?.status !== 'locked'
      || finalized.body.data?.revision !== 1) {
      throw new Error(`${kind} finalize: ${finalized.status} ${finalized.body.error || ''}`);
    }
    const duplicate = await call(`finalize${kind}`);
    if (duplicate.status !== 409) throw new Error(`${kind} duplicate finalize: ${duplicate.status}`);
    const unlocked = await call(`unlock${kind}`, 'staging lifecycle check');
    if (unlocked.status !== 200 || unlocked.body.data?.status !== 'unlocked'
      || unlocked.body.data?.revision !== 1) {
      throw new Error(`${kind} unlock: ${unlocked.status} ${unlocked.body.error || ''}`);
    }
    const duplicateUnlock = await call(`unlock${kind}`, 'staging lifecycle check');
    if (duplicateUnlock.status !== 409) throw new Error(`${kind} duplicate unlock: ${duplicateUnlock.status}`);
    console.log(`${kind}: finalized 200, duplicate 409, unlocked 200, duplicate 409`);
  }
} finally {
  if (townId) {
    for (const table of ['assembly_year_snapshots', 'assembly_year_lock_events',
      'fee_year_snapshot_rows', 'fee_year_lock_events',
      'assembly_year_closures', 'fee_year_closures']) {
      await remove(table, 'neighborhood_id', townId);
    }
  }
  if (feeId) await remove('fee_records', 'id', feeId);
  if (rosterId) await remove('resident_rosters', 'id', rosterId);
  if (memberId) await remove('neighborhood_admins', 'id', memberId);
  if (townId) await remove('neighborhoods', 'id', townId);
  const after = await Promise.all(tables.map(count));
  if (after.some((value, index) => value !== before[index])) {
    throw new Error(`Staging lifecycle test rows not restored: ${JSON.stringify(after)}`);
  }
  console.log('Staging lifecycle table counts restored');
}
