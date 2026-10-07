import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const [pgliteModulePath] = process.argv.slice(2);
if (!pgliteModulePath) {
  throw new Error('Usage: node scripts/test-staging-baseline-pglite.mjs <absolute-pglite-module-path>');
}

const { PGlite } = await import(pathToFileURL(pgliteModulePath).href);
const db = await PGlite.create();

try {
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
  `);

  const baseline = fs.readFileSync('supabase/staging-baseline/20261007_schema_DENY_BY_DEFAULT.sql', 'utf8');
  await db.exec(baseline);

  const checks = fs.readFileSync('supabase/staging-baseline/check_denied.sql', 'utf8');
  await db.exec(checks);

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
