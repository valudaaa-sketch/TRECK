"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { createProjectDocument } from "@/app/(app)/projects/actions"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function CreateDocumentDialog({ projectId, onSuccess }: { projectId: string, onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    
    try {
      await createProjectDocument(formData)
      setOpen(false)
      if (onSuccess) onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className="flex items-center gap-1.5 text-[12px] text-[#858ce9] hover:text-[#7a81d4] font-medium transition-colors whitespace-nowrap bg-transparent border-0 px-0 outline-none">
          <Plus className="w-3.5 h-3.5" />
          Add Doc
        </button>
      } />
      <DialogContent className="sm:max-w-[600px] gap-6 p-6 bg-background border border-border text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Document</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          
          <div className="space-y-2">
            <Input
              id="title"
              name="title"
              placeholder="Document Title"
              required
              className="text-lg font-medium border-0 px-0 rounded-none border-b border-border bg-transparent text-white focus-visible:ring-0 focus-visible:border-[#858ce9] shadow-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Input
              id="reference"
              name="reference"
              placeholder="External Reference URL or ID (Optional)"
              className="text-sm border-0 px-0 rounded-none border-b border-border bg-transparent text-muted-foreground focus-visible:ring-0 focus-visible:border-[#858ce9] shadow-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Textarea
              id="content"
              name="content"
              placeholder="Start typing your notes here..."
              className="h-[300px] resize-none border-0 px-0 bg-transparent text-muted-foreground focus-visible:ring-0 shadow-none text-base overflow-y-auto placeholder:text-muted-foreground"
            />
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <DialogFooter className="pt-4 border-t border-border flex justify-between items-center sm:justify-between">
            <div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="text-muted-foreground hover:text-white hover:bg-card" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-[#858ce9] text-white hover:bg-[#7a81d4]">
                {isLoading ? "Saving..." : "Save Document"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
