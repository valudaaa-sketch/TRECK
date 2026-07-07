import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskChecklist } from "@/components/tasks/task-checklist";
import { FileList } from "@/components/files/file-list";
import { FileUploader } from "@/components/files/file-uploader";
import { TaskDetailForm } from "@/components/tasks/task-detail-form";
import { ClientOnly } from "@/components/client-only";
import { Loader2, ChevronLeft } from "lucide-react";

export default async function TaskDetailPage(props: { params: Promise<{ projectId: string, taskId: string }> }) {
  const params = await props.params;
  const taskId = params.taskId;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Run all independent queries in parallel to eliminate waterfalls
  const [
    { data: task },
    { data: checklists },
    { data: comments },
    { data: activity },
    { data: statuses },
    { data: allUsers },
    { data: profile },
    { data: allProjects },
    { data: projectMembersData }
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(`
        *,
        task_statuses(id, name, color),
        projects!inner(id, name),
        creator:users!tasks_created_by_fkey(id, full_name, avatar_url),
        owner:users!tasks_current_owner_fkey(id, full_name, avatar_url)
      `)
      .eq("id", taskId)
      .is("archived_at", null)
      .is("projects.archived_at", null)
      .single(),
    supabase.from("task_checklists").select("*").eq("task_id", taskId).order("created_at"),
    supabase.from("comments").select("*, users(id, full_name, avatar_url)").eq("task_id", taskId).is("archived_at", null).order("created_at"),
    supabase.from("activity_logs").select("*, users(full_name, avatar_url)").eq("entity_id", taskId).order("created_at", { ascending: false }).limit(50),
    supabase.from("task_statuses").select("id, name, color").order("created_at"),
    supabase.from("users").select("id, full_name, avatar_url, role").eq("is_active", true),
    supabase.from("users").select("role, full_name").eq("id", user!.id).single(),
    supabase.from("projects").select("*, users(full_name)").is("archived_at", null).order("name", { ascending: true }),
    supabase.from("project_members").select("user_id").eq("project_id", params.projectId) // Use projectId from URL to parallelize
  ]);

  if (!task) notFound();

  const userRole = profile?.role || "Member";
  const activeProject = allProjects?.find(p => p.id === task.project_id) || null;
  
  let teamMembers = allUsers || [];
  if (projectMembersData && allUsers) {
    const memberIds = new Set(projectMembersData.map(m => m.user_id));
    if (activeProject) memberIds.add(activeProject.created_by);
    teamMembers = allUsers.filter(u => u.role === 'Admin' || memberIds.has(u.id));
  }

  return (
    <div className="relative flex flex-col h-full w-full text-white bg-black">
      <div className="w-full relative z-10 flex-1 flex flex-col">






        {/* Task View Main Area */}
        <div className="flex-1 flex flex-col md:items-center md:justify-start p-0 md:pt-4 md:px-8 md:pb-6 overflow-hidden">
          <div className="w-full max-w-[1200px] h-full md:max-h-[850px] bg-background rounded-none md:rounded-xl border-none md:border border-border flex flex-col overflow-hidden md:shadow-2xl relative z-10 shrink-0">
        <TaskDetailForm 
          task={task} 
          statuses={statuses || []} 
          teamMembers={teamMembers || []} 
          currentUser={user} 
          leftBottomContent={
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  CHECKLIST
                </label>
                <TaskChecklist taskId={taskId} initialItems={checklists || []} />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    ATTACHMENTS
                  </label>
                  <ClientOnly fallback={<div className="h-8 w-24 bg-white/5 animate-pulse rounded-md"></div>}>
                    <FileUploader taskId={taskId} projectId={task.project_id} />
                  </ClientOnly>
                </div>
                <ClientOnly fallback={<div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-white/30" /></div>}>
                  <FileList taskId={taskId} />
                </ClientOnly>
              </div>
            </section>
          }
          rightContent={
            <TaskComments
              taskId={taskId}
              comments={comments || []}
              activity={activity || []}
              currentUser={user!}
              teamMembers={teamMembers || []}
            />
          }
        />
      </div>
        </div>
      </div>
    </div>
  );
}
