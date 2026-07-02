const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkProjects() {
  const { data, error } = await supabase.from('projects').select('*');
  console.log('Projects:', data);
  if (error) console.error('Error:', error);
}

checkProjects();
