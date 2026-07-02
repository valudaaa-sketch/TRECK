const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPolicies() {
  // Let's create an RPC to fetch the actual policy definition
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      create or replace function get_projects_policies()
      returns table (policyname text, cmd text, qual text, with_check text)
      language sql
      security definer
      as $$
        select policyname, cmd, qual, with_check from pg_policies where tablename = 'projects';
      $$;
    `
  });
  
  if (error) {
    console.log("Could not create RPC, maybe exec_sql doesn't exist:", error);
    // Let's just create the RPC using the REST API? No, we can't create RPC without SQL.
  }
  
  const { data: policies, error: pError } = await supabaseAdmin.rpc('get_projects_policies');
  console.log("Policies for projects:", policies, pError);
}

checkPolicies();
