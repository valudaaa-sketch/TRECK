import { createClient } from "@/utils/supabase/server";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock } from "lucide-react";

export default async function SearchPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams.q || "";
  const supabase = await createClient();

  if (!query) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-8 w-full">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">Enter a search term to find projects and tasks.</p>
      </div>
    );
  }

  // Fetch projects matching query
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status")
    .ilike("name", `%${query}%`)
    .is("archived_at", null)
    .limit(10);

  // Fetch tasks matching query
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      id, title, priority, deadline, 
      task_statuses(name, color),
      projects!inner(id, name)
    `)
    .ilike("title", `%${query}%`)
    .is("archived_at", null)
    .is("projects.archived_at", null)
    .limit(20);

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-8 w-full">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
        <p className="text-muted-foreground">Showing results for "{query}"</p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Projects ({projects?.length || 0})</h2>
          {projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/tasks`}
                  className="block p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <Badge variant={project.status === "Active" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No projects found.</p>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Tasks ({tasks?.length || 0})</h2>
          {tasks && tasks.length > 0 ? (
            <div className="rounded-md border bg-card overflow-hidden">
              <div className="divide-y">
                {tasks.map((task) => {
                  const taskStatus = Array.isArray(task.task_statuses) ? task.task_statuses[0] : task.task_statuses;
                  const projectInfo = Array.isArray(task.projects) ? task.projects[0] : task.projects;
                  
                  return (
                  <div key={task.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/50 transition-colors gap-4">
                    <div className="flex items-start gap-3 overflow-hidden">
                      <div
                        className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: (taskStatus as any)?.color || "#cbd5e1" }}
                      />
                      <div className="flex flex-col min-w-0">
                        <Link href={`/projects/${(projectInfo as any)?.id}/tasks/${task.id}`} className="font-medium hover:underline truncate">
                          {task.title}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5">{task.priority}</Badge>
                          <span className="truncate">in {(projectInfo as any)?.name}</span>
                          {task.deadline && (
                            <span className="flex items-center gap-1 shrink-0">
                              <Clock className="h-3 w-3" />
                              {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ) : (
             <p className="text-sm text-muted-foreground">No tasks found.</p>
          )}
        </section>
      </div>
    </div>
  );
}
