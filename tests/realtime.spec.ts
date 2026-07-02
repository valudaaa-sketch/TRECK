import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase admin client to bypass email validation constraints
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

test.describe('Realtime Synchronization', () => {
  test.describe.configure({ mode: 'serial' });

  let projectId: string;
  let userAEmail = `pw_admin_${Date.now()}@real.com`; // Dummy domain
  let userBEmail = `pw_member_${Date.now()}@real.com`;
  let userAId: string;
  let userBId: string;

  test.beforeAll(async () => {
    // 1. Create User A
    const { data: adminData, error: errA } = await adminClient.auth.admin.createUser({
      email: userAEmail,
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'QA Admin' }
    });
    if (errA) throw new Error(`User A creation failed: ${errA.message}`);
    userAId = adminData.user?.id || '';

    // 2. Create User B
    const { data: memberData, error: errB } = await adminClient.auth.admin.createUser({
      email: userBEmail,
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'QA Member' }
    });
    if (errB) throw new Error(`User B creation failed: ${errB.message}`);
    userBId = memberData.user?.id || '';

    // Wait for triggers to create public.users
    await new Promise(r => setTimeout(r, 2000));
  });

  test.afterAll(async () => {
    // Cleanup
    if (userAId) await adminClient.auth.admin.deleteUser(userAId);
    if (userBId) await adminClient.auth.admin.deleteUser(userBId);
  });

  test('Two isolated users sync realtime actions', async ({ browser }) => {
    const userAContext = await browser.newContext();
    const userBContext = await browser.newContext();

    const pageA = await userAContext.newPage();
    const pageB = await userBContext.newPage();

    // 1. User A (Admin) logs in
    await pageA.goto('/login');
    await pageA.fill('input#email', userAEmail);
    await pageA.fill('input#password', 'password123');
    await pageA.click('button:has-text("Sign In")');
    await expect(pageA).toHaveURL('/'); // Wait for dashboard

    // 2. User B (Member) logs in
    await pageB.goto('/login');
    await pageB.fill('input#email', userBEmail);
    await pageB.fill('input#password', 'password123');
    await pageB.click('button:has-text("Sign In")');
    await expect(pageB).toHaveURL('/');

    // 3. User A creates a new Project
    await pageA.click('button:has-text("New Project")');
    await pageA.fill('input[name="name"]', 'Realtime E2E Test');
    await pageA.click('button:has-text("Create Project")');
    
    // Extract project URL
    await expect(pageA).toHaveURL(/\/projects\/.+/);
    const projectUrl = pageA.url();
    projectId = projectUrl.split('/projects/')[1].split('/')[0];

    // 4. We use admin client to inject User B as a member instantly to bypass UI flakiness
    await adminClient.from('project_members').insert({
      project_id: projectId,
      user_id: userBId,
      role: 'Member'
    });

    // 5. User B navigates to the project
    await pageB.goto(`/projects/${projectId}/board`);
    
    // 6. User A creates a task on the Board
    await pageA.goto(`/projects/${projectId}/board`);
    
    // Playwright clicks "Add Task" in the first column
    await pageA.locator('button:has-text("Add Task")').first().click();
    await pageA.fill('input[placeholder="What needs to be done?"]', 'Sync Test Task');
    await pageA.keyboard.press('Enter');

    // 7. Verify User B sees the task INSTANTLY without refreshing!
    await expect(pageB.locator('text=Sync Test Task')).toBeVisible({ timeout: 5000 });

    await userAContext.close();
    await userBContext.close();
  });
});
