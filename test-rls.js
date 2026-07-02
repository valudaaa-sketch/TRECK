const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users } = await supabaseAdmin.from('users').select('*');
  const rahul = users.find(u => u.full_name && u.full_name.toLowerCase().includes('rahul')) || users[1];
  
  if (!rahul) {
    console.log("Rahul not found");
    return;
  }
  
  console.log("Checking RLS for user:", rahul.id, rahul.role);
  
  // Call a function or try to fetch using RLS bypass if possible? No, we want to test RLS.
  // The only way to test RLS natively from JS without a token is to call a Postgres function that sets role.
  // Let's just create a quick RPC to test this.
  
  const createRpc = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      create or replace function test_rls_projects(user_uuid uuid)
      returns setof projects
      language plpgsql
      security definer
      as $$
      begin
        set local role authenticated;
        set local request.jwt.claim.sub = user_uuid::text;
        set local request.jwt.claim.role = 'authenticated';
        return query select * from projects;
      end;
      $$;
    `
  });
  
  // Actually, we can just execute that in a normal SQL command using psql, but we had issues with psql.
  // Let's create an artifact to run the SQL via psql using a cleaner script.
}
check();
