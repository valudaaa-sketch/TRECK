"use client"

import { useState, useEffect } from "react"
import { createProjectDocument } from "@/app/(app)/projects/actions"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface CreateVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  parentId: string
  nextVersionNumber: number
  originalTitle: string
  originalContent: string
  originalReference: string
  onSuccess: () => void
}

export function CreateVersionDialog({
  open,
  onOpenChange,
  projectId,
  parentId,
  nextVersionNumber,
  originalTitle,
  originalContent,
  originalReference,
  onSuccess
}: CreateVersionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use state to manage form fields so we can pre-fill them
  const [title, setTitle] = useState(originalTitle)
  const [content, setContent] = useState(originalContent)
  const [reference, setReference] = useState(originalReference)

  // Reset fields when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(originalTitle)
      setContent(originalContent)
      setReference(originalReference)
      setError(null)
    }
  }, [open, originalTitle, originalContent, originalReference])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append("projectId", projectId)
      formData.append("parentId", parentId)
      formData.append("version", nextVersionNumber.toString())
      formData.append("title", title)
      formData.append("content", content)
      if (reference) {
        formData.append("reference", reference)
      }

      await createProjectDocument(formData)
      toast.success(`Version ${nextVersionNumber} created successfully`)
      onSuccess()
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to create version")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] gap-6 p-6">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Create Version {nextVersionNumber}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document Title"
              required
              className="text-lg font-medium border-0 px-0 rounded-none border-b focus-visible:ring-0 focus-visible:border-primary shadow-none"
            />
          </div>

          <div className="space-y-2">
            <Input
              id="reference"
              name="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="External Reference URL or ID (Optional)"
              className="text-sm border-0 px-0 rounded-none border-b focus-visible:ring-0 focus-visible:border-primary shadow-none text-white/70"
            />
          </div>

          <div className="space-y-2">
            <Textarea
              id="content"
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your notes here..."
              className="h-[400px] resize-none border-0 px-0 focus-visible:ring-0 shadow-none text-base overflow-y-auto"
            />
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <DialogFooter className="pt-4 border-t flex justify-between items-center sm:justify-between">
            <div>
              <span className="text-xs text-white/40">This will be saved as a new version. The previous version will be kept.</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Version"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
