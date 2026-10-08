import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const [pgliteModulePath] = process.argv.slice(2);
if (!pgliteModulePath) {
  throw new Error('Usage: node scripts/test-staging-baseline-pglite.mjs <absolute-pglite-module-path>');
}

const { PGlite } = await import(pathToFileURL(pgliteModulePath).href);
const db = await PGlite.create();
const baseline = fs.readFileSync('supabase/staging-baseline/20261007_schema_DENY_BY_DEFAULT.sql', 'utf8');

async function expectGuardToBlock(setup) {
  const guardedDb = await PGlite.create();
  try {
    await guardedDb.exec('CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);');
    await guardedDb.exec(setup);
    await assert.rejects(
      () => guardedDb.exec(baseline),
      /Staging baseline requires zero public tables\/functions and Auth users/,
    );
    await guardedDb.exec('ROLLBACK;');
    const result = await guardedDb.query("SELECT to_regclass('public.neighborhood_admins') IS NULL AS unchanged;");
    assert.equal(result.rows[0].unchanged, true);
  } finally {
    await guardedDb.close();
  }
}

try {
  await expectGuardToBlock('CREATE TABLE public.existing_data (id integer);');
  await expectGuardToBlock('CREATE FUNCTION public.existing_function() RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$;');
  await expectGuardToBlock("INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001');");
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
  `);

  await db.exec(baseline);

  const checks = fs.readFileSync('supabase/staging-baseline/check_denied.sql', 'utf8');
  await db.exec(checks);

  const postflight = fs.readFileSync('supabase/staging-baseline/postflight_readonly.sql', 'utf8');
  const verified = await db.query(postflight);
  assert.deepEqual(
    {
      public_tables: verified.rows[0].public_tables,
      public_functions: verified.rows[0].public_functions,
      public_policies: verified.rows[0].public_policies,
      rls_tables: verified.rows[0].rls_tables,
      auth_users: verified.rows[0].auth_users,
      anon_admin_read: verified.rows[0].anon_admin_read,
      authenticated_admin_read: verified.rows[0].authenticated_admin_read,
      service_admin_update: verified.rows[0].service_admin_update,
    },
    {
      public_tables: 45,
      public_functions: 31,
      public_policies: 0,
      rls_tables: 45,
      auth_users: 0,
      anon_admin_read: false,
      authenticated_admin_read: false,
      service_admin_update: true,
    },
  );

  const result = await db.query(`
    SELECT
      (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r','p')) AS tables,
      (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') AS policies,
      has_table_privilege('anon', 'public.neighborhood_admins', 'SELECT') AS anon_admin_read,
      has_table_privilege('service_role', 'public.neighborhood_admins', 'UPDATE') AS service_admin_update;
  `);
  console.log(JSON.stringify({ postgres: 'PGlite', ...result.rows[0] }));
} catch (error) {
  console.error(String(error?.message || error).slice(0, 2000));
  process.exitCode = 1;
} finally {
  await db.close();
}
