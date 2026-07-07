import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { TeamFilter } from "@/components/admin/team-filter";
import { MobileSidebarToggle } from "@/components/layout/mobile-sidebar-toggle";
import { TeamMemberActions } from "@/components/admin/team-member-actions";
import { Suspense } from "react";
import { cookies } from "next/headers";

export default async function TeamManagementPage(props: { searchParams: Promise<{ projectId?: string }> }) {
  const searchParams = await props.searchParams;
  const projectIdFilter = searchParams.projectId;
  
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

  // Fetch all users
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
  }

  // Fetch all projects for the filter and assignment badges
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .is("archived_at", null);

  // Fetch project members
  const { data: projectMembers } = await supabase
    .from("project_members")
    .select("project_id, user_id");

  // Create a map of user_id -> array of project names
  const userProjectsMap: Record<string, { id: string, name: string }[]> = {};
  
  if (users && projects && projectMembers) {
    for (const member of projectMembers) {
      if (!userProjectsMap[member.user_id]) {
        userProjectsMap[member.user_id] = [];
      }
      const proj = projects.find(p => p.id === member.project_id);
      if (proj) {
        userProjectsMap[member.user_id].push({ id: proj.id, name: proj.name });
      }
    }
  }

  // Validate the filter against active projects. If invalid (e.g. archived project cookie), default to "all_users"
  let validProjectIdFilter = projectIdFilter;
  if (validProjectIdFilter && validProjectIdFilter !== "all_users") {
    if (!projects?.some(p => p.id === validProjectIdFilter)) {
      validProjectIdFilter = "all_users";
    }
  } else if (!validProjectIdFilter || validProjectIdFilter === "all") {
    validProjectIdFilter = "all_users";
  }

  // Filter users if a project is selected
  let filteredUsers = users || [];
  if (validProjectIdFilter !== "all_users") {
    filteredUsers = filteredUsers.filter(u => 
      userProjectsMap[u.id]?.some(p => p.id === validProjectIdFilter)
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Mobile Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 sm:pt-5 sm:pb-1 shrink-0 bg-background sm:bg-transparent border-b border-border sm:border-none z-40">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* We do NOT need MobileSidebarToggle here because GlobalProjectHeader handles it! */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] sm:text-2xl font-semibold text-white tracking-wide truncate">Team Management</h1>
            <p className="hidden sm:block text-muted-foreground text-sm mt-0.5">Manage your organization's members, roles, and access.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <TeamFilter projects={projects || []} currentProject={validProjectIdFilter} />
          <CreateUserForm allProjects={projects || []} />
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 sm:p-8 max-w-[1200px] mx-auto w-full">

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase bg-[#141517] border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium">Member</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Projects</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-[#0A0A0A]">
              {filteredUsers.map((u) => {
                const uProjects = userProjectsMap[u.id] || [];
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#858CE9] to-[#5C63D0] flex items-center justify-center text-[13px] font-bold text-white shadow-sm shrink-0">
                          {u.full_name?.substring(0, 2).toUpperCase() || "U"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-white tracking-wide">{u.full_name}</span>
                          <span className="text-[12px] text-muted-foreground mt-0.5">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${u.role === 'Admin' ? 'bg-[#858CE9]/10 text-[#858CE9] border border-[#858CE9]/20' : 'bg-white/5 text-muted-foreground border border-white/10'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                        {u.role === 'Admin' ? (
                          <span className="px-2 py-1 bg-[#1A1A1A] border border-white/5 rounded-md text-[11px] text-muted-foreground">
                            All Projects (Admin)
                          </span>
                        ) : uProjects.length > 0 ? (
                          uProjects.map(p => (
                            <span key={p.id} className="px-2 py-1 bg-[#1A1A1A] border border-white/5 rounded-md text-[11px] text-muted-foreground truncate max-w-[120px]" title={p.name}>
                              {p.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50 italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className={`inline-flex items-center gap-1.5 ${u.is_active ? 'text-emerald-500' : 'text-rose-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></span>
                        <span className="text-[12px] font-medium">{u.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right align-middle">
                      <div className="flex items-center justify-end">
                        <TeamMemberActions 
                          user={u} 
                          projects={projects || []} 
                          currentProjectIds={uProjects.map((p: any) => p.id)} 
                          currentUserId={user.id} 
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
