"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Archive, Settings, Download } from "lucide-react"
import { editProject, archiveProject, exportProjectData } from "@/app/(app)/projects/actions"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function EditProjectDialog({
  project,
  userRole,
  isDropdown = false,
  triggerType = 'manage'
}: {
  project: any
  userRole: string
  isDropdown?: boolean
  triggerType?: 'manage' | 'description' | 'dropdown' | 'settings-icon'
}) {
  const [open, setOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const [status, setStatus] = useState<string>(project.status || 'Active')

  if (userRole !== "Admin") {
    return null
  }

  async function onSubmit(formData: FormData) {
    setIsLoading(true)
    formData.append("id", project.id)
    formData.append("status", status)
    try {
      await editProject(formData)
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleArchive() {
    setIsLoading(true)
    try {
      // 1. Export Data first
      const exportData = await exportProjectData(project.id)
      
      // Trigger download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `project_${project.name.replace(/\s+/g, '_').toLowerCase()}_export.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // 2. Archive
      await archiveProject(project.id)
      setArchiveOpen(false)
      router.push("/")
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {(isDropdown || triggerType === 'dropdown' || triggerType === 'settings-icon') ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              triggerType === 'settings-icon' ? (
                <button className="text-muted-foreground hover:text-white transition-colors outline-none">
                  <Settings className="w-4 h-4" />
                </button>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" />
              )
            }
          >
            {triggerType === 'settings-icon' ? (
              <Settings className="w-4 h-4" />
            ) : (
              <>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setArchiveOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              triggerType === 'description' ? (
                <button className="text-[11px] text-muted-foreground hover:text-white font-medium transition-colors border border-border bg-transparent hover:bg-card px-3 py-1.5 rounded-lg flex items-center outline-none">
                  Edit Description
                </button>
              ) : (
                <Button variant="outline" className="bg-card border-border text-muted-foreground hover:text-white hover:bg-accent">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Project
                </Button>
              )
            }
          >
            {triggerType === 'description' ? 'Edit Description' : (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Manage Project
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setArchiveOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Edit Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] bg-background border border-border text-white">
          <form action={onSubmit}>
            <DialogHeader>
              <DialogTitle>
                {triggerType === 'description' ? 'Edit Description' : 'Edit Project'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {triggerType === 'description' ? 'Update the project description below.' : 'Update project details below.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {triggerType !== 'description' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-muted-foreground">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={project.name}
                      required
                      className="bg-transparent border-border text-white focus-visible:ring-0 focus-visible:border-[#858ce9]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo_url" className="text-muted-foreground">Logo Emoji or URL (Optional)</Label>
                    <Input
                      id="logo_url"
                      name="logo_url"
                      defaultValue={project.logo_url || ""}
                      placeholder="e.g. 🚀 or https://example.com/logo.png"
                      className="bg-transparent border-border text-white focus-visible:ring-0 focus-visible:border-[#858ce9]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-muted-foreground">Status</Label>
                    <Select value={status} onValueChange={(val) => setStatus(val || 'Active')} required>
                      <SelectTrigger className="bg-transparent border-border text-white focus:ring-0 focus:border-[#858ce9]">
                        <SelectValue placeholder="Select status">
                          {status || 'Select status'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-white">
                        <SelectItem value="Active" className="focus:bg-accent focus:text-white cursor-pointer">Active</SelectItem>
                        <SelectItem value="On Hold" className="focus:bg-accent focus:text-white cursor-pointer">On Hold</SelectItem>
                        <SelectItem value="Completed" className="focus:bg-accent focus:text-white cursor-pointer">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="description" className="text-muted-foreground">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={project.description || ""}
                  className="min-h-[100px] bg-transparent border-border text-muted-foreground focus-visible:ring-0 focus-visible:border-[#858ce9]"
                />
              </div>

              {triggerType !== 'description' && (
                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-muted-foreground">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    name="tags"
                    defaultValue={project.tags ? project.tags.join(", ") : ""}
                    placeholder="e.g. frontend, high-priority, q3"
                    className="bg-transparent border-border text-muted-foreground focus-visible:ring-0 focus-visible:border-[#858ce9]"
                  />
                </div>
              )}
            </div>
            <DialogFooter className="border-t border-border pt-4 mt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white hover:bg-card">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-[#858ce9] text-white hover:bg-[#7a81d4]">
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive <span className="font-semibold">{project.name}</span>? 
              Archived projects are hidden from the active views but can be restored later.
              <br/><br/>
              <strong>Note:</strong> Archiving will automatically download a full backup of the project's data (tasks, comments, etc.) to your device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={isLoading}>
              {isLoading ? "Archiving..." : <><Download className="h-4 w-4 mr-2" /> Archive & Export</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
