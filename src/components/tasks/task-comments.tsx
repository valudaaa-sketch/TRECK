"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Send, Pencil, Check, X, Trash2, ArrowRight } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getUserColor } from "@/lib/colors"

type User = { id: string; full_name: string; avatar_url?: string }
type Comment = {
  id: string
  content: string
  created_at: string
  is_edited: boolean
  users: User
}

function formatRelativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const ACTION_LABELS: Record<string, string> = {
  task_created: "created this task",
  task_edited: "edited this task",
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
  claimed: "took over this task",
  project_created: "created this project",
  project_edited: "edited this project",
  project_archived: "archived this project",
  document_created: "created a document",
  document_updated: "updated a document",
  document_deleted: "deleted a document",
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function TaskComments({
  taskId,
  comments: initialComments,
  activity = [],
  currentUser,
  teamMembers,
}: {
  taskId: string
  comments: Comment[]
  activity?: any[]
  currentUser: { id: string }
  teamMembers: User[]
}) {
  const [comments, setComments] = useState(initialComments)
  const [logs, setLogs] = useState(activity)
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [activeTab, setActiveTab] = useState<"discussion" | "activity">("discussion")
  const router = useRouter()

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  useEffect(() => {
    setLogs(activity)
  }, [activity])

  async function submitComment() {
    if (!content.trim()) return
    setIsSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("comments")
      .insert({ task_id: taskId, user_id: currentUser.id, content: content.trim() })
      .select("*, users(id, full_name, avatar_url)")
      .single()

    if (!error && data) {
      // Log activity
      await supabase.from("activity_logs").insert({
        entity_type: "task",
        entity_id: taskId,
        user_id: currentUser.id,
        action: "comment_added",
        new_value: { comment_id: data.id, content: data.content },
      })
      setComments((prev) => [...prev, data as Comment])
      setContent("")
    }
    setIsSubmitting(false)
  }

  async function saveEdit(commentId: string) {
    if (!editContent.trim()) return
    const supabase = createClient()
    const { error } = await supabase
      .from("comments")
      .update({ content: editContent.trim(), is_edited: true })
      .eq("id", commentId)

    if (!error) {
      // Log activity
      await supabase.from("activity_logs").insert({
        entity_type: "task",
        entity_id: taskId,
        user_id: currentUser.id,
        action: "comment_edited",
        new_value: { comment_id: commentId, content: editContent.trim() },
      })
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: editContent, is_edited: true } : c))
      )
      setEditingId(null)
    }
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("Are you sure you want to delete this comment? This cannot be undone.")) return;
    
    const supabase = createClient()
    const { error } = await supabase
      .from("comments")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", commentId)

    if (!error) {
      // Log activity
      await supabase.from("activity_logs").insert({
        entity_type: "task",
        entity_id: taskId,
        user_id: currentUser.id,
        action: "comment_deleted",
        previous_value: { comment_id: commentId, content: comments.find(c => c.id === commentId)?.content || "" },
      })
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      toast.success("Comment deleted")
    } else {
      toast.error("Failed to delete comment")
    }
  }

  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [activityLimit, setActivityLimit] = useState(3)

  const downloadFile = async (filePath: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('project-files').createSignedUrl(filePath, 60)
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    } else {
      toast.error("Failed to generate download link")
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Tabs */}
      <div className="flex gap-6 border-b border-border px-6 pt-6 shrink-0">
        <button 
          onClick={() => setActiveTab("discussion")}
          className={`pb-3 text-[13px] font-semibold transition-colors border-b-2 ${
            activeTab === "discussion" ? "text-white border-[#00c896]" : "text-muted-foreground hover:text-white border-transparent"
          }`}
        >
          Discussion
        </button>
        <button 
          onClick={() => setActiveTab("activity")}
          className={`pb-3 text-[13px] font-semibold transition-colors border-b-2 ${
            activeTab === "activity" ? "text-white border-[#00c896]" : "text-muted-foreground hover:text-white border-transparent"
          }`}
        >
          Activity Log
        </button>
      </div>

      {activeTab === "discussion" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scrollbar">
            {comments.length === 0 && (
              <p className="text-xs text-white/30 text-center py-4 italic">No comments yet.</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <div 
                  className="h-8 w-8 shrink-0 rounded text-[11px] font-bold text-white flex items-center justify-center uppercase"
                  style={{ backgroundColor: getUserColor(comment.users?.id || "") }}
                >
                  {comment.users?.full_name?.substring(0, 2) || "?"}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-[13px] text-white">{comment.users?.full_name}</span>
                      <span className="text-[11px] text-muted-foreground">{formatRelativeTime(comment.created_at)}</span>
                      {comment.is_edited && <span className="text-[11px] text-muted-foreground italic">(edited)</span>}
                    </div>
                    {comment.users?.id === currentUser.id && !editingId && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-white transition-colors flex items-center justify-center rounded hover:bg-accent"
                          onClick={() => { setEditingId(comment.id); setEditContent(comment.content) }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          className="h-6 w-6 shrink-0 text-white/30 hover:text-rose-400 transition-colors flex items-center justify-center rounded hover:bg-rose-500/10"
                          onClick={() => deleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {editingId === comment.id ? (
                    <div className="space-y-2 mt-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] text-sm bg-background border-border focus-visible:border-input focus-visible:ring-0 text-white"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(comment.id)} className="bg-[#858CE9] hover:bg-[#7a81d4] text-white border-none h-7 text-xs">
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs text-muted-foreground hover:text-white hover:bg-accent">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-border shrink-0 bg-background">
            <div className="flex gap-3 items-center bg-card border border-border p-2 rounded-lg focus-within:border-[#333] transition-colors">
              <div 
                className="h-8 w-8 shrink-0 rounded text-[11px] font-bold text-white flex items-center justify-center uppercase"
                style={{ backgroundColor: "#d97706" }}
              >
                {currentUser.id.substring(0, 2)}
              </div>
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-muted-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    submitComment()
                  }
                }}
              />
              <button 
                onClick={submitComment} 
                disabled={isSubmitting || !content.trim()}
                className="h-8 w-8 flex items-center justify-center shrink-0 disabled:opacity-50 text-muted-foreground hover:text-white transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
          {logs.length === 0 && (
            <p className="text-xs text-white/30 text-center py-4 italic">No activity recorded yet.</p>
          )}
          {logs.map((log: any) => {
              const entry = log;
              const prev = entry.previous_value as Record<string, any> | null;
              const next = entry.new_value as Record<string, any> | null;
              const fieldKey = prev ? Object.keys(prev)[0] : next ? Object.keys(next)[0] : null;
              const rawPrev = prev && fieldKey ? prev[fieldKey] : null;
              const rawNext = next && fieldKey ? next[fieldKey] : null;
              const prevStr = rawPrev != null ? (typeof rawPrev === "object" ? String((rawPrev as any).name || (rawPrev as any).title || JSON.stringify(rawPrev)) : String(rawPrev)) : null;
              const nextStr = rawNext != null ? (typeof rawNext === "object" ? String((rawNext as any).name || (rawNext as any).title || JSON.stringify(rawNext)) : String(rawNext)) : null;

              const hasCustomRenderer = entry.action.startsWith("comment_") || entry.action.startsWith("file_") || entry.action.startsWith("checklist_")

              return (
                <div key={entry.id} className="flex gap-3 py-3 border-b border-white/[0.05] last:border-0 items-start group">
                  <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                    <AvatarImage src={(entry.users as any)?.avatar_url || ""} />
                    <AvatarFallback 
                      className="text-[10px] text-white"
                      style={{ backgroundColor: getUserColor(entry.user_id || "") }}
                    >
                      {(entry.users as any)?.full_name?.substring(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 leading-relaxed">
                      <span className="font-medium text-white/90">{(entry.users as any)?.full_name}</span>
                      {" "}
                      {ACTION_LABELS[entry.action] || entry.action.replace(/_/g, " ")}
                      {" "}
                      
                      {/* Generic field-level change */}
                      {prevStr && nextStr && !hasCustomRenderer && entry.action !== "task_created" && (
                        <span className="text-white/40">
                          from{" "}
                          <span className="line-through">
                            {prevStr.length > 40 && !expandedLogs[entry.id + '-prev'] ? (
                              <span>{prevStr.substring(0, 40)}... <button onClick={() => setExpandedLogs(p => ({ ...p, [entry.id + '-prev']: true }))} className="text-emerald-400 hover:underline">more</button></span>
                            ) : prevStr}
                          </span>
                          {" "}to{" "}
                          <span className="font-medium text-white/80">
                            {nextStr.length > 40 && !expandedLogs[entry.id + '-next'] ? (
                              <span>{nextStr.substring(0, 40)}... <button onClick={() => setExpandedLogs(p => ({ ...p, [entry.id + '-next']: true }))} className="text-emerald-400 hover:underline">more</button></span>
                            ) : nextStr}
                          </span>
                        </span>
                      )}

                      {/* File Uploaded */}
                      {entry.action === "file_uploaded" && entry.new_value && (
                        <span className="font-medium text-white/80">
                          {typeof entry.new_value === "object" && (entry.new_value as any).file_path ? (
                            <button onClick={() => downloadFile((entry.new_value as any).file_path)} className="text-emerald-400 hover:underline">
                              {(entry.new_value as any).file_name || "a file"}
                            </button>
                          ) : (
                            typeof entry.new_value === "object" ? (entry.new_value as any).file_name || JSON.stringify(entry.new_value) : String(entry.new_value)
                          )}
                        </span>
                      )}

                      {/* File Deleted */}
                      {entry.action === "file_deleted" && entry.previous_value && (
                        <span className="line-through text-white/40 font-medium">
                          {typeof entry.previous_value === "object" && (entry.previous_value as any).file_path ? (
                            <button onClick={() => downloadFile((entry.previous_value as any).file_path)} className="hover:underline hover:text-white/60">
                              {(entry.previous_value as any).file_name || "a file"}
                            </button>
                          ) : (
                            typeof entry.previous_value === "object" ? (entry.previous_value as any).file_name || JSON.stringify(entry.previous_value) : String(entry.previous_value)
                          )}
                        </span>
                      )}

                      {/* Checklists */}
                      {entry.action.startsWith("checklist_") && (rawNext || rawPrev) && (
                        <span className={`font-medium ${entry.action === "checklist_deleted" ? "line-through text-white/40" : "text-white/80"}`}>
                          "{typeof (rawNext || rawPrev) === "object" ? ((rawNext || rawPrev) as any).item_text : (rawNext || rawPrev)}"
                        </span>
                      )}

                      {/* Comments */}
                      {entry.action.startsWith("comment_") && (rawNext || rawPrev) && (
                        <span className={`italic ${entry.action === "comment_deleted" ? "line-through text-white/40" : "text-white/80"}`}>
                          "{typeof (rawNext || rawPrev) === "object" ? ((rawNext || rawPrev) as any).content : (rawNext || rawPrev)}"
                        </span>
                      )}
                    </p>
                    <time className="text-[10px] text-white/30 block mt-1">{formatRelativeTime(entry.created_at)}</time>
                  </div>
                </div>
              );
            }).slice(0, activityLimit)
          }
          {logs.length > activityLimit && (
            <div className="flex justify-center pt-4 pb-2 border-t border-white/[0.05]">
              <button 
                onClick={() => setActivityLimit(prev => prev + 3)}
                className="text-xs text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full border border-white/10"
              >
                View more activity ({logs.length - activityLimit} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
