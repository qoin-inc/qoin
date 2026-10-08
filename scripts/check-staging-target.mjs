import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [expectedRef, envPath = '.env.local'] = process.argv.slice(2);

if (!/^[a-z0-9]{10,30}$/.test(expectedRef || '')) {
  console.error('Usage: node scripts/check-staging-target.mjs <verified-staging-project-ref> [env-file]');
  process.exit(2);
}

let contents;
try {
  contents = readFileSync(resolve(envPath), 'utf8');
} catch {
  console.error('Environment file could not be read.');
  process.exit(2);
}

const values = new Map();
for (const line of contents.split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  values.set(match[1], value);
}

const errors = [];
if (values.get('STAGING_SUPABASE_PROJECT_REF') !== expectedRef) {
  errors.push('STAGING_SUPABASE_PROJECT_REF is missing or differs from the verified staging Project Ref.');
}

try {
  const url = new URL(values.get('NEXT_PUBLIC_SUPABASE_URL') || '');
  if (url.href !== `https://${expectedRef}.supabase.co/`) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL does not point exactly to the verified staging project.');
  }
} catch {
  errors.push('NEXT_PUBLIC_SUPABASE_URL is missing or invalid.');
}

if (!values.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
  errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.');
}

if (errors.length) {
  console.error('Staging target check FAILED. No network request was made.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Staging Supabase target check passed. No network request was made.');
