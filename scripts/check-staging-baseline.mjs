import assert from 'node:assert/strict';
import fs from 'node:fs';

const file = process.argv[2] || 'supabase/staging-baseline/20261007_schema_DENY_BY_DEFAULT.sql';
const sql = fs.readFileSync(file, 'utf8');
const count = (pattern) => [...sql.matchAll(pattern)].length;

assert.equal(count(/^CREATE TABLE IF NOT EXISTS /gm), 45, 'table count changed');
assert.equal(count(/^CREATE OR REPLACE FUNCTION /gm), 31, 'function count changed');
assert.equal(count(/^ALTER TABLE .* ENABLE ROW LEVEL SECURITY;/gm), 45, 'all tables need RLS');
assert.equal(count(/^CREATE POLICY /gm), 0, 'unreviewed policies must be absent');
assert.equal(count(/^GRANT .* TO (?:"?anon"?|"?authenticated"?)/gm), 1, 'only schema USAGE may reach client roles');
assert.equal(count(/^REVOKE ALL ON ALL (?:TABLES|SEQUENCES|FUNCTIONS) IN SCHEMA public FROM PUBLIC, anon, authenticated;/gm), 3);
assert.equal(count(/^ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON (?:TABLES|SEQUENCES|FUNCTIONS) FROM PUBLIC, anon, authenticated;/gm), 3);
assert.doesNotMatch(sql, /staging-admin@example\.invalid|auth\.jwt\(\)\s*->>\s*'email'/);
assert.doesNotMatch(sql, /DELETE FROM auth\.users/);
assert.match(sql, /CREATE OR REPLACE FUNCTION "public"\."ensure_system_admin_for_neighborhood"[\s\S]*?AS \$\$ BEGIN RETURN NEW; END; \$\$;/);
assert.match(sql, /CREATE OR REPLACE FUNCTION "public"\."handle_delete_auth_user"[\s\S]*?AS \$\$ BEGIN RETURN OLD; END; \$\$;/);
assert.ok(sql.trimEnd().endsWith('COMMIT;'), 'baseline must close the transaction');
assert.match(sql, /BEGIN;\s*-- Refuse to modify[\s\S]*?DO \$empty_staging_guard\$[\s\S]*?FROM auth\.users[\s\S]*?\$empty_staging_guard\$;/);

console.log('Static baseline checks passed: 45 RLS tables, 31 functions, zero inherited policies, client access denied.');
