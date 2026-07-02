"use client"

import { useState } from "react"
import { Clock, FileText, X, ChevronDown, Plus, Link as LinkIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CreateVersionDialog } from "./create-version-dialog"

interface DocumentRow {
  id: string
  project_id: string
  title: string
  content: string | null
  reference: string | null
  version: number
  parent_id: string | null
  updated_at: string
  author?: { full_name: string } | null
}

interface DocumentViewerProps {
  documentGroup: DocumentRow[];
  projectId: string;
  children: React.ReactNode;
}

export function DocumentViewerDialog({ documentGroup, projectId, children }: DocumentViewerProps) {
  const [open, setOpen] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState(documentGroup[0]?.id)
  const [showCreateVersion, setShowCreateVersion] = useState(false)

  // When dialog opens, default to the latest version (which is the first item since we ordered by version desc)
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && documentGroup.length > 0) {
      setSelectedVersionId(documentGroup[0].id)
    }
  }

  const currentDoc = documentGroup.find(d => d.id === selectedVersionId) || documentGroup[0]
  const latestVersionNumber = documentGroup[0]?.version || 1
  const parentId = currentDoc.parent_id || currentDoc.id

  if (!currentDoc) return <>{children}</>

  return (
    <>
      <div onClick={() => handleOpenChange(true)} className="cursor-pointer h-full flex-1 flex flex-col">
        {children}
      </div>
      
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden bg-black border-white/10">
          <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-xl font-semibold text-white/90 flex items-start gap-3 flex-1">
                <FileText className="h-6 w-6 text-white/40 shrink-0 mt-0.5" />
                <span className="break-words">{currentDoc.title}</span>
              </DialogTitle>
              
              <div className="flex items-center gap-2 shrink-0">
                {documentGroup.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border shadow-sm h-8 px-3 gap-2 bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white">
                        Version {currentDoc.version}
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[150px]">
                      {documentGroup.map((doc) => (
                        <DropdownMenuItem 
                          key={doc.id}
                          onClick={() => setSelectedVersionId(doc.id)}
                          className={doc.id === currentDoc.id ? "bg-white/10" : ""}
                        >
                          Version {doc.version}
                          {doc.id === documentGroup[0].id && " (Latest)"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                <Button 
                  onClick={() => setShowCreateVersion(true)}
                  size="sm" 
                  className="h-8 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Version
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-3 text-xs text-white/40">
              {currentDoc.reference && (
                <div className="flex items-center gap-1.5 text-blue-400">
                  <LinkIcon className="h-3.5 w-3.5" />
                  <a href={currentDoc.reference} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                    {currentDoc.reference}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-4">
                <span>By {(currentDoc.author as any)?.full_name || "Unknown"}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(currentDoc.updated_at).toLocaleString()}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v{currentDoc.version}
                </span>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="prose prose-invert max-w-none text-white/80 whitespace-pre-wrap leading-relaxed text-sm">
              {currentDoc.content || <span className="italic text-white/30">Empty document</span>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateVersionDialog 
        open={showCreateVersion}
        onOpenChange={setShowCreateVersion}
        projectId={projectId}
        parentId={parentId}
        nextVersionNumber={latestVersionNumber + 1}
        originalTitle={documentGroup[0].title}
        originalContent={documentGroup[0].content || ""}
        originalReference={documentGroup[0].reference || ""}
        onSuccess={() => {
          setShowCreateVersion(false);
        }}
      />
    </>
  )
}
