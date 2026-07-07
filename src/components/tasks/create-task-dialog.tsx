"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, ChevronDown, Paperclip, Calendar, ChevronUp, Loader2 } from "lucide-react"
import { createTask } from "@/app/(app)/tasks/actions"
import { getProjectColor } from "@/lib/colors"

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Status = { id: string; name: string }
type Project = { id: string; name: string }
type User = { id: string; full_name: string }

export function CreateTaskDialog({
  projectId,
  statuses,
  projects = [],
  users = [],
}: {
  projectId?: string
  statuses: Status[]
  projects?: Project[]
  users?: User[]
}) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const defaultStatusId = statuses.find(s => s.name === "Open")?.id || (statuses.length > 0 ? statuses[0].id : "")
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || (projects.length > 0 ? projects[0].id : ''))
  const [statusId, setStatusId] = useState<string>(defaultStatusId)
  const [assignee, setAssignee] = useState<string>('unassigned')
  const [priority, setPriority] = useState<string>('Medium')
  const [showAllStatuses, setShowAllStatuses] = useState(false)
  const [checklists, setChecklists] = useState<string[]>([])
  const [newChecklist, setNewChecklist] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [deadline, setDeadline] = useState("")

  const PRIMARY_STATUSES = ["open", "in progress", "resolved"]
  const primaryStatuses = statuses.filter(s => PRIMARY_STATUSES.includes(s.name.toLowerCase()))
  const otherStatuses = statuses.filter(s => !PRIMARY_STATUSES.includes(s.name.toLowerCase()))
  const displayedStatuses = showAllStatuses ? statuses : primaryStatuses

  async function onSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    formData.set("projectId", selectedProjectId || projectId || "")
    formData.set("statusId", statusId)
    formData.set("suggestedOwner", assignee)
    formData.set("priority", priority)
    if (deadline) formData.set("deadline", deadline)
    formData.set("statusId", statusId)
    formData.set("suggestedOwner", assignee)
    formData.set("priority", priority)

    checklists.forEach(c => formData.append("checklists", c))
    selectedFiles.forEach(f => formData.append("files", f))

    if (!formData.get("projectId")) {
      setError("Please select a project.")
      setIsLoading(false)
      return
    }

    const actualFiles = selectedFiles
    if (actualFiles.length > 5) {
      setError("Maximum 5 files allowed.")
      setIsLoading(false)
      return
    }
    for (const f of actualFiles) {
      if (f.size > 5 * 1024 * 1024) {
        setError(`File ${f.name} exceeds 5MB limit.`)
        setIsLoading(false)
        return
      }
    }

    try {
      await createTask(formData)
      setOpen(false)
      setShowMore(false)
      setSelectedFiles([])
      setChecklists([])
      setDeadline("")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to create task")
    } finally {
      setIsLoading(false)
    }
  }
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className="bg-[#858CE9] hover:bg-[#7a81d4] text-white px-2 sm:px-4 py-1.5 rounded-md text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Create Task</span>
        </button>
      } />
      
      <DialogContent className="w-full max-w-[500px] bg-background border border-border rounded-xl shadow-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh] text-white [&>button]:hidden sm:rounded-xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          
          <div className="px-6 pt-6 pb-4 flex flex-col gap-1 shrink-0">
            <div className="flex justify-between items-start">
              <h2 className="text-[16px] font-semibold text-white">Create Task</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white transition-colors p-1 rounded-md hover:bg-card" title="Close">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Only title is required.</p>
          </div>

          <div className="px-6 py-2 overflow-y-auto flex-1 flex flex-col gap-5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            
            {error && (
              <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                {error}
              </div>
            )}

            {(!projectId && projects.length > 0) ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Project</label>
                <Select value={selectedProjectId} onValueChange={(val) => setSelectedProjectId(val || '')} required>
                  <SelectTrigger className="w-full flex items-center gap-2 bg-card hover:border-input border border-border px-3 py-2 rounded-md transition-colors text-[13px] text-white focus:ring-0 focus:border-input h-auto">
                    <SelectValue placeholder="Select a project">
                      {selectedProjectId ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: getProjectColor(selectedProjectId), boxShadow: `0 0 8px ${getProjectColor(selectedProjectId)}80` }} />
                          {projects.find(p => p.id === selectedProjectId)?.name}
                        </div>
                      ) : 'Select a project'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-white">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getProjectColor(p.id) }} />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-muted-foreground" htmlFor="title">Title <span className="text-muted-foreground">*</span></label>
              <div className="bg-card border border-border rounded-md transition-all focus-within:border-[#333]">
                <input 
                  id="title"
                  name="title"
                  type="text" 
                  className="w-full bg-transparent text-[13px] text-white px-3 py-2 placeholder:text-muted-foreground outline-none"
                  placeholder="What needs to be done?"
                  required
                  autoFocus={!!projectId}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-muted-foreground" htmlFor="description">Description</label>
              <div className="bg-card border border-border rounded-md transition-all focus-within:border-[#333] flex">
                <textarea 
                  id="description"
                  name="description"
                  className="w-full bg-transparent text-[13px] text-white px-3 py-2 placeholder:text-muted-foreground outline-none min-h-[100px] resize-y"
                  placeholder="Add details..."
                ></textarea>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Assignee</label>
              <div className="flex items-center justify-between gap-3">
                <Select value={assignee} onValueChange={(val) => setAssignee(val || 'unassigned')}>
                  <SelectTrigger className="w-full flex items-center justify-between bg-card hover:border-input border border-border px-3 py-2 rounded-md transition-colors text-[13px] text-white focus:ring-0 focus:border-input h-auto">
                    <SelectValue placeholder="Unassigned">
                      {assignee === 'unassigned' ? 'Unassigned' : users.find(u => u.id === assignee)?.full_name || 'Unassigned'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-white">
                    <SelectItem value="unassigned" className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="relative">
                  <input
                    id="files"
                    type="file"
                    multiple
                    ref={fileInputRef}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                    title="Attach file"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setSelectedFiles(prev => [...prev, ...newFiles]);
                      }
                      // Reset value to allow selecting the same file again if removed
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  />
                  <button type="button" className="text-muted-foreground hover:text-white transition-colors p-2 rounded-md hover:bg-card relative z-0 border border-border bg-background" title="Attach file">
                    <Paperclip className="h-[14px] w-[14px]" />
                  </button>
                </div>
              </div>
              
              {selectedFiles.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl pl-4 pr-1.5 py-1.5">
                      <span className="text-xs text-white/80 truncate pr-4">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-white/40 hover:text-rose-400 p-1 rounded-md hover:bg-white/5 transition-colors shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button 
                type="button" 
                onClick={() => setShowMore(!showMore)} 
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-white transition-colors font-medium uppercase tracking-wider"
              >
                {showMore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <span>{showMore ? 'Less options' : 'More options'}</span>
              </button>
            </div>

            {showMore && (
              <div className="flex flex-col gap-5 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground">Priority</label>
                    <Select value={priority} onValueChange={(val) => setPriority(val || 'Medium')}>
                      <SelectTrigger className="w-full flex items-center justify-between bg-card hover:border-input border border-border px-3 py-2 rounded-md transition-colors text-[13px] text-white focus:ring-0 focus:border-input h-auto">
                        <SelectValue placeholder="Priority">
                          {priority}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-white">
                        <SelectItem value="Low" className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">Low</SelectItem>
                        <SelectItem value="Medium" className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">Medium</SelectItem>
                        <SelectItem value="High" className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">High</SelectItem>
                        <SelectItem value="Critical" className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground">Status</label>
                    <Select 
                      value={statusId} 
                      onValueChange={(val) => setStatusId(val || '')}
                      onOpenChange={(open) => {
                        if (!open) setShowAllStatuses(false);
                      }}
                    >
                      <SelectTrigger className="w-full flex items-center justify-between bg-card hover:border-input border border-border px-3 py-2 rounded-md transition-colors text-[13px] text-white focus:ring-0 focus:border-input h-auto">
                        <SelectValue placeholder="Select status">
                          {statuses.find(s => s.id === statusId)?.name || 'Select status'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-white">
                        {displayedStatuses.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="focus:bg-accent focus:text-white cursor-pointer text-[13px]">{s.name}</SelectItem>
                        ))}
                        {otherStatuses.length > 0 && (
                          <button 
                            type="button" 
                            className="w-full text-[12px] h-8 flex items-center px-2 text-muted-foreground hover:text-white hover:bg-accent transition-colors mt-1 rounded" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowAllStatuses(!showAllStatuses);
                            }}
                          >
                            {showAllStatuses ? "Less statuses..." : "More statuses..."}
                          </button>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground" htmlFor="deadline">Deadline</label>
                  <div className="flex items-center justify-between bg-card hover:border-input border border-border px-3 py-2 rounded-md transition-colors group relative">
                    <input 
                      type="date" 
                      name="deadline" 
                      id="deadline" 
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span className={`text-[13px] ${deadline ? "text-white" : "text-muted-foreground"} pointer-events-none`}>
                      {deadline ? new Date(deadline).toLocaleDateString() : "Select a date"}
                    </span>
                    <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-[#777] transition-colors pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pb-4">
                  <label className="text-sm text-white/90">Checklist Items</label>
                  
                  {checklists.length > 0 && (
                    <div className="flex flex-col gap-2 mb-2">
                      {checklists.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl pl-4 pr-1.5 py-1.5">
                          <span className="text-sm text-white/80">{item}</span>
                          <button 
                            type="button" 
                            onClick={() => setChecklists(prev => prev.filter((_, i) => i !== idx))}
                            className="text-white/40 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center bg-white/5 border border-white/5 rounded-xl transition-all focus-within:border-white/20 focus-within:bg-white/10 pl-4 pr-1.5 py-1.5">
                    <input 
                      type="text" 
                      value={newChecklist}
                      onChange={(e) => setNewChecklist(e.target.value)}
                      className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
                      placeholder="Add an item..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newChecklist.trim()) {
                            setChecklists(prev => [...prev, newChecklist.trim()]);
                            setNewChecklist("");
                          }
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        if (newChecklist.trim()) {
                          setChecklists(prev => [...prev, newChecklist.trim()]);
                          setNewChecklist("");
                        }
                      }}
                      disabled={!newChecklist.trim()}
                      className="text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors font-medium shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0 mt-auto bg-background">
            <button 
              type="button" 
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 text-[13px] text-muted-foreground hover:text-white hover:bg-card transition-colors rounded-md font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#858CE9] hover:bg-[#7a81d4] transition-colors rounded-md disabled:opacity-50 flex items-center justify-center min-w-[100px]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Create Task"
              )}
            </button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
