"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function AdminTaskFilters({
  statuses,
  users,
  projects
}: {
  statuses: any[]
  users: any[]
  projects: any[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get("status") || "all"
  const currentAssignee = searchParams.get("assignee") || "all"
  const currentProject = searchParams.get("project") || "all"

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/admin/tasks?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Project</label>
        <Select value={currentProject} onValueChange={(val) => updateParam("project", val)}>
          <SelectTrigger>
            <SelectValue placeholder="All Projects">
              {currentProject === 'all' ? 'All Projects' : projects?.find(p => p.id === currentProject)?.name || 'All Projects'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select value={currentStatus} onValueChange={(val) => updateParam("status", val)}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses">
              {currentStatus === 'all' ? 'All Statuses' : statuses?.find(s => s.id === currentStatus)?.name || 'All Statuses'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses?.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Assignee</label>
        <Select value={currentAssignee} onValueChange={(val) => updateParam("assignee", val)}>
          <SelectTrigger>
            <SelectValue placeholder="All Users">
              {currentAssignee === 'all' ? 'All Users' : currentAssignee === 'unassigned' ? 'Unassigned' : users?.find(u => u.id === currentAssignee)?.full_name || 'All Users'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {users?.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
