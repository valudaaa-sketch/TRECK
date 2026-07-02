const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users } = await supabaseAdmin.from('users').select('*');
  const rahul = users.find(u => u.full_name && u.full_name.toLowerCase().includes('rahul')) || users[1];
  console.log("Rahul:", rahul);

  // Generate a JWT for Rahul using admin client
  // There is no direct "generate JWT" but we can temporarily update their password and login, or just use PostgREST JWT.
  // Actually, let's just inspect the projects table RLS using a direct postgres query through Supabase SQL endpoint if we can, or we can trust the schema file.
  
  // Look at the schema again:
  // create policy "Users can view all projects" on public.projects for select using (auth.role() = 'authenticated');
  
  // IS IT POSSIBLE the project's 'archived_at' is set?
  const { data: projects } = await supabaseAdmin.from('projects').select('*');
  console.log("All projects:", projects);
  
  // Let's check task assignments for Rahul
  const { data: tasks } = await supabaseAdmin.from('tasks').select('*').eq('current_owner', rahul.id);
  console.log("Tasks for Rahul:", tasks);
}
check();
