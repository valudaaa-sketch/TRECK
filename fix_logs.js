require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const isUUID = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

async function run() {
  console.log("Fetching activity logs...");
  const { data: logs, error } = await supabase.from('activity_logs').select('*').in('action', ['status_changed', 'assigned', 'assignee_changed']);
  if (error) { console.error(error); return; }

  // Fetch all statuses
  const { data: statuses } = await supabase.from('task_statuses').select('*');
  const statusMap = {};
  if (statuses) statuses.forEach(s => statusMap[s.id] = s.name);

  // Fetch all users
  const { data: users } = await supabase.from('users').select('*');
  const userMap = {};
  if (users) users.forEach(u => userMap[u.id] = u.full_name);

  let fixed = 0;
  for (const log of logs) {
    let changed = false;
    let prev = { ...log.previous_value };
    let next = { ...log.new_value };

    if (log.action === 'status_changed') {
      if (prev.status && isUUID(prev.status)) {
        prev.status = statusMap[prev.status] || prev.status;
        changed = true;
      }
      if (next.status && isUUID(next.status)) {
        next.status = statusMap[next.status] || next.status;
        changed = true;
      }
    }

    if (log.action === 'assigned' || log.action === 'assignee_changed') {
      if (prev.assignee && isUUID(prev.assignee)) {
        prev.assignee = userMap[prev.assignee] || prev.assignee;
        changed = true;
      }
      if (next.assignee && isUUID(next.assignee)) {
        next.assignee = userMap[next.assignee] || next.assignee;
        changed = true;
      }
      if (prev.current_owner && isUUID(prev.current_owner)) {
        prev.current_owner = userMap[prev.current_owner] || prev.current_owner;
        changed = true;
      }
      if (next.current_owner && isUUID(next.current_owner)) {
        next.current_owner = userMap[next.current_owner] || next.current_owner;
        changed = true;
      }
    }

    if (changed) {
      console.log(`Fixing log ${log.id}`);
      await supabase.from('activity_logs').update({
        previous_value: prev,
        new_value: next
      }).eq('id', log.id);
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} logs!`);
}

run();
