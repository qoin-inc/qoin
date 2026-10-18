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
const endpoint = 'http://localhost:3001/api/admin/assembly-planning';
const tables = ['neighborhoods', 'neighborhood_admins', 'assembly_categories', 'assembly_budgets',
  'assembly_year_closures', 'assembly_year_snapshots', 'assembly_year_lock_events',
  'assembly_record_correction_audit'];
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
const call = async (payload, bearer = token) => {
  const response = await fetch(endpoint, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify({ townId, fiscalYear: 2026, ...payload }),
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
    .insert({ name: `staging-planning-check-${crypto.randomUUID()}`, admin_auth_id: uid })
    .select('id').single();
  if (townError) throw townError;
  townId = town.id;
  const { error: memberError } = await admin.from('neighborhood_admins')
    .insert({ neighborhood_id: townId, admin_auth_id: uid, admin_email: user.user.email,
      admin_name: 'Staging planning check', status: 'active' });
  if (memberError) throw memberError;
  const category = { action: 'categoryCreate', type: 'expense', name: 'Planning check', parentId: null, sortOrder: 10 };
  const rpcArgs = { p_neighborhood_id: townId, p_fiscal_year: 2026,
    p_action: 'create', p_category_id: null, p_type: 'expense', p_name: 'Unauthorized',
    p_parent_id: null, p_sort_order: 1 };
  const anonymous = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } });
  const { error: anonRpcError } = await anonymous.rpc('manage_assembly_category', rpcArgs);
  if (!anonRpcError) throw new Error('Anonymous category RPC was allowed');
  const { error: otherTownRpcError } = await actor.rpc('manage_assembly_category',
    { ...rpcArgs, p_neighborhood_id: 999999999999999 });
  if (!otherTownRpcError) throw new Error('Other-town category RPC was allowed');
  expect(await call(category, ''), 401, 'no auth');
  expect(await call({ ...category, townId: 999999999999999 }), 403, 'other town');
  expect(await call({ ...category, name: '' }), 400, 'blank name');
  const created = await call(category);
  expect(created, 200, 'category create');
  const categoryId = created.body.data;
  if (!categoryId) throw new Error('Category create returned no ID');
  const disposable = await call({ ...category, name: 'Disposable category' });
  expect(disposable, 200, 'disposable category create');
  expect(await call({ action: 'categoryDelete', categoryId: disposable.body.data }),
    200, 'category delete');
  expect(await call({ action: 'categoryUpdate', categoryId, type: 'expense', name: 'Planning updated',
    parentId: null, sortOrder: 11 }), 200, 'category update');
  const budget = { action: 'budgetSave', rows: [
    { categoryId, amount: 300, previousAmount: 200, note: 'staging budget check' },
  ] };
  expect(await call({ ...budget, rows: [{ ...budget.rows[0], amount: -1 }] }), 400, 'negative budget');
  expect(await call(budget), 200, 'budget save');
  const { data: saved, error: savedError } = await admin.from('assembly_budgets')
    .select('budget_amount,previous_budget_amount,note').eq('neighborhood_id', townId)
    .eq('fiscal_year', 2026).eq('category_id', categoryId).single();
  if (savedError || saved.budget_amount !== 300 || saved.previous_budget_amount !== 200) {
    throw new Error('Saved budget mismatch');
  }
  expect(await closure('finalizeAssembly'), 200, 'finalize');
  expect(await call(budget), 409, 'locked budget');
  expect(await call({ action: 'categoryDelete', categoryId }), 409, 'locked category');
  expect(await closure('unlockAssembly', 'staging planning correction test'), 200, 'unlock');
  expect(await call({ ...budget, rows: [{ ...budget.rows[0], amount: 350 }] }), 200, 'budget correction');
  expect(await call({ action: 'categoryUpdate', categoryId, type: 'expense', name: 'Changed after closure',
    parentId: null, sortOrder: 12 }), 409, 'category change after closure');
  const { data: audits, error: auditError } = await admin.from('assembly_record_correction_audit')
    .select('actor_auth_id,table_name').eq('neighborhood_id', townId);
  if (auditError || !audits?.some((row) => row.actor_auth_id === uid && row.table_name === 'assembly_budgets')) {
    throw new Error('Budget correction audit missing');
  }
  console.log('Planning: auth/scope checks, category create/update, budget save, locked rejection and audit passed');
} finally {
  if (townId) {
    for (const table of ['assembly_record_correction_audit', 'assembly_year_snapshots',
      'assembly_year_lock_events', 'assembly_year_closures', 'assembly_budgets',
      'assembly_categories', 'neighborhood_admins']) {
      await remove(table, 'neighborhood_id', townId);
    }
    await remove('neighborhoods', 'id', townId);
  }
  const after = await Promise.all(tables.map(count));
  if (after.some((value, index) => value !== before[index])) {
    throw new Error(`Staging planning test rows not restored: ${JSON.stringify(after)}`);
  }
  console.log('Staging planning table counts restored');
}
