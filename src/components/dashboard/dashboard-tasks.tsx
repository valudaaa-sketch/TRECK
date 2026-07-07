"use client"

import { useState, useMemo, startTransition } from "react"
import Link from "next/link"
import { Clock, ArrowUpRight, ArrowUp, ArrowRight, ArrowDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { quickResolveTask, archiveTask } from "@/app/(app)/tasks/actions"
import { Search, Filter, ChevronDown, Circle, CheckCircle2, Paperclip, Loader2, Archive, UserPlus } from "lucide-react"

const PRIORITY_ICONS: Record<string, typeof ArrowUp> = {
  Critical: ArrowUpRight,
  High: ArrowUp,
  Medium: ArrowRight,
  Low: ArrowDown,
}

// Monochrome minimalist priority styling
const PRIORITY_COLORS: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-amber-500",
  Low: "bg-blue-500",
}

export function DashboardTasks({
  allTasks,
  myTasks,
  statuses
}: {
  allTasks: any[]
  myTasks: any[]
  statuses: any[]
}) {
  const [activeTab, setActiveTab] = useState<"all" | "my">("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showAllStatuses, setShowAllStatuses] = useState(false)

  const displayedStatuses = showAllStatuses 
    ? statuses 
    : statuses.filter(s => ['open', 'in progress', 'resolved'].some(k => s.name.toLowerCase().includes(k)))
  
  const otherStatuses = statuses.filter(s => !displayedStatuses.find((ds: any) => ds.id === s.id))

  const filteredTasks = useMemo(() => {
    const currentTasks = activeTab === "all" ? allTasks : myTasks
    return currentTasks.filter(task => 
      statusFilter === "all" ? true : task.task_statuses?.id === statusFilter
    )
  }, [activeTab, statusFilter, allTasks, myTasks])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-[-24px] z-30 bg-black pt-6 pb-2 -mx-4 px-4 sm:-mx-8 sm:px-8 -mt-6 flex flex-wrap gap-4 justify-between items-center mb-4 border-b border-border/40 supports-[backdrop-filter]:bg-black/80 backdrop-blur">
        
        {/* Left: Tabs */}
        <div className="flex bg-card p-1 rounded-md border border-border">
          <button
            onClick={() => setActiveTab("all")}
            className={`text-[12px] font-medium px-4 py-1.5 rounded transition-colors ${
              activeTab === "all" ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-muted-foreground"
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`text-[12px] font-medium px-4 py-1.5 rounded transition-colors ${
              activeTab === "my" ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-muted-foreground"
            }`}
          >
            My Tasks
          </button>
        </div>
        <div className="flex items-center">
          <Select 
            value={statusFilter} 
            onValueChange={(val) => setStatusFilter(val || "all")}
            onOpenChange={(open) => {
              if (!open) setShowAllStatuses(false)
            }}
          >
            <SelectTrigger className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-1.5 text-[12px] text-muted-foreground hover:text-muted-foreground transition-colors h-auto w-auto focus:ring-0">
              <Filter className="w-3.5 h-3.5" />
              <SelectValue placeholder="Filter by status">
                {statusFilter === "all" ? "Status: All" : `Status: ${statuses.find(s => s.id === statusFilter)?.name}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-white">
              <SelectItem value="all" className="focus:bg-accent focus:text-white cursor-pointer text-[12px]">All Statuses</SelectItem>
              {displayedStatuses.map(s => (
                <SelectItem key={s.id} value={s.id} className="focus:bg-accent focus:text-white cursor-pointer text-[12px]">{s.name}</SelectItem>
              ))}
              {otherStatuses.length > 0 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-[12px] h-8 justify-start text-muted-foreground hover:text-white hover:bg-accent mt-1" 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowAllStatuses(!showAllStatuses)
                  }}
                >
                  {showAllStatuses ? "Less statuses..." : "More statuses..."}
                </Button>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden flex flex-col flex-1 shadow-md">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-muted-foreground">
            {statusFilter !== "all" ? "No tasks found for this status." : "No tasks found."}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#333]">

          {filteredTasks.map((task) => {
            const isResolved = task.task_statuses?.name?.toLowerCase().includes('resolved') || task.task_statuses?.name?.toLowerCase().includes('done') || task.task_statuses?.name?.toLowerCase().includes('closed')
            const priorityColor = PRIORITY_COLORS[task.priority] || "bg-[#E98585]"
            
            const createdTime = new Date(task.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            
            return (
              <div
                key={task.id}
                className="flex items-start sm:items-center justify-between py-3 sm:py-3 px-3 sm:px-4 border-b border-border last:border-b-0 hover:bg-white/[0.02] transition-colors group relative gap-2 sm:gap-0"
              >
                {/* Left Side: Details */}
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center min-w-0">
                  <Link href={`/projects/${task.project_id}/tasks/${task.id}`} className="flex-1 flex flex-col sm:flex-row sm:items-center min-w-0">
                    {/* Desktop Avatar */}
                    <div className="hidden sm:flex shrink-0">
                      {task.owner ? (
                        <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden" title={(task.owner as any).full_name}>
                          {(task.owner as any).avatar_url ? (
                            <img src={(task.owner as any).avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-semibold">
                              {(task.owner as any).full_name?.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-card border border-dashed border-input flex items-center justify-center text-muted-foreground group-hover:text-[#858ce9] group-hover:border-[#858ce9]/50 transition-colors" title="Unassigned">
                          <UserPlus className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    
                    {/* Text Details */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:ml-4 min-w-0 w-full gap-y-2 sm:gap-x-4">
                      
                      {/* Left: Title */}
                      <div className="flex items-center gap-2 min-w-0 sm:flex-1">
                        {/* Mobile Avatar (tiny inline) */}
                        <div className="sm:hidden shrink-0">
                          {task.owner ? (
                            <div className="w-5 h-5 rounded bg-muted border border-input flex items-center justify-center overflow-hidden" title={(task.owner as any).full_name}>
                              {(task.owner as any).avatar_url ? (
                                <img src={(task.owner as any).avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-muted-foreground font-semibold">
                                  {(task.owner as any).full_name?.substring(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded bg-card border border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground">
                              <UserPlus className="w-2 h-2" />
                            </div>
                          )}
                        </div>
                        <span className={`text-[14px] leading-tight truncate ${isResolved ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}`}>
                          {task.title}
                        </span>
                      </div>
                      
                      {/* Right: Meta / Badges */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                        <span className={`hidden sm:inline-block text-[13px] font-medium ${isResolved ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                          {task.owner ? (task.owner as any).full_name : "Unassigned"}
                        </span>
                        
                        <span className="hidden sm:inline-block text-[11px] text-muted-foreground" suppressHydrationWarning>
                          • {createdTime}
                        </span>

                        {!isResolved && (
                          <span className={`text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded border border-input bg-card shrink-0 ${
                            task.priority === 'Critical' ? 'text-red-400' :
                            task.priority === 'High' ? 'text-orange-400' :
                            task.priority === 'Medium' ? 'text-amber-500' : 'text-blue-400'
                          }`}>
                            {task.priority}
                          </span>
                        )}
                        {isResolved && (
                          <span className="text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded border border-emerald-900/40 bg-emerald-900/10 text-emerald-500 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Resolved
                          </span>
                        )}
                        {task.projects && !isResolved && (
                          <span className="text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded border border-input bg-card text-muted-foreground truncate max-w-[100px] sm:max-w-[120px] shrink-0">
                            {(task.projects as any).name}
                          </span>
                        )}
                        {/* Mobile Time */}
                        <span className="sm:hidden text-[10px] text-muted-foreground shrink-0" suppressHydrationWarning>
                          {createdTime}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
                {/* Right Side: Actions */}
                <div className="flex items-center shrink-0 ml-2 sm:ml-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-transparent sm:bg-[#111] sm:border border-border rounded-lg p-0 sm:px-2 sm:py-1.5 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                    {!isResolved && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          if (!window.confirm(`Mark task "${task.title}" as resolved?`)) return
                          const resolvedStatus = statuses.find(s => s.name.toLowerCase().includes('resolve') || s.name.toLowerCase().includes('done'))
                          if (resolvedStatus) {
                            startTransition(async () => {
                              await quickResolveTask(task.id, resolvedStatus.id, task.project_id)
                            })
                          }
                        }}
                        title="Mark Resolved"
                        className="text-muted-foreground hover:text-emerald-500 transition-colors p-2.5 sm:p-2 rounded-md hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 className="h-6 w-6 sm:h-5 sm:w-5" />
                      </button>
                    )}

                    <button
                        onClick={(e) => {
                          e.preventDefault()
                          const statusName = task.task_statuses?.name || ""
                          const isActive = statusName.toLowerCase().includes('progress') || statusName.toLowerCase().includes('open')
                          const isResolved = statusName.toLowerCase().includes('resolve') || statusName.toLowerCase().includes('done') || statusName.toLowerCase().includes('closed')
                          
                          if (isActive) {
                            if (!window.confirm(`⚠️ This task is currently "${statusName}". Archiving an active task means it will no longer appear in task lists.\n\nAre you sure you want to archive it?`)) return
                          } else if (isResolved) {
                            if (!window.confirm(`Archive this resolved task "${task.title}"?\n\nYou can restore it from Archives later.`)) return
                          } else {
                            if (!window.confirm(`⚠️ This task is "${statusName}". Are you sure you want to archive it?\n\nYou can restore it from Archives later.`)) return
                          }
                          startTransition(async () => {
                            await archiveTask(task.id)
                          })
                        }}
                      title="Archive Task"
                      className="text-muted-foreground hover:text-rose-400 transition-colors p-2.5 sm:p-2 rounded-md hover:bg-rose-500/10"
                    >
                      <Archive className="h-6 w-6 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>
    </div>
  )
}
