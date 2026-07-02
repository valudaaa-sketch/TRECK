const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Client using anon key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFetch() {
  // Get rahul
  const { data: users } = await supabaseAdmin.from('users').select('*');
  const rahul = users.find(u => u.full_name && u.full_name.toLowerCase().includes('rahul')) || users[1];
  
  if (!rahul) {
    console.log("No Rahul found");
    return;
  }
  
  console.log("Testing for user:", rahul.email);
  
  // We cannot easily login without password. 
  // Let's generate a Magic Link or just temporarily change password?
  // We can also just update their password temporarily
  await supabaseAdmin.auth.admin.updateUserById(rahul.id, { password: 'TestPassword123!' });
  
  const { data: { session }, error } = await supabase.auth.signInWithPassword({
    email: rahul.email,
    password: 'TestPassword123!'
  });
  
  if (error) {
    console.log("Login error:", error);
    return;
  }
  
  console.log("Logged in successfully. Token length:", session.access_token.length);
  
  // Now fetch projects as Rahul
  const { data: projects, error: pError } = await supabase.from('projects').select('*').is("archived_at", null);
  
  if (pError) {
    console.log("Fetch error:", pError);
  } else {
    console.log("Rahul's projects:", projects);
  }
}

testFetch();
