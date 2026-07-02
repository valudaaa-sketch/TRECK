-- TRECK Database Schema

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Enum types
create type project_status as enum ('Active', 'On Hold', 'Completed', 'Archived');
create type task_priority as enum ('Critical', 'High', 'Medium', 'Low');
create type user_role as enum ('Admin', 'Member');

-- Table: users (extends Supabase Auth users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  role user_role default 'Member'::user_role not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: projects
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  status project_status default 'Active'::project_status not null,
  tags text[] default '{}'::text[],
  created_by uuid references public.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- Table: task_statuses (Admins can create more)
create table public.task_statuses (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  description text,
  color text default '#6b7280',
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default task statuses
insert into public.task_statuses (name, color, is_default) values 
('Open', '#3b82f6', true),
('Queued', '#6366f1', true),
('In Progress', '#f59e0b', true),
('Need Info', '#8b5cf6', true),
('Blocked', '#ef4444', true),
('Review', '#ec4899', true),
('Resolved', '#10b981', true),
('Closed', '#6b7280', true),
('Cancelled', '#9ca3af', true);

-- Table: tasks
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  priority task_priority default 'Medium'::task_priority not null,
  status_id uuid references public.task_statuses(id) not null,
  deadline timestamp with time zone,
  suggested_owner uuid references public.users(id),
  current_owner uuid references public.users(id),
  created_by uuid references public.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone,
  archived_at timestamp with time zone,
  status_metadata jsonb default '{}'::jsonb -- used for Blocked Reason, Need Info details, Resolution Note
);

-- Table: task_dependencies
create table public.task_dependencies (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  depends_on_task_id uuid references public.tasks(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(task_id, depends_on_task_id)
);

-- Table: task_checklists
create table public.task_checklists (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  item_text text not null,
  is_completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: comments
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.users(id) not null,
  content text not null,
  is_edited boolean default false not null,
  archived_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: files
create table public.files (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null,
  uploaded_by uuid references public.users(id) not null,
  archived_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (project_id is not null or task_id is not null)
);

-- Table: activity_logs
create table public.activity_logs (
  id uuid default uuid_generate_v4() primary key,
  entity_type text not null, -- 'task', 'project', 'comment', 'user', 'file'
  entity_id uuid not null,
  user_id uuid references public.users(id) not null,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: notifications
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null, -- 'assigned', 'mentioned', 'status_changed', 'dependency_resolved'
  message text not null,
  reference_id uuid not null, -- task_id usually
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: settings (Singleton)
create table public.settings (
  id integer primary key check (id = 1),
  org_name text default 'TRECK Organization',
  logo_url text,
  timezone text default 'UTC',
  date_format text default 'MM/DD/YYYY',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

insert into public.settings (id) values (1);

-- Function to handle new user registration and insert into public.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    case 
      -- Make the first user an Admin automatically
      when not exists (select 1 from public.users) then 'Admin'::user_role
      else 'Member'::user_role
    end
  );
  return new;
end;
$$;

-- Trigger for new user registration
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at triggers
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger update_users_updated_at before update on users for each row execute procedure update_updated_at_column();
create trigger update_projects_updated_at before update on projects for each row execute procedure update_updated_at_column();
create trigger update_tasks_updated_at before update on tasks for each row execute procedure update_updated_at_column();
create trigger update_task_checklists_updated_at before update on task_checklists for each row execute procedure update_updated_at_column();
create trigger update_comments_updated_at before update on comments for each row execute procedure update_updated_at_column();
create trigger update_settings_updated_at before update on settings for each row execute procedure update_updated_at_column();

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.task_statuses enable row level security;
alter table public.tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.task_checklists enable row level security;
alter table public.comments enable row level security;
alter table public.files enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;

-- RLS Policies (Simplified for internal teams: Authenticated users can read/write most things, admins have extra rights)

-- Users: Read all, update self, admin update all
create policy "Users can view all users" on public.users for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Admins can update any user" on public.users for update using (exists (select 1 from public.users where id = auth.uid() and role = 'Admin'));

-- Projects: Authenticated users can CRUD, but only Admins can physically delete or archive (soft delete logic handled in app usually)
create policy "Users can view all projects" on public.projects for select using (auth.role() = 'authenticated');
create policy "Users can create projects" on public.projects for insert with check (auth.role() = 'authenticated');
create policy "Users can update projects" on public.projects for update using (auth.role() = 'authenticated');

-- Task Statuses: View all, Admin create/update
create policy "Users can view statuses" on public.task_statuses for select using (auth.role() = 'authenticated');
create policy "Admins can manage statuses" on public.task_statuses for all using (exists (select 1 from public.users where id = auth.uid() and role = 'Admin'));

-- Tasks: Authenticated users can CRUD
create policy "Users can view all tasks" on public.tasks for select using (auth.role() = 'authenticated');
create policy "Users can create tasks" on public.tasks for insert with check (auth.role() = 'authenticated');
create policy "Users can update tasks" on public.tasks for update using (auth.role() = 'authenticated');

-- Task Dependencies/Checklists: Authenticated users can CRUD
create policy "Users can view dependencies" on public.task_dependencies for select using (auth.role() = 'authenticated');
create policy "Users can manage dependencies" on public.task_dependencies for all using (auth.role() = 'authenticated');
create policy "Users can view checklists" on public.task_checklists for select using (auth.role() = 'authenticated');
create policy "Users can manage checklists" on public.task_checklists for all using (auth.role() = 'authenticated');

-- Comments: Read all, Create, Update own
create policy "Users can view comments" on public.comments for select using (auth.role() = 'authenticated');
create policy "Users can create comments" on public.comments for insert with check (auth.role() = 'authenticated');
create policy "Users can update own comments" on public.comments for update using (auth.uid() = user_id);

-- Files: Authenticated users can CRUD
create policy "Users can view files" on public.files for select using (auth.role() = 'authenticated');
create policy "Users can create files" on public.files for insert with check (auth.role() = 'authenticated');
create policy "Users can update files" on public.files for update using (auth.role() = 'authenticated');

-- Activity Logs: Read all, Insert system-wide (via triggers/RPC mostly, but allow insert for simplicity)
create policy "Users can view logs" on public.activity_logs for select using (auth.role() = 'authenticated');
create policy "Users can insert logs" on public.activity_logs for insert with check (auth.role() = 'authenticated');

-- Notifications: Read own, Update own
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Settings: Read all, Admin update
create policy "Users can view settings" on public.settings for select using (auth.role() = 'authenticated');
create policy "Admins can update settings" on public.settings for update using (exists (select 1 from public.users where id = auth.uid() and role = 'Admin'));

-- Enable realtime for critical tables
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;
