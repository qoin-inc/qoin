const url = 'https://jssoyjwjqykcuovdydtz.supabase.co/rest/v1';
const key = 'sb_publishable_RztM_8dNswdYyCo_3ZTFyA_94mkh6xz';

async function check() {
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };
  
  // get neighborhoods
  const res = await fetch(`${url}/neighborhood_admins?select=*,neighborhood:neighborhoods(*)`, { headers });
  const data = await res.json();
  console.log('Admins and their towns:', JSON.stringify(data, null, 2));
}
check();
