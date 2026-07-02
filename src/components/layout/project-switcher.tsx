"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Plus, Check } from "lucide-react"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { setActiveProjectCookie } from "@/app/(app)/projects/actions"

export function ProjectSwitcher({ 
  projects, 
  userRole,
  initialProjectId 
}: { 
  projects: { id: string; name: string, logo_url?: string | null }[], 
  userRole?: string,
  initialProjectId?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Try to detect current project from URL query param, then path, then cookie (initialProjectId)
  const projectIdParam = searchParams.get('projectId')
  const projectMatch = pathname.match(/\/projects\/([^/]+)/)
  const currentProjectId = projectIdParam || projectMatch?.[1] || initialProjectId || ""
  
  console.log("ProjectSwitcher render - projects:", projects, "isOpen:", isOpen);
  
  const activeProject = projects.find(p => p.id === currentProjectId)

  function getInitials(name: string) {
    if (!name) return "P"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  function handleSelectProject(projectId: string) {
    setActiveProjectCookie(projectId)
    setIsOpen(false)
    router.push(`/projects/${projectId}/tasks`)
  }

  return (
    <div className="w-full h-12 relative flex items-center" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full p-0 bg-transparent border-0 hover:bg-[#1A1A1A] focus:ring-0 focus:ring-offset-0 shadow-none flex items-center justify-between rounded group-data-[state=closed]/sidebar:justify-center px-2 transition-colors outline-none cursor-pointer"
      >
        {activeProject ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded bg-[#858CE9] text-white text-[11px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
              {activeProject.logo_url && activeProject.logo_url.startsWith('http') ? (
                <img src={activeProject.logo_url} alt="" className="w-full h-full object-cover" />
              ) : activeProject.logo_url ? (
                <span className="text-[16px]">{activeProject.logo_url}</span>
              ) : (
                getInitials(activeProject.name)
              )}
            </div>
            <span className="font-semibold text-[14px] text-white tracking-wide truncate group-data-[state=closed]/sidebar:hidden">
              {activeProject.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded border border-dashed border-input bg-transparent text-muted-foreground text-[11px] font-bold flex items-center justify-center shrink-0">
              ?
            </div>
            <span className="font-semibold text-[14px] text-muted-foreground tracking-wide truncate group-data-[state=closed]/sidebar:hidden">
              Select project
            </span>
          </div>
        )}
        <ChevronDown className="w-4 h-4 text-white/70 shrink-0 group-data-[state=closed]/sidebar:hidden" />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-[260px] bg-card border border-border rounded-lg shadow-2xl shadow-black z-[99999] py-1 flex flex-col max-h-[60vh] overflow-y-auto group-data-[state=closed]/sidebar:left-4">
          
          {projects.length === 0 ? (
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">
              No projects available
            </div>
          ) : (
            projects.map((p) => (
              <button 
                key={p.id}
                onClick={() => handleSelectProject(p.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-accent transition-colors text-left"
              >
                <div className="w-6 h-6 rounded bg-[#858CE9] text-white text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                  {p.logo_url && p.logo_url.startsWith('http') ? (
                    <img src={p.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : p.logo_url ? (
                    <span className="text-[14px]">{p.logo_url}</span>
                  ) : (
                    getInitials(p.name)
                  )}
                </div>
                <span className="flex-1 truncate">{p.name}</span>
                {p.id === currentProjectId && (
                  <Check className="w-4 h-4 text-[#858CE9] shrink-0" />
                )}
              </button>
            ))
          )}
          
          {userRole === 'Admin' && (
            <>
              <div className="h-px bg-border my-1 mx-2" />
              <div className="p-1">
                <CreateProjectDialog 
                  trigger={
                    <button className="w-full text-sm bg-transparent text-muted-foreground hover:bg-accent hover:text-white px-2 py-1.5 rounded-md font-medium flex items-center gap-2 transition-colors cursor-pointer text-left">
                      <Plus className="h-4 w-4" /> Create New Project
                    </button>
                  }
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
