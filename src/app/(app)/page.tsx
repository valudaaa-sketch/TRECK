import { createClient } from "@/utils/supabase/server";
import { Search } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage(props: { searchParams: Promise<{ projectId?: string }> }) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const selectedProjectId = searchParams.projectId || cookieStore.get('treck_last_project_id')?.value;
  
  let validProjectId = null;

  if (selectedProjectId) {
    const supabase = await createClient();
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', selectedProjectId)
      .is('archived_at', null)
      .single();

    if (project) {
      validProjectId = project.id;
    }
  }

  if (!validProjectId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      
      if (profile?.role === 'Admin') {
        const { data: anyProject } = await supabase.from('projects').select('id').is('archived_at', null).limit(1).maybeSingle();
        if (anyProject) validProjectId = anyProject.id;
      } else {
        const { data: membership } = await supabase
          .from('project_members')
          .select('project_id, projects!inner(id, archived_at)')
          .eq('user_id', user.id)
          .is('projects.archived_at', null)
          .limit(1)
          .maybeSingle();

        if (membership?.project_id) validProjectId = membership.project_id;
      }
    }
  }

  if (validProjectId) {
    redirect(`/projects/${validProjectId}/tasks`);
  }

  return (
    <div className="relative flex flex-col h-full w-full text-white bg-black">
      <div className="w-full relative z-10 flex-1 flex flex-col">
        {/* Main Area Content */}
        <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-8 py-6">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-white font-medium mb-1">No Project Assigned</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              You haven't been assigned to any active projects yet. Please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
