import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const [pgliteModulePath] = process.argv.slice(2);
if (!pgliteModulePath) {
  throw new Error('Usage: node scripts/test-staging-admin-invite-access-pglite.mjs <absolute-pglite-module-path>');
}

const { PGlite } = await import(pathToFileURL(pgliteModulePath).href);
const db = await PGlite.create();
const userA = '00000000-0000-4000-8000-000000000001';
const userB = '00000000-0000-4000-8000-000000000002';
const pendingUser = '00000000-0000-4000-8000-000000000003';

const denied = async (sql) => {
  await assert.rejects(db.query(sql), (error) => error?.code === '42501');
};

try {
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
  `);

  await db.exec(fs.readFileSync('supabase/staging-baseline/20261007_schema_DENY_BY_DEFAULT.sql', 'utf8'));
  // pg_dump baselines disable row-security for restore; client probes need it on.
  await db.exec('SET row_security = on;');

  // The fixture must reject accidental execution without the local-only setting.
  await assert.rejects(
    db.exec(fs.readFileSync('supabase/staging-baseline/20261008_admin_invite_membership_LOCAL_ONLY.sql', 'utf8')),
    /Local staging access test only/,
  );
  await db.exec('ROLLBACK;');
  await db.exec("SELECT set_config('el_town.local_staging_access_test', 'on', false);");
  await db.exec(fs.readFileSync('supabase/staging-baseline/20261008_admin_invite_membership_LOCAL_ONLY.sql', 'utf8'));

  await db.exec(`
    INSERT INTO public.neighborhoods (id, name) VALUES (10, '架空町内会A'), (20, '架空町内会B');
    INSERT INTO public.neighborhood_admins
      (id, neighborhood_id, admin_auth_id, admin_name, admin_email, status, admin_invite_token, invite_token)
    VALUES
      (1, 10, '${userA}', '役員A', 'a@example.invalid', 'active', NULL, NULL),
      (2, 10, '${pendingUser}', '候補者', 'pending@example.invalid', 'pending', 'local-secret', 'local-secret'),
      (3, 20, '${userB}', '役員B', 'b@example.invalid', 'active', NULL, NULL);
  `);

  const permissions = await db.query(`
    SELECT
      has_column_privilege('authenticated', 'public.neighborhood_admins', 'id', 'SELECT') AS member_id_read,
      has_column_privilege('authenticated', 'public.neighborhood_admins', 'admin_invite_token', 'SELECT') AS token_read,
      has_table_privilege('authenticated', 'public.neighborhood_admins', 'INSERT') AS client_insert,
      has_table_privilege('authenticated', 'public.neighborhood_admins', 'UPDATE') AS client_update,
      has_table_privilege('anon', 'public.neighborhood_admins', 'SELECT') AS anon_read,
      has_table_privilege('service_role', 'public.neighborhood_admins', 'UPDATE') AS server_update,
      (SELECT count(*) FROM pg_policy WHERE polrelid='public.neighborhood_admins'::regclass) AS policy_count;
  `);
  assert.deepEqual(permissions.rows[0], {
    member_id_read: true, token_read: false, client_insert: false, client_update: false,
    anon_read: false, server_update: true, policy_count: 1,
  });

  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${userA}';`);
  const ownA = await db.query('SELECT id FROM public.neighborhood_admins ORDER BY id');
  assert.deepEqual(ownA.rows.map((row) => row.id), [1]);
  await denied('SELECT admin_invite_token FROM public.neighborhood_admins');
  await denied("UPDATE public.neighborhood_admins SET status='active' WHERE id=2");
  await denied("INSERT INTO public.neighborhood_admins (id, admin_name, admin_email) VALUES (4, '不正', 'bad@example.invalid')");
  await db.exec(`SET request.jwt.claim.sub = '${userB}';`);
  const ownB = await db.query('SELECT id FROM public.neighborhood_admins ORDER BY id');
  assert.deepEqual(ownB.rows.map((row) => row.id), [3]);
  await db.exec(`SET request.jwt.claim.sub = '${pendingUser}';`);
  const pending = await db.query('SELECT id FROM public.neighborhood_admins');
  assert.equal(pending.rows.length, 0);
  await db.exec('RESET ROLE; SET ROLE anon;');
  await denied('SELECT id FROM public.neighborhood_admins');
  await db.exec('RESET ROLE; SET ROLE service_role;');
  const server = await db.query("UPDATE public.neighborhood_admins SET status='active' WHERE id=2 RETURNING id");
  assert.deepEqual(server.rows.map((row) => row.id), [2]);
  await db.exec('RESET ROLE;');

  console.log(JSON.stringify({ local_only_guard: true, ...permissions.rows[0], own_A: [1], own_B: [3], pending_visible: 0, server_update_rows: [2] }));
} catch (error) {
  console.error(String(error?.message || error).slice(0, 2000));
  process.exitCode = 1;
} finally {
  await db.close();
}
