"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, AlertCircle, Clock, Plus, User, Tag, Archive, AlertTriangle, ChevronLeft, Undo2, Save, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { updateTaskBulk } from "@/app/(app)/tasks/actions"
import { getUserColor } from "@/lib/colors"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const PRIORITY_CLASSES: Record<string, string> = {
  Critical: "text-foreground border-border/50 bg-transparent",
  High: "text-muted-foreground border-border/50 bg-transparent",
  Medium: "text-muted-foreground/70 border-border/50 bg-transparent",
  Low: "text-muted-foreground/50 border-border/50 bg-transparent",
}

export function TaskDetailForm({
  task,
  statuses,
  teamMembers,
  currentUser,
  leftBottomContent,
  rightContent,
}: {
  task: any
  statuses: any[]
  teamMembers: any[]
  currentUser: any
  leftBottomContent?: React.ReactNode
  rightContent?: React.ReactNode
}) {
  const router = useRouter()
  
  // Draft State
  const [draft, setDraft] = useState({
    title: task.title || "",
    description: task.description || "",
    status_id: task.task_statuses?.id || "",
    priority: task.priority || "Medium",
    current_owner: task.current_owner || "unassigned",
    deadline: task.deadline ? task.deadline.split('T')[0] : "",
  })

  const [saving, setSaving] = useState(false)
  const [showAllStatuses, setShowAllStatuses] = useState(false)

  // Keep track of the last saved state to avoid showing banner while router.refresh() runs
  const [canonicalTask, setCanonicalTask] = useState(task)

  const [archiveWarningState, setArchiveWarningState] = useState<0 | 1 | 2>(0)
  const [isArchiving, setIsArchiving] = useState(false)

  // Sync if prop changes
  useEffect(() => {
    setCanonicalTask(task)
  }, [task])

  // Check if draft is different from original
  const hasChanges = 
    draft.title !== canonicalTask.title ||
    draft.description !== (canonicalTask.description || "") ||
    draft.status_id !== canonicalTask.task_statuses?.id ||
    draft.priority !== canonicalTask.priority ||
    draft.current_owner !== (canonicalTask.current_owner || "unassigned") ||
    draft.deadline !== (canonicalTask.deadline ? canonicalTask.deadline.split('T')[0] : "")

  const isOverdue = draft.deadline && new Date(draft.deadline) < new Date() && !task.resolved_at

  const PRIMARY_STATUSES = ["open", "in progress", "resolved"]
  const primaryStatuses = statuses.filter(s => PRIMARY_STATUSES.includes(s.name.toLowerCase()))
  const otherStatuses = statuses.filter(s => !PRIMARY_STATUSES.includes(s.name.toLowerCase()))
  const displayedStatuses = showAllStatuses ? statuses : primaryStatuses

  const priorityOptions = ["Low", "Medium", "High", "Critical"]

  async function handleSave() {
    if (!draft.title.trim()) {
      toast.error("Title cannot be empty")
      return
    }
    
    // Optimistically update canonical task to hide the banner immediately
    const previousTask = { ...canonicalTask }
    setCanonicalTask({
      ...canonicalTask,
      title: draft.title,
      description: draft.description,
      task_statuses: { ...canonicalTask.task_statuses, id: draft.status_id },
      priority: draft.priority,
      current_owner: draft.current_owner === "unassigned" ? null : draft.current_owner,
      deadline: draft.deadline || null,
    })
    
    setSaving(true)
    
    try {
      await updateTaskBulk(task.id, {
        title: draft.title,
        description: draft.description,
        status_id: draft.status_id,
        priority: draft.priority,
        current_owner: draft.current_owner === "unassigned" ? null : draft.current_owner,
        deadline: draft.deadline || null,
      })
      
      toast.success("Changes saved")
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || "Failed to save changes")
      setCanonicalTask(previousTask) // rollback on error
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft({
      title: task.title || "",
      description: task.description || "",
      status_id: task.task_statuses?.id || "",
      priority: task.priority || "Medium",
      current_owner: task.current_owner || "unassigned",
      deadline: task.deadline ? task.deadline.split('T')[0] : "",
    })
  }

  const currentStatus = statuses.find(s => s.id === draft.status_id) || { name: 'Status', color: '#94a3b8' }
  const currentAssignee = teamMembers.find(u => u.id === draft.current_owner)
  const isResolved = currentStatus.name.toLowerCase() === "resolved" || currentStatus.name.toLowerCase() === "done"

  async function handleArchive() {
    if (archiveWarningState === 0) {
      setArchiveWarningState(1)
      return
    }
    if (!isResolved && archiveWarningState === 1) {
      setArchiveWarningState(2)
      return
    }
    
    setIsArchiving(true)
    try {
      await updateTaskBulk(task.id, { archived_at: new Date().toISOString() })
      toast.success("Task archived")
      router.push(`/projects/${task.project_id}/tasks`)
    } catch (e: any) {
      toast.error(e.message || "Failed to archive task")
      setIsArchiving(false)
      setArchiveWarningState(0)
    }
  }

  return (
    <div className={`relative flex flex-col h-full w-full overflow-x-hidden transition-colors duration-500 ${isResolved ? 'bg-emerald-950/10' : ''}`}>
      {/* Archive Warning Dialogs */}
      {archiveWarningState > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#121214] border border-rose-500/20 shadow-2xl rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-medium">Archive Task?</h3>
            </div>
            
            {archiveWarningState === 1 && !isResolved ? (
              <p className="text-white/70 text-sm mb-6">
                This task is currently <strong>{currentStatus.name}</strong>. Are you sure you want to archive an unfinished task?
              </p>
            ) : archiveWarningState === 2 ? (
              <p className="text-white/70 text-sm mb-6">
                <strong>Final Warning:</strong> This task is still <strong>{currentStatus.name}</strong>. Archiving it will remove it from active views. Proceed?
              </p>
            ) : (
              <p className="text-white/70 text-sm mb-6">
                Are you sure you want to archive this resolved task?
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setArchiveWarningState(0)}
                disabled={isArchiving}
                className="text-white/50 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleArchive}
                disabled={isArchiving}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                {isArchiving ? "Archiving..." : "Yes, Archive"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full Width Header - always visible, never scrolls because sibling columns scroll independently */}
      <header className={`px-3 py-2.5 md:px-6 lg:px-8 md:py-3.5 border-b border-border shrink-0 bg-background md:rounded-t-xl z-40 supports-[backdrop-filter]:bg-background/95 backdrop-blur shadow-sm transition-colors duration-500 ${isResolved ? 'border-b-emerald-900/40' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2 md:gap-x-3 mb-1.5 md:mb-2.5">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <Link
              href={`/projects/${task.project_id}/tasks`}
              className="flex items-center justify-center w-8 h-8 -ml-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors bg-white/5 border border-white/10 shrink-0"
              title="Back to Tasks"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="hidden lg:flex text-[12px] text-muted-foreground font-medium tracking-wide items-center gap-1.5 truncate">
              <span className="truncate">{task.projects?.name}</span>
              <span className="text-border shrink-0">•</span>
              <span className="shrink-0">tsk_{task.id.substring(0, 3)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 md:gap-2 text-muted-foreground">
            {/* Save Changes */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={!hasChanges || saving}
              className={`h-8 w-8 lg:w-auto p-0 lg:px-3.5 flex items-center justify-center rounded-md border transition-all shrink-0 ${
                hasChanges
                  ? 'text-muted-foreground border-border hover:text-white hover:bg-accent'
                  : 'text-muted-foreground/30 border-border/20 cursor-not-allowed'
              }`}
              title="Discard Changes"
            >
              <Undo2 className="h-4 w-4 lg:hidden" />
              <span className="hidden lg:inline text-[13px]">Discard</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`h-8 w-8 lg:w-auto p-0 lg:px-4 flex items-center justify-center rounded-md transition-all shrink-0 ${
                hasChanges
                  ? 'bg-[#858CE9] text-white hover:bg-[#7a81d4]'
                  : 'bg-[#858CE9]/20 text-white/30 cursor-not-allowed'
              }`}
              title="Save Changes"
            >
              {saving ? (
                <span className="animate-pulse">...</span>
              ) : (
                <>
                  <Save className="h-4 w-4 lg:hidden" />
                  <span className="hidden lg:inline text-[13px]">Save Changes</span>
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="hidden lg:block w-px h-4 bg-border mx-1" />

            {/* Submit = Mark Resolved */}
            <Button
              size="sm"
              onClick={async () => {
                const resolvedStatus = statuses.find(s =>
                  s.name.toLowerCase().includes('resolve') || s.name.toLowerCase().includes('done')
                )
                if (resolvedStatus && !isResolved) {
                  setDraft(d => ({ ...d, status_id: resolvedStatus.id }))
                  setSaving(true)
                  try {
                    await updateTaskBulk(task.id, {
                      title: draft.title,
                      description: draft.description,
                      status_id: resolvedStatus.id,
                      priority: draft.priority,
                      current_owner: draft.current_owner === 'unassigned' ? null : draft.current_owner,
                      deadline: draft.deadline || null,
                    })
                    setCanonicalTask({ ...canonicalTask, task_statuses: { ...canonicalTask.task_statuses, id: resolvedStatus.id } })
                    toast.success('Task marked as resolved')
                    router.refresh()
                  } catch(e: any) {
                    toast.error(e.message || 'Failed to resolve task')
                  } finally {
                    setSaving(false)
                  }
                }
              }}
              disabled={isResolved || saving}
              className={`h-8 w-8 lg:w-auto p-0 lg:px-4 flex items-center justify-center rounded-md transition-all shrink-0 ${
                isResolved
                  ? 'bg-emerald-900/20 text-emerald-500/40 cursor-not-allowed border border-emerald-900/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title={isResolved ? "Resolved" : "Mark Resolved"}
            >
              {isResolved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 lg:hidden" />
                  <span className="hidden lg:inline text-[13px]">Mark Resolved</span>
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="hidden lg:block w-px h-4 bg-border mx-1" />

            <button onClick={() => setArchiveWarningState(1)} className="flex items-center justify-center gap-1.5 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 w-8 lg:w-auto lg:px-3.5 h-8 rounded-md font-medium shrink-0" title="Archive">
              <Archive className="h-4 w-4" />
              <span className="hidden lg:inline text-[13px]">Archive</span>
            </button>
          </div>
        </div>
        <input 
          value={draft.title} 
          onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))}
          className="w-full bg-transparent text-xl md:text-2xl font-semibold text-white placeholder:text-muted-foreground border-none outline-none focus:bg-[#111] rounded-lg -ml-1.5 px-1.5 py-0.5 transition-colors"
          placeholder="Task Title"
        />
      </header>

      {/* Columns - this is the scroll area; header above never scrolls because it's a flex sibling */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden overflow-x-hidden">
        {/* Left Column */}
        <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border overflow-x-hidden overflow-visible lg:overflow-y-auto space-y-6 custom-scrollbar min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
          {/* Status Tag */}
          <Select 
            value={draft.status_id} 
            onValueChange={(val) => {
              const selectedStatus = statuses.find(s => s.id === val)
              const isResolved = selectedStatus && (selectedStatus.name.toLowerCase().includes('resolve') || selectedStatus.name.toLowerCase().includes('done'))
              if (isResolved && draft.current_owner === "unassigned") {
                setDraft(d => ({ ...d, status_id: val, current_owner: currentUser.id }))
                toast.success("Assigned to you automatically")
              } else {
                setDraft(d => ({ ...d, status_id: val }))
              }
            }}
            onOpenChange={(open) => !open && setShowAllStatuses(false)}
          >
            <SelectTrigger className="h-auto flex items-center gap-1.5 bg-blue-900/10 border border-blue-900/50 hover:border-blue-900/80 px-3 py-1.5 rounded-lg transition-colors group shadow-none w-auto text-[12px] text-blue-400 font-medium cursor-pointer focus:ring-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              <SelectValue>{currentStatus.name}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-white">
              {displayedStatuses.map(s => (
                <SelectItem key={s.id} value={s.id} className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">{s.name}</SelectItem>
              ))}
              {otherStatuses.length > 0 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-[12px] h-8 justify-start text-muted-foreground hover:text-white hover:bg-accent mt-1 transition-colors" 
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

          {/* Priority Tag */}
          <Select 
            value={draft.priority} 
            onValueChange={(val) => setDraft(d => ({ ...d, priority: val }))}
          >
            <SelectTrigger className="h-auto flex items-center gap-1.5 bg-yellow-900/10 border border-yellow-900/50 hover:border-yellow-900/80 px-3 py-1.5 rounded-lg transition-colors group shadow-none w-auto text-[12px] text-yellow-400 font-medium cursor-pointer focus:ring-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <SelectValue>{draft.priority}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-white">
              {priorityOptions.map(p => (
                <SelectItem key={p} value={p} className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assignee Tag */}
          <Select 
            value={draft.current_owner} 
            onValueChange={(val) => setDraft(d => ({ ...d, current_owner: val }))}
          >
            <SelectTrigger className="h-auto flex items-center gap-1.5 bg-emerald-900/10 border border-emerald-900/50 hover:border-emerald-900/80 px-3 py-1.5 rounded-lg transition-colors group shadow-none w-auto text-[12px] text-emerald-400 font-medium cursor-pointer focus:ring-0">
              <SelectValue>
                {draft.current_owner === "unassigned" ? (
                  <span 
                    className="flex items-center gap-1.5"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDraft(d => ({ ...d, current_owner: currentUser.id }))
                    }}
                  >
                    <User className="h-3 w-3" /> Takeover
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3 w-3" /> {currentAssignee?.full_name}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-white">
              <SelectItem value="unassigned" className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">Unassigned</SelectItem>
              {teamMembers.map(u => (
                <SelectItem key={u.id} value={u.id} className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Deadline Tag */}
          <Popover>
            <PopoverTrigger className={`h-auto flex items-center gap-1.5 bg-card border border-border hover:border-input px-3 py-1.5 rounded-lg transition-colors group shadow-none w-auto text-[12px] font-medium cursor-pointer focus:ring-0 ${isOverdue ? 'text-rose-400 border-rose-500/30' : 'text-white'}`}>
              <Calendar className="h-3 w-3 text-muted-foreground" />
              {draft.deadline ? draft.deadline.split('T')[0] : "No deadline"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 bg-card border-border text-white" align="start">
              <div className="space-y-2">
                <h4 className="font-medium text-[12px] text-muted-foreground">Set Deadline</h4>
                <Input 
                  type="date"
                  value={draft.deadline}
                  onChange={(e) => setDraft(d => ({ ...d, deadline: e.target.value }))}
                  className="h-8 text-[13px] bg-background border-border focus-visible:border-input focus-visible:ring-0 text-white"
                />
                {draft.deadline && (
                  <Button variant="ghost" size="sm" className="h-7 w-full text-[12px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => setDraft(d => ({ ...d, deadline: "" }))}>
                    Clear Deadline
                  </Button>
                )}
              </div>
            </PopoverContent>
            </Popover>
            </div>
            <div className="flex justify-end gap-3 text-[11px] text-muted-foreground whitespace-nowrap">
              <span>Created {task.created_at?.split('T')[0]}</span>
              <span>Updated {task.updated_at?.split('T')[0]}</span>
            </div>
          </div>

          {/* Description */}
          <section className="flex flex-col gap-3">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-3 h-3" /> DESCRIPTION
            </label>
            <div className="bg-background border border-border rounded-lg relative group transition-colors focus-within:border-[#333]">
              <Textarea 
                value={draft.description}
                onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
                className="w-full bg-transparent text-[13px] text-muted-foreground leading-relaxed p-4 min-h-[120px] resize-y placeholder:text-muted-foreground outline-none border-none shadow-none focus-visible:ring-0 rounded-lg"
                placeholder="Add details..."
                style={{ fieldSizing: "content" } as any}
              />
            </div>
          </section>

          {leftBottomContent}
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[360px] flex flex-col lg:shrink-0 overflow-x-hidden overflow-visible lg:overflow-hidden bg-background min-w-0">
          {rightContent}
        </div>
      </div>
    </div>
  )
}
