"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { FileText, Clock, Link as LinkIcon } from "lucide-react"
import { CreateDocumentDialog } from "./create-document-dialog"
import { DeleteDocumentButton } from "./delete-document-button"
import { DocumentViewerDialog } from "./document-viewer-dialog"
import { formatDistanceToNow } from "date-fns"

interface DocumentRow {
  id: string
  project_id: string
  title: string
  content: string | null
  reference: string | null
  version: number
  parent_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  archived_at: string | null
  author: { full_name: string } | null
}

export function ProjectDocuments({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*, author:users(full_name)")
        .eq("project_id", projectId)
        .is("archived_at", null)
        .order("version", { ascending: false })
        .order("updated_at", { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error("Error fetching documents:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()

    // Realtime subscription for project_documents
    const channel = supabase
      .channel('project_documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_documents',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchDocuments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  // Group documents by parent_id || id
  const groupedDocuments = documents.reduce((acc, doc) => {
    const groupId = doc.parent_id || doc.id
    if (!acc[groupId]) {
      acc[groupId] = []
    }
    acc[groupId].push(doc)
    return acc
  }, {} as Record<string, DocumentRow[]>)

  // Convert to array of groups, and sort groups by the latest updated_at
  const documentGroups = Object.values(groupedDocuments).sort((a, b) => {
    // a[0] is the latest version because we ordered by version desc in fetch
    return new Date(b[0].updated_at).getTime() - new Date(a[0].updated_at).getTime()
  })

  if (loading) {
    return (
      <div className="w-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            DOCUMENTATION
          </h3>
          <div className="h-8 w-24 bg-white/5 animate-pulse rounded-md"></div>
        </div>
        <div className="h-32 bg-white/5 animate-pulse rounded-xl mt-2"></div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          DOCUMENTATION
        </h3>
        <CreateDocumentDialog projectId={projectId} onSuccess={fetchDocuments} />
      </div>

      {documentGroups.length === 0 ? (
        <div className="border border-dashed border-input rounded-lg p-5 flex flex-col items-center justify-center text-center">
          <span className="text-[12px] text-muted-foreground italic">
            No documents yet.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          {documentGroups.map((versions) => {
            const latestDoc = versions[0]
            return (
              <div key={latestDoc.id} className="group relative flex flex-row items-center gap-4 p-2 rounded-lg bg-transparent hover:bg-card transition-colors border border-transparent hover:border-border">
                <div className="absolute top-1/2 -translate-y-1/2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                  <DeleteDocumentButton documentId={latestDoc.id} onSuccess={fetchDocuments} />
                </div>
                <DocumentViewerDialog documentGroup={versions} projectId={projectId}>
                  <div className="flex items-center gap-4 w-full text-left">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-card border border-border flex items-center justify-center">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 pr-8">
                      <h3 className="text-[13px] font-medium text-white truncate group-hover:text-white transition-colors">
                        {latestDoc.title}
                      </h3>
                      <span className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                        Updated {formatDistanceToNow(new Date(latestDoc.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </DocumentViewerDialog>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
