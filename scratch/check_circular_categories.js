const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Env variables not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('circulars')
    .select('id, title, category, deleted_at, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  console.log('--- 最近の回覧板データ ---');
  data.forEach(c => {
    console.log(`ID: ${c.id} | タイトル: ${c.title} | カテゴリ: ${c.category} | 作成日時: ${c.created_at}`);
  });
}

check();
