const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // 1. Create a dummy user
  const email = 'testrls_abc123@test.com';
  const password = 'Password123!';
  
  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (createErr) {
    console.error("Create user failed:", createErr);
    return;
  }
  
  console.log("Created dummy user:", newUser.user.id);
  
  // 2. Assign the dummy user to a project (so they should see it)
  const projectId = 'ea6dd0c3-9ca1-4245-94d2-0835a4804bbb'; // School ERP 1
  await supabaseAdmin.from('project_members').insert({
    project_id: projectId,
    user_id: newUser.user.id
  });
  
  // 3. Login as dummy user
  const { data: sessionData, error: loginErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (loginErr) {
    console.error("Login failed:", loginErr);
    return;
  }
  
  // 4. Query projects as dummy user
  const { data: projects, error: pErr } = await supabase.from('projects').select('*');
  console.log("Projects seen by member:", projects);
  if (pErr) console.error("RLS Error:", pErr);
  
  // 5. Cleanup
  await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
  console.log("Cleaned up dummy user");
}

test();
