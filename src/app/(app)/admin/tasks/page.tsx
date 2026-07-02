import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, ArrowUpRight, ArrowUp, ArrowRight, ArrowDown, Shield } from "lucide-react";
import { AdminTaskFilters } from "@/components/admin/admin-task-filters";
import { getUserColor } from "@/lib/colors";

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  Critical: "text-foreground border-border/50 bg-transparent",
  High: "text-muted-foreground border-border/50 bg-transparent",
  Medium: "text-muted-foreground/70 border-border/50 bg-transparent",
  Low: "text-muted-foreground/50 border-border/50 bg-transparent",
};

const PRIORITY_ICONS: Record<string, typeof ArrowUp> = {
  Critical: ArrowUpRight,
  High: ArrowUp,
  Medium: ArrowRight,
  Low: ArrowDown,
};

export default async function AdminTasksPage(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const searchParams = await props.searchParams;
  const statusFilter = searchParams.status as string | undefined;
  const assigneeFilter = searchParams.assignee as string | undefined;
  const projectFilter = searchParams.project as string | undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "Admin") {
    redirect("/");
  }

  const [
    { data: statuses },
    { data: users },
    { data: projects }
  ] = await Promise.all([
    supabase.from("task_statuses").select("id, name").order("created_at"),
    supabase.from("users").select("id, full_name").order("full_name"),
    supabase.from("projects").select("id, name").is("archived_at", null).order("name"),
  ]);

  let query = supabase
    .from("tasks")
    .select(`
      id, title, priority, deadline,
      project_id,
      projects!inner(name),
      task_statuses(name, color),
      owner:users!tasks_current_owner_fkey(id, full_name, avatar_url)
    `)
    .is("archived_at", null)
    .is("projects.archived_at", null);

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status_id", statusFilter);
  }
  if (assigneeFilter) {
    if (assigneeFilter === "unassigned") {
      query = query.is("current_owner", null);
    } else if (assigneeFilter !== "all") {
      query = query.eq("current_owner", assigneeFilter);
    }
  }
  if (projectFilter && projectFilter !== "all") {
    query = query.eq("project_id", projectFilter);
  }

  query = query.order("priority", { ascending: true }).order("deadline", { ascending: true, nullsFirst: false });

  const { data: tasks, error } = await query;

  if (error) {
    console.error("Error fetching tasks:", error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-8 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-sm text-muted-foreground">Company-wide task visibility and management.</p>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4">
        <AdminTaskFilters statuses={statuses || []} users={users || []} projects={projects || []} />
      </div>

      <div className="bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {!tasks || tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <Shield className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No tasks found matching the filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task, i) => {
                  const isOverdue = task.deadline && new Date(task.deadline) < new Date();
                  const PriorityIcon = PRIORITY_ICONS[task.priority] || ArrowRight;
                  return (
                    <tr key={task.id} className={`hover:bg-muted/20 transition-colors ${i % 2 === 1 ? 'bg-muted/5' : ''}`}>
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/projects/${task.project_id}/tasks/${task.id}`} className="hover:text-primary transition-colors">
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link href={`/projects/${task.project_id}/tasks`} 
                          className="hover:text-foreground transition-colors">
                          {(task.projects as any)?.name || 'Unknown Project'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: (task.task_statuses as any)?.color || "#cbd5e1", boxShadow: `0 0 6px ${(task.task_statuses as any)?.color || '#cbd5e1'}40` }}
                          />
                          <span className="text-sm">{(task.task_statuses as any)?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] font-semibold px-2 border inline-flex items-center gap-1 ${PRIORITY_BADGE_CLASSES[task.priority] || ""}`}>
                          <PriorityIcon className="h-3 w-3" />
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {task.owner ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={(task.owner as any).avatar_url || ""} />
                              <AvatarFallback 
                                className="text-[10px] text-white"
                                style={{ backgroundColor: getUserColor((task.owner as any).id || "") }}
                              >
                                {(task.owner as any).full_name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate max-w-[100px]">{(task.owner as any).full_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.deadline ? (
                          <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
                            {isOverdue && <AlertCircle className="h-3 w-3" />}
                            {new Date(task.deadline).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
