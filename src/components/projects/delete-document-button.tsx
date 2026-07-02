"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { archiveProjectDocument } from "@/app/(app)/projects/actions"

export function DeleteDocumentButton({ documentId, onSuccess }: { documentId: string, onSuccess?: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm("⚠️ WARNING: Are you sure you want to delete this document?\n\nThis action cannot be undone.")) return
    setIsDeleting(true)
    try {
      await archiveProjectDocument(documentId)
      if (onSuccess) onSuccess()
    } catch (e) {
      console.error(e)
      alert("Failed to archive document.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button 
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handleDelete()
      }}
      disabled={isDeleting}
      className="h-7 w-7 flex items-center justify-center rounded border border-transparent hover:bg-rose-500/10 hover:border-rose-500/20 text-muted-foreground hover:text-rose-400 transition-all bg-background"
      title="Delete Document"
    >
      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
    </button>
  )
}
