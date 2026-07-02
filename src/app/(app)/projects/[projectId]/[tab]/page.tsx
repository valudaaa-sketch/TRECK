import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { DashboardTasks } from "@/components/dashboard/dashboard-tasks";
import { FilesAndDocsTab } from "@/components/projects/files-and-docs-tab";
import { ProjectActivity } from "@/components/projects/project-activity";

export default async function ProjectTabPage(props: { params: Promise<{ projectId: string, tab: string }> }) {
  const params = await props.params;
  const projectId = params.projectId;
  const tab = params.tab;
  
  if (!['details', 'tasks', 'activity'].includes(tab)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const queries: any[] = [
    supabase.from("users").select("role").eq("id", user!.id).single(),
    supabase.from("projects").select("*, users(full_name)").eq("id", projectId).is("archived_at", null).single(),
  ];

  if (tab === 'tasks') {
    queries.push(
      supabase.from("tasks").select("*, task_statuses(id, name, color), projects(name), files(id), owner:users!tasks_current_owner_fkey(full_name, avatar_url)").eq("project_id", projectId).is("archived_at", null).order("updated_at", { ascending: false }).limit(15),
      supabase.from("tasks").select("*, task_statuses(id, name, color), projects(name), files(id)").eq("project_id", projectId).eq("current_owner", user!.id).is("archived_at", null).order("updated_at", { ascending: false }).limit(15),
      supabase.from("task_statuses").select("id, name").order("created_at", { ascending: true })
    );
  } else if (tab === 'activity') {
    queries.push(
      supabase.from("activity_logs").select("*, users(full_name, avatar_url)").eq("entity_id", projectId).order("created_at", { ascending: false }).limit(50)
    );
  }

  const results = await Promise.all(queries);
  
  const { data: profile } = results[0];
  const { data: activeProject } = results[1];

  if (!activeProject) {
    notFound();
  }

  let activityLogs: any[] = [];
  let allTasks: any[] = [];
  let myTasks: any[] = [];
  let statuses: any[] = [];
  
  if (tab === 'tasks') {
    allTasks = results[2]?.data || [];
    myTasks = results[3]?.data || [];
    statuses = results[4]?.data || [];
  } else if (tab === 'activity') {
    activityLogs = results[2]?.data || [];
  }

  const userRole = profile?.role || "Member";

  return (
    <div className="relative flex flex-col h-full w-full text-white bg-black">
      <div className="w-full relative z-10 flex-1 flex flex-col">
        {/* Main Area Content */}
        <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-8 py-6">
          {tab === 'tasks' && (
            <DashboardTasks 
              allTasks={allTasks || []} 
              myTasks={myTasks || []} 
              statuses={statuses || []} 
            />
          )}
          {tab === 'details' && (
            <FilesAndDocsTab project={activeProject} userRole={userRole} />
          )}
          {tab === 'activity' && (
            <div className="pt-2">
              <ProjectActivity activity={activityLogs} projectId={activeProject.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
