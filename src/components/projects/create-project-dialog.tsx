"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { createProject } from "@/app/(app)/projects/actions"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function CreateProjectDialog({ trigger }: { trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set("name", name)
      formData.set("description", description)
      formData.set("logo_url", logoUrl)
      formData.set("tags", tags)
      await createProject(formData)
      setOpen(false)
      // Reset fields
      setName("")
      setLogoUrl("")
      setDescription("")
      setTags("")
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <button className="text-xs bg-white text-black hover:bg-gray-100 px-3 py-1 rounded-full border border-transparent font-medium flex items-center gap-1 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <Plus className="h-3 w-3 stroke-[3]" /> New
            </button>
          )
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] text-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white/90">Create Project</DialogTitle>
            <DialogDescription className="text-white/40">
              Add a new project to track your team&apos;s work.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/80">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Website Redesign"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border-white/10 focus-visible:ring-white/20 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url" className="text-white/80">Logo Emoji or URL (Optional)</Label>
              <Input
                id="logo_url"
                name="logo_url"
                placeholder="e.g. 🚀 or https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="bg-white/5 border-white/10 focus-visible:ring-white/20 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white/80">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What is this project about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 focus-visible:ring-white/20 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-white/80">Tags (Optional)</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="e.g. marketing, frontend, q3"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="bg-white/5 border-white/10 focus-visible:ring-white/20 text-white placeholder:text-white/30"
              />
              <p className="text-[0.8rem] text-white/40">
                Separate tags with commas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-white text-black hover:bg-gray-100 rounded-full font-semibold shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
