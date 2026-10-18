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
const endpoint = 'http://localhost:3001/api/admin/assembly-settlement';
const tables = ['neighborhoods', 'neighborhood_admins', 'assembly_categories',
  'assembly_settlements', 'assembly_year_closures', 'assembly_year_snapshots',
  'assembly_year_lock_events', 'assembly_record_correction_audit'];
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
let membershipId;
let categoryId;
let settlementId;
const call = async (method, payload, bearer = token) => {
  const response = await fetch(endpoint, { method,
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
};
const expect = (result, status, label) => {
  if (result.status !== status) throw new Error(`${label}: ${result.status} ${result.body.error || ''}`);
};
try {
  const { data: town, error: townError } = await admin.from('neighborhoods')
    .insert({ name: `staging-settlement-check-${crypto.randomUUID()}`, admin_auth_id: uid })
    .select('id').single();
  if (townError) throw townError;
  townId = town.id;
  const { data: member, error: memberError } = await admin.from('neighborhood_admins')
    .insert({ neighborhood_id: townId, admin_auth_id: uid, admin_email: user.user.email,
      admin_name: 'Staging settlement check', status: 'active' }).select('id').single();
  if (memberError) throw memberError;
  membershipId = member.id;
  const { data: category, error: categoryError } = await admin.from('assembly_categories')
    .insert({ neighborhood_id: townId, type: 'expense', name: 'Staging settlement check', is_active: true })
    .select('id').single();
  if (categoryError) throw categoryError;
  categoryId = category.id;
  const payload = { townId, fiscalYear: 2026, categoryId, amount: 123,
    paidDate: '2026-10-18', description: 'staging settlement check' };
  const { error: noMembershipError } = await actor.rpc('create_assembly_settlement', {
    p_neighborhood_id: 999999999999999, p_fiscal_year: 2026, p_category_id: categoryId,
    p_amount: 123, p_paid_date: '2026-10-18', p_description: 'denied',
  });
  if (!noMembershipError) throw new Error('Direct RPC accepted a non-member town');
  const anonymous = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error: anonError } = await anonymous.rpc('create_assembly_settlement', {
    p_neighborhood_id: townId, p_fiscal_year: 2026, p_category_id: categoryId,
    p_amount: 123, p_paid_date: '2026-10-18', p_description: 'denied',
  });
  if (!anonError) throw new Error('Direct RPC accepted an anonymous caller');
  expect(await call('POST', payload, ''), 401, 'no auth');
  expect(await call('POST', { ...payload, fiscalYear: 1999 }), 400, 'bad year');
  expect(await call('POST', { ...payload, townId: 999999999999999 }), 403, 'other town');
  const created = await call('POST', payload);
  expect(created, 200, 'create');
  settlementId = created.body.data;
  if (!settlementId) throw new Error('Create returned no ID');
  expect(await call('DELETE', { townId, fiscalYear: 2027, settlementId }), 404, 'wrong year');
  const deleted = await call('DELETE', { townId, fiscalYear: 2026, settlementId });
  expect(deleted, 200, 'delete');
  settlementId = undefined;
  const second = await call('POST', payload);
  expect(second, 200, 'create before lock');
  settlementId = second.body.data;
  const closure = async (action, reason) => {
    const response = await fetch('http://localhost:3001/api/admin/year-closure', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ townId, fiscalYear: 2026, action, reason }),
    });
    return { status: response.status, body: await response.json() };
  };
  expect(await closure('finalizeAssembly'), 200, 'finalize');
  expect(await call('DELETE', { townId, fiscalYear: 2026, settlementId }), 409, 'locked year');
  expect(await closure('unlockAssembly', 'staging settlement correction test'), 200, 'unlock');
  const correction = await call('POST', { ...payload, description: 'staging correction' });
  expect(correction, 200, 'representative correction');
  const { data: audits, error: auditError } = await admin.from('assembly_record_correction_audit')
    .select('actor_auth_id').eq('neighborhood_id', townId);
  if (auditError || !audits?.some((row) => row.actor_auth_id === uid)) {
    throw new Error('Correction audit did not record staging actor');
  }
  expect(await call('DELETE', { townId, fiscalYear: 2026, settlementId }), 200, 'correction delete');
  settlementId = correction.body.data;
  expect(await call('DELETE', { townId, fiscalYear: 2026, settlementId }), 200, 'second correction delete');
  settlementId = undefined;
  console.log('Settlement: direct RPC and API auth/scope checks, create/delete, locked rejection, correction audit passed');
} finally {
  if (townId) {
    await remove('assembly_record_correction_audit', 'neighborhood_id', townId);
    await remove('assembly_year_snapshots', 'neighborhood_id', townId);
    await remove('assembly_year_lock_events', 'neighborhood_id', townId);
    await remove('assembly_year_closures', 'neighborhood_id', townId);
  }
  if (settlementId) await remove('assembly_settlements', 'id', settlementId);
  if (categoryId) await remove('assembly_categories', 'id', categoryId);
  if (membershipId) await remove('neighborhood_admins', 'id', membershipId);
  if (townId) await remove('neighborhoods', 'id', townId);
  const after = await Promise.all(tables.map(count));
  if (after.some((value, index) => value !== before[index])) {
    throw new Error(`Staging settlement test rows not restored: ${JSON.stringify(after)}`);
  }
  console.log('Staging settlement table counts restored');
}
