const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jssoyjwjqykcuovdydtz.supabase.co';
const supabaseKey = 'sb_publishable_RztM_8dNswdYyCo_3ZTFyA_94mkh6xz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: towns, error: tErr } = await supabase
    .from('neighborhoods')
    .select('id, name');
  
  if (tErr) {
    console.error('Town Error:', tErr);
    return;
  }
  
  console.log('Towns:', towns);
  
  const nanoka = towns.find(t => t.name.includes('七日町'));
  if (!nanoka) {
    console.log('七日町が見つかりません');
    return;
  }
  
  console.log('Found town:', nanoka);
  
  const { data: rosters, error: rErr } = await supabase
    .from('resident_rosters')
    .select('id, neighborhood_id, full_name, user_auth_id, line_user_id, withdrawal_status, created_at')
    .eq('neighborhood_id', nanoka.id);
    
  if (rErr) {
    console.error('Roster Error:', rErr);
    return;
  }
  
  console.log(`Rosters in ${nanoka.name} (Count: ${rosters.length}):`);
  rosters.forEach(r => {
    console.log(`- ID: ${r.id}, Name: ${r.full_name}, Status: ${r.withdrawal_status}, AuthID: ${r.user_auth_id}, LineID: ${r.line_user_id}, CreatedAt: ${r.created_at}`);
  });
}

check();
