const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: users, error: errUsers } = await supabase.from('users').select('*');
  console.log("USERS IN PUBLIC.USERS:");
  users?.forEach(u => console.log(`- ${u.email} | ID: ${u.id} | Role: ${u.role}`));

  const { data: projects, error: errProj } = await supabase.from('projects').select('*');
  console.log("\nPROJECTS:");
  projects?.forEach(p => console.log(`- ${p.name} | Created By: ${p.created_by}`));

  const { data: members, error: errMem } = await supabase.from('project_members').select('*');
  console.log("\nPROJECT MEMBERS:");
  members?.forEach(m => console.log(`- Project: ${m.project_id} | User: ${m.user_id}`));

  // Check auth.users to see if the IDs match
  const { data: authUsers, error: errAuth } = await supabase.auth.admin.listUsers();
  console.log("\nAUTH.USERS (from admin API):");
  authUsers?.users?.forEach(u => console.log(`- ${u.email} | ID: ${u.id}`));
}

checkData();
