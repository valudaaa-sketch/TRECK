const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testUserAccess() {
  // Find rahul
  const { data: users } = await supabaseAdmin.from('users').select('*');
  const rahul = users.find(u => u.full_name && u.full_name.toLowerCase().includes('rahul')) || users[1];
  
  if (!rahul) {
    console.log("No other users found");
    return;
  }
  
  console.log("Testing as user:", rahul.full_name, rahul.email, rahul.id);
  
  // Create a client with Rahul's identity (mocking authenticated role)
  // To do this properly without password, we can generate a custom token or just use RLS bypass query.
  // Actually, we can just use the admin client but execute query with `auth.uid() = ...`
  // Wait, let's just query what the user is seeing.
  // A simpler way: Supabase v2 lets you set the active user context for the client using `auth.setSession` (if we had the token).
  // But we can check RLS by just reading the policy.
  
  console.log("Checking RLS policy...");
  const { data: policies } = await supabaseAdmin.rpc('get_policies');
  console.log(policies);
}

testUserAccess();
