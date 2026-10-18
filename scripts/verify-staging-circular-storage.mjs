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
const resident = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
const bucket = 'circular-attachments';
const endpoint = 'http://localhost:3001/api/admin/circulars';
const media = new Blob(['%PDF-1.4\n%%EOF\n'], { type: 'application/pdf' });
let townId;
let circularId;
let path;
let residentUid;
const send = async (body, bearer = token) => {
  const response = await fetch(endpoint, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};
const expect = (result, status, label) => {
  if (result.status !== status) throw new Error(`${label}: ${result.status} ${result.body.error || ''}`);
};
try {
  const { data: town, error: townError } = await admin.from('neighborhoods')
    .insert({ name: `staging-circular-${crypto.randomUUID()}`, admin_auth_id: uid })
    .select('id').single();
  if (townError) throw townError;
  townId = town.id;
  const { error: membershipError } = await admin.from('neighborhood_admins')
    .insert({ neighborhood_id: townId, admin_auth_id: uid, admin_email: user.user.email,
      admin_name: 'Staging circular check', status: 'active' });
  if (membershipError) throw membershipError;
  path = `${townId}/circulars/${crypto.randomUUID()}.pdf`;
  const otherPath = `999999999999999/circulars/${crypto.randomUUID()}.pdf`;
  const deniedAnon = await anonymous.storage.from(bucket).upload(path, media, { contentType: 'application/pdf' });
  if (!deniedAnon.error) throw new Error('Anonymous upload was allowed');
  const deniedOther = await actor.storage.from(bucket).upload(otherPath, media, { contentType: 'application/pdf' });
  if (!deniedOther.error) throw new Error('Other-town upload was allowed');
  const uploaded = await actor.storage.from(bucket).upload(path, media, { contentType: 'application/pdf' });
  if (uploaded.error) throw uploaded.error;
  const signed = await actor.storage.from(bucket).createSignedUrl(path, 60);
  if (signed.error || !signed.data?.signedUrl) throw new Error('Admin signed URL unavailable');
  const deniedSigned = await anonymous.storage.from(bucket).createSignedUrl(path, 60);
  if (!deniedSigned.error) throw new Error('Anonymous signed URL was allowed');

  const payload = { townId, category: 'circular', title: 'Staging circular test',
    content: 'Temporary staging record', sender: 'Staging test', pushEnabled: false,
    attachment: { name: 'test.pdf', path, type: 'application/pdf', role: 'attachment' } };
  expect(await send(payload, ''), 401, 'missing auth');
  expect(await send({ ...payload, townId: 999999999999999, attachment: null }), 403, 'other town');
  const created = await send(payload);
  expect(created, 200, 'circular create');
  circularId = created.body.data?.id;
  if (!circularId || created.body.data?.attachments?.[0]?.path !== path
    || created.body.data?.attachment_url || created.body.data?.image_url) {
    throw new Error('Private attachment path not saved correctly');
  }
  const { data: readable, error: readError } = await actor.from('circulars').select('id')
    .eq('id', circularId).single();
  if (readError || readable?.id !== circularId) {
    throw new Error(`Admin circular read was denied: ${readError?.message || 'row missing'}`);
  }
  const { data: anonymousRead, error: anonymousReadError } = await anonymous.from('circulars')
    .select('id').eq('id', circularId);
  if (anonymousRead?.length || (anonymousReadError && !/permission denied/i.test(anonymousReadError.message))) {
    throw new Error('Anonymous circular read was allowed or failed unexpectedly');
  }
  const residentEmail = `staging-circular-${crypto.randomUUID()}@example.invalid`;
  const createdUser = await admin.auth.admin.createUser({ email: residentEmail, email_confirm: true });
  if (createdUser.error || !createdUser.data.user?.id) throw createdUser.error || new Error('Resident user missing');
  residentUid = createdUser.data.user.id;
  const { error: rosterError } = await admin.from('resident_rosters').insert({
    neighborhood_id: townId, last_name: 'Staging', full_name: 'Staging circular resident',
    user_auth_id: residentUid,
  });
  if (rosterError) throw rosterError;
  const residentLink = await admin.auth.admin.generateLink({ type: 'magiclink', email: residentEmail });
  if (residentLink.error || !residentLink.data.properties?.hashed_token) {
    throw residentLink.error || new Error('Resident link missing');
  }
  const residentSession = await resident.auth.verifyOtp({
    token_hash: residentLink.data.properties.hashed_token, type: 'magiclink',
  });
  if (residentSession.error || residentSession.data.user?.id !== residentUid) {
    throw residentSession.error || new Error('Resident session mismatch');
  }
  const residentRead = await resident.from('circulars').select('id').eq('id', circularId).single();
  if (residentRead.error || residentRead.data?.id !== circularId) {
    throw new Error(`Resident circular read denied: ${residentRead.error?.message || ''}`);
  }
  const residentSigned = await resident.storage.from(bucket).createSignedUrl(path, 60);
  if (residentSigned.error || !residentSigned.data?.signedUrl) {
    throw new Error(`Resident attachment read denied: ${residentSigned.error?.message || ''}`);
  }
  const residentUpload = await resident.storage.from(bucket).upload(
    `${townId}/circulars/${crypto.randomUUID()}.pdf`, media, { contentType: 'application/pdf' });
  if (!residentUpload.error) throw new Error('Resident upload was allowed');
  console.log('Staging circular storage: admin/resident reads, admin upload, anonymous/resident/other-town denials, route scope passed');
} finally {
  if (circularId) await admin.from('circulars').delete().eq('id', circularId);
  if (path) await admin.storage.from(bucket).remove([path]);
  if (townId) {
    await admin.from('resident_rosters').delete().eq('neighborhood_id', townId);
    await admin.from('neighborhood_admins').delete().eq('neighborhood_id', townId);
    await admin.from('neighborhoods').delete().eq('id', townId);
  }
  if (residentUid) await admin.auth.admin.deleteUser(residentUid);
}
