const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jssoyjwjqykcuovdydtz.supabase.co';
const supabaseKey = 'sb_publishable_RztM_8dNswdYyCo_3ZTFyA_94mkh6xz';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Fetching neighborhoods Stripe status...');
  const { data, error } = await supabase
    .from('neighborhoods')
    .select('id, name, stripe_account_id, status');
    
  if (error) {
    console.error('Error fetching neighborhoods:', error);
    return;
  }
  
  console.log('--- Neighborhoods Stripe Connection List ---');
  data.forEach(town => {
    console.log(`ID: ${town.id} | Name: ${town.name} | Stripe ID: ${town.stripe_account_id || 'Not Connected'} | Status: ${town.status}`);
  });
  console.log('--------------------------------------------');
}

check();
