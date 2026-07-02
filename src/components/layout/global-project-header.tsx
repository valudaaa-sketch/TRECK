import { createClient } from "@/utils/supabase/server";
import { ProjectSearchDialog } from "@/components/search/project-search-dialog";
import { ManageProjectTeamDialog } from "@/components/admin/manage-project-team-dialog";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { MobileSidebarToggle } from "@/components/layout/mobile-sidebar-toggle";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { Suspense } from "react";

export async function GlobalProjectHeader({ projectId, currentTab }: { projectId: string, currentTab?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  if (!projectId) {
    return (
      <div className="w-full relative z-10 flex flex-col shrink-0">
        <div className="flex items-center px-4 sm:px-8 py-3 sm:pt-5 sm:pb-1 shrink-0 bg-background sm:bg-transparent border-b border-border sm:border-none z-40">
          <MobileSidebarToggle />
        </div>
      </div>
    );
  }

  // Fetch everything needed for the header in parallel to prevent waterfalls
  const [
    { data: profile },
    { data: allProjects },
    { data: statuses },
    { data: activeProject },
    { data: projectMembers },
    { data: admins }
  ] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("projects").select("id, name, logo_url").is("archived_at", null).order("name", { ascending: true }),
    supabase.from("task_statuses").select("id, name, color").order("created_at", { ascending: true }),
    supabase.from("projects").select("*, users(full_name)").eq("id", projectId).is("archived_at", null).single(),
    supabase.from("project_members").select("users(id, full_name, avatar_url, role)").eq("project_id", projectId),
    supabase.from("users").select("id, full_name, avatar_url, role").eq("role", "Admin")
  ]);

  const userRole = profile?.role || "Member";
  
  // Combine members and admins for the task dialog
  
  const userMap = new Map();
  if (projectMembers) {
    projectMembers.forEach((pm: any) => {
      if (pm.users) userMap.set(pm.users.id, pm.users);
    });
  }
  if (admins) {
    admins.forEach((a: any) => userMap.set(a.id, a));
  }
  
  const projectUsers = Array.from(userMap.values());

  return (
    <div className="w-full relative z-10 flex flex-col shrink-0">
      {/* Top Header Row */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 sm:pt-5 sm:pb-1 shrink-0 bg-background sm:bg-transparent border-b border-border sm:border-none z-40">
        
        {/* Left Side: Hamburger (Mobile) + Project Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0 sm:flex-none">
          <MobileSidebarToggle />
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
             <div className="hidden sm:flex items-center justify-center w-6 h-6 rounded bg-[#1a1b3b] text-[#858ce9] text-sm font-bold shrink-0">
                #
             </div>
             <h1 className="text-[16px] sm:text-[15px] font-semibold text-white tracking-wide truncate">
               {activeProject?.name || "No Project Selected"}
             </h1>
          </div>
        </div>
        
        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {activeProject && (
            <ProjectSearchDialog projectId={activeProject.id} />
          )}
          
          {activeProject && userRole === 'Admin' && (
            <div className="hidden sm:flex items-center gap-2">
              <ManageProjectTeamDialog project={activeProject} users={projectUsers} />
              <EditProjectDialog project={activeProject} userRole={userRole} triggerType="manage" />
            </div>
          )}
          
          {activeProject && (
            <CreateTaskDialog
              statuses={statuses || []}
              projects={allProjects || []}
              users={projectUsers}
              projectId={activeProject.id}
            />
          )}
        </div>
      </div>

      {/* Tabs Row */}
      {activeProject && (
        <div className="sticky top-0 z-40 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80 h-12 flex items-center justify-between border-b border-border px-4 sm:px-8 shrink-0">
          <Suspense fallback={<div />}>
            <DashboardTabs currentTab={currentTab || ""} projectId={activeProject.id} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
