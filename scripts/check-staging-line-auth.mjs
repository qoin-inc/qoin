import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const local = Object.fromEntries(readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2]]));

const projectRef = 'zghcorbdtslrjtkkspfe';
const expectedUrl = `https://${projectRef}.supabase.co`;
if (local.NEXT_PUBLIC_SUPABASE_URL !== expectedUrl || !local.SUPABASE_SECRET_KEY) {
  throw new Error('検証用SupabaseのURLまたは秘密キーを確認できません。');
}

const admin = createClient(expectedUrl, local.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let checked = 0;
let managed = 0;
let legacy = 0;
for (let page = 1; page <= 100; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw new Error('検証用Authユーザーを確認できませんでした。');
  for (const user of data.users) {
    checked += 1;
    if (!user.email?.toLowerCase().endsWith('@line.eltown.local')) continue;
    if (user.app_metadata?.eltown_line_channel_id === '2009700969'
      && typeof user.app_metadata?.eltown_line_user_id === 'string') managed += 1;
    else legacy += 1;
  }
  if (data.users.length < 100) break;
  if (page === 100) throw new Error('Authユーザーの確認上限に達しました。');
}

console.log(`Staging Auth users checked: ${checked}; server-managed LINE users: ${managed}; legacy LINE users: ${legacy}`);
if (legacy > 0) {
  throw new Error('旧方式のLINE利用者が存在します。パスワードと既存セッションの移行が完了するまでLINEを有効化しないでください。');
}
