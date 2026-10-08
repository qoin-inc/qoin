import fs from 'node:fs';
import path from 'node:path';

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error('Usage: node scripts/build-staging-baseline.mjs <review-draft.sql> <output.sql>');
}

const source = fs.readFileSync(sourcePath, 'utf8');
const guard = 'END $review_guard$;';
const guardEnd = source.indexOf(guard);
if (guardEnd < 0 || !source.includes('Review-only schema draft: do not apply')) {
  throw new Error('Input must be the guarded review draft.');
}

const lines = source.slice(guardEnd + guard.length).split(/\r?\n/);
const kept = [];
let policiesRemoved = 0;
let aclStatementsRemoved = 0;
let skippingPolicy = false;

for (const line of lines) {
  if (skippingPolicy) {
    if (line.trimEnd().endsWith(';')) skippingPolicy = false;
    continue;
  }
  if (/^CREATE POLICY\s/.test(line)) {
    policiesRemoved += 1;
    skippingPolicy = !line.trimEnd().endsWith(';');
    continue;
  }
  if (/^(GRANT |REVOKE |ALTER DEFAULT PRIVILEGES )/.test(line)) {
    if (!line.trimEnd().endsWith(';')) throw new Error('Unexpected multiline ACL statement.');
    aclStatementsRemoved += 1;
    continue;
  }
  kept.push(line);
}

if (skippingPolicy || policiesRemoved !== 135 || aclStatementsRemoved !== 343) {
  throw new Error(`Unexpected draft layout: ${policiesRemoved} policies, ${aclStatementsRemoved} ACL statements.`);
}

let body = kept.join('\n').trim();
if (/^CREATE POLICY\s|^(?:GRANT |REVOKE |ALTER DEFAULT PRIVILEGES )/m.test(body)) {
  throw new Error('Unsafe access statement remained after extraction.');
}

function replaceFunction(name, definition) {
  const marker = `CREATE OR REPLACE FUNCTION "public"."${name}"`;
  const start = body.indexOf(marker);
  const end = body.indexOf('\n\nALTER FUNCTION', start);
  if (start < 0 || end < 0 || body.indexOf(marker, start + marker.length) >= 0) {
    throw new Error(`Unexpected definition for ${name}.`);
  }
  body = body.slice(0, start) + definition.trim() + body.slice(end);
}

const adminById = (name) => `
CREATE OR REPLACE FUNCTION "public"."${name}"("target_neighborhood_id" bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.neighborhood_admins AS admins
      WHERE admins.neighborhood_id = target_neighborhood_id
        AND admins.status = 'active' AND admins.admin_auth_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.neighborhoods AS town
      WHERE town.id = target_neighborhood_id AND town.admin_auth_id = auth.uid())
  );
$$;`;
const representativeById = (name) => `
CREATE OR REPLACE FUNCTION "public"."${name}"("target_neighborhood_id" bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.neighborhoods AS town
    WHERE town.id = target_neighborhood_id AND town.admin_auth_id = auth.uid()
  );
$$;`;

replaceFunction('assembly_actor_is_admin', adminById('assembly_actor_is_admin'));
replaceFunction('fee_actor_is_admin', adminById('fee_actor_is_admin'));
replaceFunction('assembly_actor_is_representative', representativeById('assembly_actor_is_representative'));
replaceFunction('fee_actor_is_representative', representativeById('fee_actor_is_representative'));
for (const name of ['el_town_actor_is_system_admin', 'is_el_town_system_admin']) {
  replaceFunction(name, `
CREATE OR REPLACE FUNCTION "public"."${name}"() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$ SELECT false; $$;`);
}
replaceFunction('ensure_system_admin_for_neighborhood', `
CREATE OR REPLACE FUNCTION "public"."ensure_system_admin_for_neighborhood"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$ BEGIN RETURN NEW; END; $$;`);
replaceFunction('handle_delete_auth_user', `
CREATE OR REPLACE FUNCTION "public"."handle_delete_auth_user"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$ BEGIN RETURN OLD; END; $$;`);
replaceFunction('get_monthly_push_count', `
CREATE OR REPLACE FUNCTION "public"."get_monthly_push_count"("town_id" integer, "start_time" timestamp with time zone) RETURNS bigint
    LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
    AS $$
  SELECT COALESCE(SUM(recipient_count), 0)::BIGINT
  FROM public.line_push_logs
  WHERE neighborhood_id = town_id AND sent_at >= start_time;
$$;`);
if (body.includes('staging-admin@example.invalid') || /auth\.jwt\(\)\s*->>\s*'email'/.test(body)) {
  throw new Error('Email-based administrator rule remained in the baseline.');
}

const preamble = `-- Staging schema baseline: structure only, deny direct client access by default.
-- Derived from the guarded 2026-10-06 schema-only draft. No row data or Auth users.
-- Apply only to an EMPTY staging project after verifying its Project Ref outside SQL.
-- Do not replay the 12 existing migrations on top of this snapshot.
-- Storage bucket/policies and client GRANT/RLS rules require separate review.
BEGIN;
-- Refuse to modify a database that already contains application tables or Auth users.
-- The project identity must still be verified separately in the Supabase dashboard.
DO $empty_staging_guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  ) OR EXISTS (SELECT 1 FROM auth.users) THEN
    RAISE EXCEPTION 'Staging baseline requires an empty public schema and zero Auth users';
  END IF;
END;
$empty_staging_guard$;
`;

const hardening = `
-- Supabase projects may start with default privileges. Remove them explicitly.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Service-role access is reserved for server-side code; never expose its key to a browser.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

COMMIT;
`;

const output = preamble + body + '\n' + hardening;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Wrote deny-by-default baseline; removed ${policiesRemoved} policies and ${aclStatementsRemoved} ACL statements.`);
