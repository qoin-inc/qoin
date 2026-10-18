import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const ref = 'zghcorbdtslrjtkkspfe';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== `https://${ref}.supabase.co` || process.env.STAGING_SUPABASE_PROJECT_REF !== ref) {
  throw new Error('Staging target mismatch');
}
const uid = process.env.STAGING_SYSTEM_ADMIN_AUTH_ID;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const actor = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const anonymous = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } });
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
const endpoint = 'http://localhost:3001/api/admin/fee-records';
const tables = ['neighborhoods', 'neighborhood_admins', 'resident_rosters', 'fee_records',
  'fee_year_closures', 'fee_year_snapshot_rows', 'fee_year_lock_events', 'fee_record_correction_audit'];
const count = async (table) => {
  const { count: total, error } = await admin.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return total;
};
const before = await Promise.all(tables.map(count));
const remove = async (table, column, value) => {
  const { error } = await admin.from(table).delete().eq(column, value);
  if (error) throw new Error(`${table} cleanup: ${error.message}`);
};
let townId;
let rosterId;
const call = async (mode, rows, bearer = token, overrideTownId = townId) => {
  const response = await fetch(endpoint, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify({ townId: overrideTownId, fiscalYear: 2026, mode, rows }),
  });
  return { status: response.status, body: await response.json() };
};
const closure = async (action, reason) => {
  const response = await fetch('http://localhost:3001/api/admin/year-closure', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ townId, fiscalYear: 2026, action, reason }),
  });
  return { status: response.status, body: await response.json() };
};
const expect = (result, status, label) => {
  if (result.status !== status) throw new Error(`${label}: ${result.status} ${result.body.error || ''}`);
};
try {
  const { data: town, error: townError } = await admin.from('neighborhoods')
    .insert({ name: `staging-fee-write-${crypto.randomUUID()}`, admin_auth_id: uid })
    .select('id').single();
  if (townError) throw townError;
  townId = town.id;
  const { error: memberError } = await admin.from('neighborhood_admins')
    .insert({ neighborhood_id: townId, admin_auth_id: uid, admin_email: user.user.email,
      admin_name: 'Staging fee check', status: 'active' });
  if (memberError) throw memberError;
  const { data: roster, error: rosterError } = await admin.from('resident_rosters')
    .insert({ neighborhood_id: townId, last_name: 'Staging', full_name: 'Staging fee check' })
    .select('id').single();
  if (rosterError) throw rosterError;
  rosterId = roster.id;
  const rows = [{ rosterId, billingAmount: 1000 }];
  const rpcArgs = { p_neighborhood_id: townId, p_fiscal_year: 2026,
    p_mode: 'billing', p_rows: rows };
  const { error: anonymousError } = await anonymous.rpc('write_fee_records', rpcArgs);
  if (!anonymousError) throw new Error('Anonymous fee write RPC was allowed');
  const { error: otherTownError } = await actor.rpc('write_fee_records',
    { ...rpcArgs, p_neighborhood_id: 999999999999999 });
  if (!otherTownError) throw new Error('Other-town fee write RPC was allowed');
  expect(await call('billing', rows, ''), 401, 'no auth');
  expect(await call('billing', rows, token, 999999999999999), 403, 'other town');
  expect(await call('billing', [{ ...rows[0], billingAmount: -1 }]), 400, 'negative amount');
  expect(await call('billing', rows), 200, 'billing create');
  const { data: fee, error: feeError } = await admin.from('fee_records').select('*')
    .eq('neighborhood_id', townId).eq('fiscal_year', 2026).eq('roster_id', rosterId).single();
  if (feeError || fee.expected_amount !== 1000) throw new Error('Billing was not saved');
  const { error: stripeError } = await admin.from('fee_records')
    .update({ paid_amount_stripe: 200, paid_amount: 200, payment_method: 'stripe',
      last_payment_method: 'stripe', stripe_payment_intent_id: 'pi_staging_fee_check' })
    .eq('id', fee.id);
  if (stripeError) throw stripeError;
  expect(await call('billing', [{ rosterId, billingAmount: 1200 },
    { rosterId: crypto.randomUUID(), billingAmount: 1200 }]), 503, 'atomic batch rejection');
  const { data: afterFailedBatch } = await admin.from('fee_records').select('expected_amount')
    .eq('id', fee.id).single();
  if (afterFailedBatch.expected_amount !== 1000) throw new Error('Failed batch changed billing');
  expect(await call('billing', [{ rosterId, billingAmount: 1200 }]), 200, 'billing update');
  expect(await call('cash', [{ rosterId, billingAmount: 1200, cashAmount: 300 }]), 200, 'cash update');
  const { data: paid, error: paidError } = await admin.from('fee_records')
    .select('paid_amount_cash,paid_amount_stripe,paid_amount,expected_amount,stripe_payment_intent_id')
    .eq('id', fee.id).single();
  if (paidError || paid.paid_amount_cash !== 300 || paid.paid_amount_stripe !== 200
    || paid.paid_amount !== 500 || paid.expected_amount !== 1200
    || paid.stripe_payment_intent_id !== 'pi_staging_fee_check') {
    throw new Error('Cash update changed Stripe payment data');
  }
  expect(await closure('finalizeFee'), 200, 'finalize');
  expect(await call('cash', [{ rosterId, billingAmount: 1200, cashAmount: 400 }]), 409, 'locked cash');
  expect(await closure('unlockFee', 'staging fee correction check'), 200, 'unlock');
  expect(await call('billing', rows), 403, 'batch during correction');
  expect(await call('cash', [{ rosterId, billingAmount: 1200, cashAmount: 400 }]),
    200, 'representative cash correction');
  const { data: audits, error: auditError } = await admin.from('fee_record_correction_audit')
    .select('actor_auth_id').eq('neighborhood_id', townId);
  if (auditError || !audits?.some((item) => item.actor_auth_id === uid)) {
    throw new Error('Fee correction audit missing');
  }
  console.log('Fee writes: auth/scope, atomicity, Stripe preservation, year lock, audit passed');
} finally {
  if (townId) {
    for (const table of ['fee_record_correction_audit', 'fee_year_snapshot_rows',
      'fee_year_lock_events', 'fee_year_closures', 'fee_records',
      'resident_rosters', 'neighborhood_admins']) {
      await remove(table, 'neighborhood_id', townId);
    }
    await remove('neighborhoods', 'id', townId);
  }
  const after = await Promise.all(tables.map(count));
  if (after.some((value, index) => value !== before[index])) {
    throw new Error(`Staging fee write test rows not restored: ${JSON.stringify(after)}`);
  }
  console.log('Staging fee write table counts restored');
}
