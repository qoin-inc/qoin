import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const [pgliteModulePath] = process.argv.slice(2);
if (!pgliteModulePath) throw new Error('Usage: node scripts/test-staging-system-admin-identity-pglite.mjs <absolute-pglite-module-path>');

const { PGlite } = await import(pathToFileURL(pgliteModulePath).href);
const db = await PGlite.create();
const adminId = '00000000-0000-4000-8000-000000000001';
const otherId = '00000000-0000-4000-8000-000000000002';

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
  await db.exec(fs.readFileSync('supabase/staging-baseline/20261009_admin_invite_membership_STAGING.sql', 'utf8'));
  const identitySql = fs.readFileSync('supabase/staging-baseline/20261013_system_admin_identity_STAGING.sql', 'utf8');
  await db.exec(identitySql);
  const postflight = await db.query(fs.readFileSync('supabase/staging-baseline/postflight_system_admin_identity_readonly.sql', 'utf8'));
  assert.deepEqual(postflight.rows[0], {
    identity_table_present: true, identity_rls_enabled: true,
    anon_schema_usage: false, client_schema_usage: false,
    anon_identity_read: false, client_identity_read: false,
    configured_admins: 0,
    anon_function_execute: false,
    client_function_execute: true, client_actor_function_execute: true,
  });

  await db.exec(`INSERT INTO auth.users (id) VALUES ('${adminId}'), ('${otherId}');`);
  await db.exec(`INSERT INTO el_town_staging_private.system_admin_identity (auth_user_id) VALUES ('${adminId}');`);
  await db.exec('SET row_security = on;');
  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${adminId}';`);
  const admin = await db.query('SELECT public.is_el_town_system_admin() AS direct, public.el_town_actor_is_system_admin() AS actor');
  assert.deepEqual(admin.rows[0], { direct: true, actor: true });
  await assert.rejects(db.query('SELECT * FROM el_town_staging_private.system_admin_identity'), (error) => error?.code === '42501');
  await db.exec(`SET request.jwt.claim.sub = '${otherId}';`);
  const other = await db.query('SELECT public.is_el_town_system_admin() AS direct, public.el_town_actor_is_system_admin() AS actor');
  assert.deepEqual(other.rows[0], { direct: false, actor: false });
  await db.exec("SET request.jwt.claim.sub = ''; ");
  const anonymousJwt = await db.query('SELECT public.is_el_town_system_admin() AS direct');
  assert.equal(anonymousJwt.rows[0].direct, false);
  await db.exec(`RESET ROLE; SET ROLE anon; SET request.jwt.claim.sub = '${adminId}';`);
  await assert.rejects(db.query('SELECT public.is_el_town_system_admin()'), (error) => error?.code === '42501');
  await db.exec('RESET ROLE;');

  await assert.rejects(db.exec(identitySql), /Unexpected staging database state/);
  await db.exec('ROLLBACK;');
  console.log(JSON.stringify({ guard: true, ...postflight.rows[0], admin: true, other: false, anon_denied: true }));
} catch (error) {
  console.error(String(error?.message || error).slice(0, 2000));
  process.exitCode = 1;
} finally {
  await db.close();
}
