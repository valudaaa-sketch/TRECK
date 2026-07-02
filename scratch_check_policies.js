const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: policies } = await supabase.rpc('get_policies', {}) || await supabase.from('pg_policies').select('*').eq('schemaname', 'public');
  if (policies) {
    console.log("Policies:", policies);
  } else {
    // raw query via rest is blocked for pg_catalog, so we might not be able to get it easily unless we use postgres connection
    console.log("Could not fetch policies via REST");
  }
}
test();
