# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realtime.spec.ts >> Realtime Synchronization >> Two isolated users sync realtime actions
- Location: tests\realtime.spec.ts:47:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:3000/"
Received: "http://localhost:3000/login"
Timeout:  5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "http://localhost:3000/login"

```

```yaml
- link "TRECK":
  - /url: /
- text: Sign in to TRECK Enter your email and password to access your account Email
- textbox "Email":
  - /placeholder: m@example.com
  - text: pw_admin_1782918274987@real.com
- text: Password
- link "Forgot password?":
  - /url: /forgot-password
- textbox "Password": password123
- button "Sign In"
- text: Don't have an account?
- link "Sign up":
  - /url: /register
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { createClient } from '@supabase/supabase-js';
  3   | 
  4   | // Setup Supabase admin client to bypass email validation constraints
  5   | const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  6   | const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  7   | const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  8   | 
  9   | test.describe('Realtime Synchronization', () => {
  10  |   test.describe.configure({ mode: 'serial' });
  11  | 
  12  |   let projectId: string;
  13  |   let userAEmail = `pw_admin_${Date.now()}@real.com`; // Dummy domain
  14  |   let userBEmail = `pw_member_${Date.now()}@real.com`;
  15  |   let userAId: string;
  16  |   let userBId: string;
  17  | 
  18  |   test.beforeAll(async () => {
  19  |     // 1. Create User A
  20  |     const { data: adminData } = await adminClient.auth.admin.createUser({
  21  |       email: userAEmail,
  22  |       password: 'password123',
  23  |       email_confirm: true,
  24  |       user_metadata: { full_name: 'QA Admin' }
  25  |     });
  26  |     userAId = adminData.user?.id || '';
  27  | 
  28  |     // 2. Create User B
  29  |     const { data: memberData } = await adminClient.auth.admin.createUser({
  30  |       email: userBEmail,
  31  |       password: 'password123',
  32  |       email_confirm: true,
  33  |       user_metadata: { full_name: 'QA Member' }
  34  |     });
  35  |     userBId = memberData.user?.id || '';
  36  | 
  37  |     // Wait for triggers to create public.users
  38  |     await new Promise(r => setTimeout(r, 2000));
  39  |   });
  40  | 
  41  |   test.afterAll(async () => {
  42  |     // Cleanup
  43  |     if (userAId) await adminClient.auth.admin.deleteUser(userAId);
  44  |     if (userBId) await adminClient.auth.admin.deleteUser(userBId);
  45  |   });
  46  | 
  47  |   test('Two isolated users sync realtime actions', async ({ browser }) => {
  48  |     const userAContext = await browser.newContext();
  49  |     const userBContext = await browser.newContext();
  50  | 
  51  |     const pageA = await userAContext.newPage();
  52  |     const pageB = await userBContext.newPage();
  53  | 
  54  |     // 1. User A (Admin) logs in
  55  |     await pageA.goto('/login');
  56  |     await pageA.fill('input#email', userAEmail);
  57  |     await pageA.fill('input#password', 'password123');
  58  |     await pageA.click('button:has-text("Sign In")');
> 59  |     await expect(pageA).toHaveURL('/'); // Wait for dashboard
      |                         ^ Error: expect(page).toHaveURL(expected) failed
  60  | 
  61  |     // 2. User B (Member) logs in
  62  |     await pageB.goto('/login');
  63  |     await pageB.fill('input#email', userBEmail);
  64  |     await pageB.fill('input#password', 'password123');
  65  |     await pageB.click('button:has-text("Sign In")');
  66  |     await expect(pageB).toHaveURL('/');
  67  | 
  68  |     // 3. User A creates a new Project
  69  |     await pageA.click('button:has-text("New Project")');
  70  |     await pageA.fill('input[name="name"]', 'Realtime E2E Test');
  71  |     await pageA.click('button:has-text("Create Project")');
  72  |     
  73  |     // Extract project URL
  74  |     await expect(pageA).toHaveURL(/\/projects\/.+/);
  75  |     const projectUrl = pageA.url();
  76  |     projectId = projectUrl.split('/projects/')[1].split('/')[0];
  77  | 
  78  |     // 4. We use admin client to inject User B as a member instantly to bypass UI flakiness
  79  |     await adminClient.from('project_members').insert({
  80  |       project_id: projectId,
  81  |       user_id: userBId,
  82  |       role: 'Member'
  83  |     });
  84  | 
  85  |     // 5. User B navigates to the project
  86  |     await pageB.goto(`/projects/${projectId}/board`);
  87  |     
  88  |     // 6. User A creates a task on the Board
  89  |     await pageA.goto(`/projects/${projectId}/board`);
  90  |     
  91  |     // Playwright clicks "Add Task" in the first column
  92  |     await pageA.locator('button:has-text("Add Task")').first().click();
  93  |     await pageA.fill('input[placeholder="What needs to be done?"]', 'Sync Test Task');
  94  |     await pageA.keyboard.press('Enter');
  95  | 
  96  |     // 7. Verify User B sees the task INSTANTLY without refreshing!
  97  |     await expect(pageB.locator('text=Sync Test Task')).toBeVisible({ timeout: 5000 });
  98  | 
  99  |     await userAContext.close();
  100 |     await userBContext.close();
  101 |   });
  102 | });
  103 | 
```