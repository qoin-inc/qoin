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
const { data: signedIn, error: signInError } = await client.auth.verifyOtp({
  token_hash: link.properties.hashed_token, type: 'magiclink',
});
if (signInError || signedIn.user?.id !== uid || !signedIn.session?.access_token) {
  throw new Error('Temporary staging session mismatch');
}
const token = signedIn.session.access_token;
const base = 'http://localhost:3001/api/admin/accounting-read';
const endpoint = (townId, kind) => `${base}?${new URLSearchParams({
  townId: String(townId), kind, ...(kind === 'assembly' ? { fiscalYear: '2026' } : {}),
})}`;
const request = (townId, kind, auth = true) => fetch(endpoint(townId, kind), {
  headers: auth ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store',
});
const tables = ['neighborhoods', 'neighborhood_admins', 'assembly_categories',
  'fee_year_closures', 'assembly_year_closures', 'assembly_year_snapshots'];
const count = async (table) => {
  const { count: total, error } = await admin.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return total;
};
const before = await Promise.all(tables.map(count));
let ownTownId;
let otherTownId;
let memberId;
let feeClosureId;
let assemblyClosureId;
let snapshotId;
try {
  const { data: ownTown, error: ownError } = await admin.from('neighborhoods')
    .insert({ name: `accounting-own-${crypto.randomUUID()}` }).select('id').single();
  if (ownError) throw ownError;
  ownTownId = ownTown.id;
  const { data: otherTown, error: otherError } = await admin.from('neighborhoods')
    .insert({ name: `accounting-other-${crypto.randomUUID()}` }).select('id').single();
  if (otherError) throw otherError;
  otherTownId = otherTown.id;

  for (const kind of ['feeClosures', 'assembly']) {
    const noAuth = await request(ownTownId, kind, false);
    if (noAuth.status !== 401) throw new Error(`${kind} no auth: ${noAuth.status}`);
    const noMembership = await request(ownTownId, kind);
    if (noMembership.status !== 403) throw new Error(`${kind} no membership: ${noMembership.status}`);
  }
  const { data: member, error: memberError } = await admin.from('neighborhood_admins')
    .insert({ neighborhood_id: ownTownId, admin_auth_id: uid, admin_email: user.user.email,
      admin_name: 'Staging accounting check', status: 'active' }).select('id').single();
  if (memberError) throw memberError;
  memberId = member.id;

  const fee = await request(ownTownId, 'feeClosures');
  const feeBody = await fee.json();
  if (fee.status !== 200 || !Array.isArray(feeBody.closures)
    || feeBody.closures.some((row) => String(row.neighborhood_id) !== String(ownTownId))) {
    throw new Error(`Own fee closures: ${fee.status}: ${feeBody.error || ''}`);
  }
  const assembly = await request(ownTownId, 'assembly');
  const assemblyBody = await assembly.json();
  if (assembly.status !== 200 || !Array.isArray(assemblyBody.categories)
    || !Array.isArray(assemblyBody.budgets) || !Array.isArray(assemblyBody.settlements)
    || assemblyBody.categories.some((row) => String(row.neighborhood_id) !== String(ownTownId))) {
    throw new Error(`Own assembly: ${assembly.status}: ${assemblyBody.error || ''}`);
  }

  const { data: feeClosure, error: feeClosureError } = await admin.from('fee_year_closures')
    .insert({ neighborhood_id: ownTownId, fiscal_year: 2026, status: 'locked' }).select('id').single();
  if (feeClosureError) throw feeClosureError;
  feeClosureId = feeClosure.id;
  const { data: assemblyClosure, error: assemblyClosureError } = await admin.from('assembly_year_closures')
    .insert({ neighborhood_id: ownTownId, fiscal_year: 2026, status: 'locked' }).select('id').single();
  if (assemblyClosureError) throw assemblyClosureError;
  assemblyClosureId = assemblyClosure.id;
  const marker = `locked-snapshot-${crypto.randomUUID()}`;
  const { data: snapshot, error: snapshotError } = await admin.from('assembly_year_snapshots')
    .insert({ closure_id: assemblyClosureId, revision: 1, neighborhood_id: ownTownId,
      fiscal_year: 2026, categories: [{ id: marker, neighborhood_id: ownTownId }] }).select('id').single();
  if (snapshotError) throw snapshotError;
  snapshotId = snapshot.id;
  const closedFee = await request(ownTownId, 'feeClosures');
  const closedFeeBody = await closedFee.json();
  if (closedFee.status !== 200 || closedFeeBody.closures?.length !== 1
    || String(closedFeeBody.closures[0].id) !== String(feeClosureId)) {
    throw new Error(`Locked fee closure: ${closedFee.status}`);
  }
  const closedAssembly = await request(ownTownId, 'assembly');
  const closedAssemblyBody = await closedAssembly.json();
  if (closedAssembly.status !== 200 || closedAssemblyBody.closure?.status !== 'locked'
    || closedAssemblyBody.snapshot?.categories?.[0]?.id !== marker
    || 'settlements' in closedAssemblyBody) {
    throw new Error(`Locked assembly snapshot: ${closedAssembly.status}: ${closedAssemblyBody.error || ''}`);
  }
  for (const kind of ['feeClosures', 'assembly']) {
    const other = await request(otherTownId, kind);
    if (other.status !== 403) throw new Error(`${kind} other town: ${other.status}`);
  }
  const invalid = await fetch(`${base}?kind=assembly&townId=${ownTownId}&fiscalYear=bad`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (invalid.status !== 400) throw new Error(`Invalid fiscal year: ${invalid.status}`);

  const { error: retireError } = await admin.from('neighborhood_admins')
    .update({ status: 'retired' }).eq('id', memberId);
  if (retireError) throw retireError;
  for (const kind of ['feeClosures', 'assembly']) {
    const retired = await request(ownTownId, kind);
    if (retired.status !== 403) throw new Error(`${kind} retired: ${retired.status}`);
  }
  console.log('staging accounting read: both views 401/403/200/403/403; invalid year 400; locked snapshots verified');
} finally {
  if (snapshotId) {
    const { error } = await admin.from('assembly_year_snapshots').delete().eq('id', snapshotId);
    if (error) throw error;
  }
  if (assemblyClosureId) {
    const { error } = await admin.from('assembly_year_closures').delete().eq('id', assemblyClosureId);
    if (error) throw error;
  }
  if (feeClosureId) {
    const { error } = await admin.from('fee_year_closures').delete().eq('id', feeClosureId);
    if (error) throw error;
  }
  if (memberId) {
    const { error } = await admin.from('neighborhood_admins').delete().eq('id', memberId);
    if (error) throw error;
  }
  for (const townId of [ownTownId, otherTownId]) {
    if (!townId) continue;
    const { error } = await admin.from('neighborhoods').delete().eq('id', townId);
    if (error) throw error;
  }
  const after = await Promise.all(tables.map(count));
  if (after.some((value, index) => value !== before[index])) {
    throw new Error(`Staging accounting test data not restored: ${JSON.stringify(after)}`);
  }
  console.log('staging accounting read: checked table counts restored');
}
