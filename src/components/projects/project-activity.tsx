"use client"

import { useState, useEffect } from "react"
import { ArrowRight, Paperclip, AtSign, Rocket, Settings, FileText, CheckSquare, MessageSquare, ChevronDown, ChevronRight } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { getUserColor } from "@/lib/colors"
import { Button } from "@/components/ui/button"
import { postProjectUpdate } from "@/app/(app)/projects/actions"

type ActivityEntry = {
  id: string
  action: string
  previous_value?: Record<string, any> | null
  new_value?: Record<string, any> | null
  created_at: string
  users?: { full_name: string; avatar_url?: string } | null
}

const ACTION_LABELS: Record<string, string> = {
  task_created: "created a task",
  task_edited: "edited a task",
  title_changed: "changed the title",
  description_changed: "changed the description",
  priority_changed: "changed the priority",
  status_changed: "changed the status",
  assignee_changed: "changed the assignee",
  deadline_changed: "changed the deadline",
  comment_added: "added a comment",
  comment_edited: "edited a comment",
  comment_deleted: "deleted a comment",
  file_uploaded: "uploaded a file",
  file_deleted: "deleted a file",
  checklist_added: "added a checklist item",
  checklist_deleted: "deleted a checklist item",
  checklist_checked: "checked a checklist item",
  checklist_unchecked: "unchecked a checklist item",
  claimed: "took over a task",
  project_created: "created this project",
  project_edited: "edited this project",
  project_archived: "archived this project",
  document_created: "created a document",
  document_updated: "updated a document",
  document_deleted: "deleted a document",
  project_update: "posted an update",
  reopened: "re-opened this task",
  reinprogress: "moved this task back to in-progress"
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true
  })
}

function getActionIcon(action: string) {
  if (action.includes("file") || action.includes("document")) return <FileText className="w-3.5 h-3.5" />
  if (action.includes("task") || action.includes("checklist")) return <CheckSquare className="w-3.5 h-3.5" />
  if (action.includes("comment")) return <MessageSquare className="w-3.5 h-3.5" />
  if (action === 'project_update') return <Rocket className="w-3.5 h-3.5" />
  return <Settings className="w-3.5 h-3.5" />
}

export function ProjectActivity({ activity, projectId }: { activity: ActivityEntry[], projectId: string }) {
  const [logs, setLogs] = useState<ActivityEntry[]>(activity)
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})
  const [activityLimit, setActivityLimit] = useState(10)
  
  const [updateMessage, setUpdateMessage] = useState("")
  const [isPosting, setIsPosting] = useState(false)

  useEffect(() => {
    setLogs(activity)
  }, [activity])



  const downloadFile = async (filePath: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('project-files').createSignedUrl(filePath, 60)
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    } else {
      toast.error("Failed to generate download link")
    }
  }

  const handlePostUpdate = async () => {
    if (!updateMessage.trim()) return
    setIsPosting(true)
    try {
      await postProjectUpdate(projectId, updateMessage)
      setUpdateMessage("")
      toast.success("Update posted")
    } catch (e: any) {
      toast.error(e.message || "Failed to post update")
    } finally {
      setIsPosting(false)
    }
  }

  const groupedLogs: Array<ActivityEntry | ActivityEntry[]> = []
  let currentGroup: ActivityEntry[] = []
  
  logs.slice(0, activityLimit).forEach(entry => {
    if (entry.action === 'project_update') {
      if (currentGroup.length > 0) {
        groupedLogs.push([...currentGroup])
        currentGroup = []
      }
      groupedLogs.push(entry)
    } else {
      currentGroup.push(entry)
    }
  })
  if (currentGroup.length > 0) {
    groupedLogs.push([...currentGroup])
  }

  return (
    <div className="w-full text-white bg-transparent max-w-3xl mx-auto">
      {/* Post Update Box */}
      <div className="bg-background border border-border rounded-xl overflow-hidden mb-12">
        <textarea
          value={updateMessage}
          onChange={(e) => setUpdateMessage(e.target.value)}
          placeholder="Post a project update... (e.g., 'I just pushed the new hero banner')"
          className="w-full bg-transparent p-4 min-h-[80px] text-sm text-white focus:outline-none resize-none placeholder:text-[#444]"
        />
        <div className="flex items-center justify-end px-4 py-2.5 border-t border-border bg-[#0d0d0d]">
          <div className="flex items-center gap-4 text-muted-foreground">
          </div>
          <Button 
            onClick={handlePostUpdate}
            disabled={!updateMessage.trim() || isPosting}
            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white h-8 px-5 text-xs font-medium rounded-md shadow-none"
          >
            {isPosting ? 'Posting...' : 'Post Update'}
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative border-l border-border ml-[15px] pl-[29px] space-y-6 pb-4">
        {(!logs || logs.length === 0) ? (
          <p className="text-sm text-muted-foreground italic">No activity yet.</p>
        ) : (
          groupedLogs.map((group, groupIdx) => {
            if (!Array.isArray(group)) {
              const entry = group
              return (
                <div key={entry.id} className="relative group">
                  <Avatar className="absolute -left-[45px] top-0 w-8 h-8 ring-8 ring-[#050505]">
                    <AvatarImage src={entry.users?.avatar_url || ""} />
                    <AvatarFallback 
                      className="text-[10px] text-white"
                      style={{ backgroundColor: getUserColor(entry.users?.full_name || "") }}
                    >
                      {entry.users?.full_name?.substring(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-semibold text-white/90 text-sm">{entry.users?.full_name}</span>
                    <span className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">{formatTime(entry.created_at)}</span>
                  </div>

                  <div className="bg-background border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Rocket className="w-3.5 h-3.5 text-[#f97316]" />
                      <span className="text-[10px] font-bold tracking-widest text-[#f97316] uppercase">Project Update</span>
                    </div>
                    <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {(entry.new_value as any)?.message}
                    </p>
                  </div>
                </div>
              )
            } else {
              const isExpanded = expandedGroups[groupIdx]
              return (
                <div key={`group-${groupIdx}`} className="relative group">
                  <div className="absolute -left-[41px] top-1 w-6 h-6 flex items-center justify-center bg-background border border-border rounded-full ring-8 ring-[#050505] text-muted-foreground z-10">
                    <Settings className="w-3 h-3" />
                  </div>
                  <div className="pt-0.5 flex flex-col items-start">
                    <button 
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [groupIdx]: !isExpanded }))}
                      className="text-[11px] font-medium text-muted-foreground hover:text-white transition-colors flex items-center gap-1.5 bg-card border border-border px-3 py-1 rounded-full"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      {group.length} {group.length === 1 ? 'activity' : 'activities'}
                    </button>

                    {isExpanded && (
                      <div className="mt-5 space-y-5 w-full relative">
                        {group.map((entry) => {
                          const prev = entry.previous_value as Record<string, any> | null
                          const next = entry.new_value as Record<string, any> | null
                          const fieldKey = prev ? Object.keys(prev)[0] : next ? Object.keys(next)[0] : null
                          const rawPrev = prev && fieldKey ? prev[fieldKey] : null
                          const rawNext = next && fieldKey ? next[fieldKey] : null
                          const prevStr = rawPrev != null ? (typeof rawPrev === "object" ? String((rawPrev as any).name || (rawPrev as any).title || JSON.stringify(rawPrev)) : String(rawPrev)) : null;
                          const nextStr = rawNext != null ? (typeof rawNext === "object" ? String((rawNext as any).name || (rawNext as any).title || JSON.stringify(rawNext)) : String(rawNext)) : null;
                          const hasCustomRenderer = entry.action.startsWith("comment_") || entry.action.startsWith("file_") || entry.action.startsWith("checklist_") || entry.action.startsWith("document_")
              
                          return (
                            <div key={entry.id} className="relative flex items-start gap-3">
                              <div className="absolute -left-[30px] top-1.5 w-1.5 h-1.5 rounded-full bg-[#333] border border-[#111]"></div>
                              <div className="flex flex-col">
                                <p className="text-[13px] text-muted-foreground">
                                  <span className="font-medium text-white/90">{entry.users?.full_name}</span>
                                  {" "}
                                  {ACTION_LABELS[entry.action] || entry.action.replace(/_/g, " ")}
                                  {" "}
                                  
                                  {prevStr && nextStr && !hasCustomRenderer && entry.action !== "task_created" && entry.action !== "project_created" && (
                                    <span className="text-muted-foreground">
                                      from{" "}
                                      <span className="line-through">
                                        {prevStr.length > 40 && !expandedLogs[entry.id + '-prev'] ? (
                                          <span>{prevStr.substring(0, 40)}...</span>
                                        ) : prevStr}
                                      </span>
                                      {" "}to{" "}
                                      <span className="font-medium text-white/70">
                                        {nextStr.length > 40 && !expandedLogs[entry.id + '-next'] ? (
                                          <span>{nextStr.substring(0, 40)}...</span>
                                        ) : nextStr}
                                      </span>
                                    </span>
                                  )}
              
                                  {entry.action.startsWith("checklist_") && (rawNext || rawPrev) && (
                                    <span className={`font-medium ${entry.action === "checklist_deleted" ? "line-through text-muted-foreground" : "text-white/70"}`}>
                                      "{typeof (rawNext || rawPrev) === "object" ? ((rawNext || rawPrev) as any).item_text : (rawNext || rawPrev)}"
                                    </span>
                                  )}
              
                                  {entry.action.startsWith("comment_") && (rawNext || rawPrev) && (
                                    <span className={`italic ${entry.action === "comment_deleted" ? "line-through text-muted-foreground" : "text-white/70"}`}>
                                      "{typeof (rawNext || rawPrev) === "object" ? ((rawNext || rawPrev) as any).content : (rawNext || rawPrev)}"
                                    </span>
                                  )}
              
                                  {entry.action.startsWith("document_") && (rawNext || rawPrev) && (
                                    <span className={`font-medium ${entry.action === "document_deleted" ? "line-through text-muted-foreground" : "text-white/70"}`}>
                                      "{typeof (rawNext || rawPrev) === "object" ? ((rawNext || rawPrev) as any).title : (rawNext || rawPrev)}"
                                    </span>
                                  )}
                                </p>
                                <span className="text-[11px] text-muted-foreground mt-1 font-medium tracking-wide uppercase">{formatTime(entry.created_at)}</span>
                                
                                {entry.action === "file_uploaded" && entry.new_value && (
                                  <div className="mt-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card">
                                      <FileText className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium text-white/80 text-[11px]">
                                        {typeof entry.new_value === "object" && (entry.new_value as any).file_path ? (
                                          <button onClick={() => downloadFile((entry.new_value as any).file_path)} className="text-[#858ce9] hover:underline">
                                            {(entry.new_value as any).file_name || "a file"}
                                          </button>
                                        ) : (
                                          typeof entry.new_value === "object" ? (entry.new_value as any).file_name || JSON.stringify(entry.new_value) : String(entry.new_value)
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {entry.action === "file_deleted" && entry.previous_value && (
                                  <div className="mt-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card opacity-70">
                                      <FileText className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium text-[11px]">
                                        {(() => {
                                          const prevValue = entry.previous_value as any;
                                          const fileName = prevValue.file_name || "a file";
                                          const filePath = prevValue.file_path;
                                          const isAvailable = new Date(entry.created_at).getTime() > Date.now() - 15 * 24 * 60 * 60 * 1000;
                                          
                                          if (isAvailable && filePath) {
                                            return (
                                              <button onClick={() => downloadFile(filePath)} className="text-muted-foreground hover:text-[#858ce9] hover:underline line-through decoration-muted-foreground transition-colors text-left">
                                                {fileName}
                                              </button>
                                            )
                                          }
                                          return <span className="line-through text-muted-foreground">{fileName}</span>
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                )}
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
          })
        )}
      </div>

      {logs.length > activityLimit && (
        <div className="flex justify-center pt-8">
          <button 
            onClick={() => setActivityLimit(prev => prev + 10)}
            className="text-xs text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full border border-white/10"
          >
            Load more activity
          </button>
        </div>
      )}
    </div>
  )
}
