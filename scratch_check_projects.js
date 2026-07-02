const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjects() {
  const { data: projects, error } = await supabase.from('projects').select('*');
  console.log("Projects:", projects);
  if (error) console.error("Error projects:", error);

  const { data: members, error: memError } = await supabase.from('project_members').select('*');
  console.log("Members:", members);
  if (memError) console.error("Error members:", memError);
}

checkProjects();
