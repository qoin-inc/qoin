-- Run with psql -v ON_ERROR_STOP=1 against a disposable LOCAL database only.
-- These checks intentionally fail if broad client access reappears.
BEGIN;

DO $checks$
DECLARE
  table_count integer;
  function_count integer;
BEGIN
  SELECT count(*) INTO table_count FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p');
  IF table_count <> 45 THEN
    RAISE EXCEPTION 'Expected 45 public tables, found %', table_count;
  END IF;

  SELECT count(*) INTO function_count FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public';
  IF function_count <> 31 THEN
    RAISE EXCEPTION 'Expected 31 public functions, found %', function_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
  ) THEN RAISE EXCEPTION 'A public table has RLS disabled'; END IF;

  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public')
  THEN RAISE EXCEPTION 'Unreviewed public policy is present'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m')
      AND (has_table_privilege('anon', c.oid, 'SELECT')
        OR has_table_privilege('anon', c.oid, 'INSERT')
        OR has_table_privilege('anon', c.oid, 'UPDATE')
        OR has_table_privilege('anon', c.oid, 'DELETE')
        OR has_table_privilege('authenticated', c.oid, 'SELECT')
        OR has_table_privilege('authenticated', c.oid, 'INSERT')
        OR has_table_privilege('authenticated', c.oid, 'UPDATE')
        OR has_table_privilege('authenticated', c.oid, 'DELETE'))
  ) THEN RAISE EXCEPTION 'Client role has direct table or sequence access'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S'
      AND (has_sequence_privilege('anon', c.oid, 'USAGE')
        OR has_sequence_privilege('anon', c.oid, 'SELECT')
        OR has_sequence_privilege('authenticated', c.oid, 'USAGE')
        OR has_sequence_privilege('authenticated', c.oid, 'SELECT'))
  ) THEN RAISE EXCEPTION 'Client role has sequence access'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND
      (has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  ) THEN RAISE EXCEPTION 'Client role can execute an unreviewed function'; END IF;

  IF has_schema_privilege('anon', 'public', 'CREATE')
    OR has_schema_privilege('authenticated', 'public', 'CREATE')
  THEN RAISE EXCEPTION 'Client role can create objects in public'; END IF;

  IF NOT has_table_privilege('service_role', 'public.neighborhood_admins', 'UPDATE')
  THEN RAISE EXCEPTION 'Server-side invitation route lacks service_role UPDATE'; END IF;
END;
$checks$;

-- Verify the default ACL of a newly created function, not just current functions.
CREATE FUNCTION public._staging_acl_probe() RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$;
DO $default_acl$
BEGIN
  IF has_function_privilege('anon', 'public._staging_acl_probe()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public._staging_acl_probe()', 'EXECUTE')
  THEN RAISE EXCEPTION 'New public function would be executable by a client role'; END IF;
END;
$default_acl$;

ROLLBACK;
