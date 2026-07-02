import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { Archive } from "lucide-react"
import { ProjectSwitcher } from "@/components/layout/project-switcher"
import { SidebarUserDropdown } from "@/components/layout/sidebar-user-dropdown"
import { Suspense } from "react"
import { ProjectSidebarChat } from "@/components/layout/project-sidebar-chat"
import { cookies } from "next/headers"

export async function AppSidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const cookieStore = await cookies()
  const activeProjectId = cookieStore.get('treck_last_project_id')?.value

  // Temporary RLS bypass fix: Manually calculate accessible projects
  // since the database RLS policy currently has an ambiguous 'id' bug for normal users
  const supabaseAdmin = (await import('@supabase/supabase-js')).createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all necessary data for the sidebar in parallel to prevent waterfalls
  const [
    { data: profile },
    { data: allProjects }, 
    { data: myMemberships }, 
    { data: myTasks }
  ] = await Promise.all([
    supabase.from("users").select("id, role, full_name").eq("id", user.id).single(),
    supabaseAdmin.from("projects").select("id, name, logo_url, created_by").is("archived_at", null).order("name", { ascending: true }),
    supabaseAdmin.from("project_members").select("project_id").eq("user_id", user.id),
    supabaseAdmin.from("tasks").select("project_id").eq("current_owner", user.id),
  ])

  const userRole = profile?.role || "Member"

  const memberProjectIds = new Set((myMemberships || []).map(m => m.project_id))
  const taskProjectIds = new Set((myTasks || []).map(t => t.project_id))

  const projects = (allProjects || []).filter(p => {
    if (userRole === 'Admin') return true
    if (p.created_by === user.id) return true
    if (memberProjectIds.has(p.id)) return true
    if (taskProjectIds.has(p.id)) return true
    return false
  })

  const userName = profile?.full_name || "User"
  const initials = userName.substring(0, 2).toUpperCase()

  return (
    <aside className="w-full bg-background flex flex-col border-r border-border shrink-0 z-20 h-[100dvh]">
      
      {/* Workspace Header (Project Dropdown) */}
      <div className="relative z-[100] h-14 pl-4 pr-10 data-[state=closed]:pr-4 flex items-center justify-between border-b border-border hover:bg-card transition-colors shrink-0">
        <Suspense fallback={<div className="h-12 w-full animate-pulse bg-card rounded" />}>
          <ProjectSwitcher projects={projects || []} userRole={userRole} initialProjectId={activeProjectId} />
        </Suspense>
      </div>

      <Suspense fallback={<div />}>
        <ProjectSidebarChat currentUserId={user.id} initialProjectId={activeProjectId} projects={projects} />
      </Suspense>



      {/* Sticky Footer: Profile & Dropdown */}
      <div className="mt-auto border-t border-border p-3 flex flex-col gap-3 bg-[#0F0F0F] shrink-0">
        <SidebarUserDropdown initials={initials} userName={userName} userRole={userRole} />
      </div>
    </aside>
  )
}
