const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Wait, Supabase JS admin client DOES NOT have a way to run arbitrary SQL unless an RPC like 'exec_sql' exists!
  // And we already found out 'exec_sql' does NOT exist!
  // BUT I can just INSERT Rahul into project_members!
  
  const { data: users } = await supabaseAdmin.from('users').select('*');
  const rahul = users.find(u => u.full_name && u.full_name.toLowerCase().includes('rahul')) || users[1];
  
  const { data: projects } = await supabaseAdmin.from('projects').select('*').eq('name', 'School ERP 1');
  if (projects && projects.length > 0 && rahul) {
    const { error } = await supabaseAdmin.from('project_members').insert({
      project_id: projects[0].id,
      user_id: rahul.id
    });
    console.log("Insert result:", error || "Success");
  }
}

run();
