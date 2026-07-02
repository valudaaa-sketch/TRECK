const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'password'
  });
  
  // if login fails, try to login as harshith@user.com
  if (error) {
     const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
       email: 'harshith@user.com',
       password: 'password'
     });
     if (e2) {
       console.log("Both logins failed");
       return;
     }
  }

  const { data: projects, error: pErr } = await supabase.from('projects').select('*');
  if (pErr) console.error("RLS Error:", pErr);
  else console.log("Projects:", projects);
}
test();
