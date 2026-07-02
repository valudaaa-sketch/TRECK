import { ProjectDocuments } from "@/components/projects/project-documents";
import { FileList } from "@/components/files/file-list";
import { FileUploader } from "@/components/files/file-uploader";
import { ClientOnly } from "@/components/client-only";
import { Loader2, AlignLeft, Paperclip, Calendar, User } from "lucide-react";

export function FilesAndDocsTab({ 
  project, 
  userRole,
}: { 
  project: any, 
  userRole: string,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-full pb-10">

      {/* Left: Docs & Files + Activity (2/3 width) */}
      <div className="lg:col-span-2 flex flex-col gap-6">

        {/* Documentation */}
        <div className="bg-transparent border border-border rounded-xl p-5 relative overflow-hidden">
          <ClientOnly fallback={
            <div className="w-full flex flex-col">
              <div className="h-4 w-16 bg-white/5 animate-pulse rounded-md mb-4"></div>
              <div className="h-32 bg-white/5 animate-pulse rounded-xl mt-2"></div>
            </div>
          }>
            <ProjectDocuments projectId={project.id} />
          </ClientOnly>
        </div>

        {/* Files */}
        <div className="bg-transparent border border-border rounded-xl p-5 relative overflow-hidden">
          <ClientOnly fallback={<div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-white/30" /></div>}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" />
                FILES
              </h3>
              <FileUploader projectId={project.id} />
            </div>
            <FileList projectId={project.id} />
          </ClientOnly>
        </div>

      </div>

      {/* Right: Project Brief (1/3 width) */}
      <div className="flex flex-col gap-4">
        <div className="bg-transparent border border-border rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <AlignLeft className="w-3.5 h-3.5" />
              PROJECT BRIEF
            </h3>
          </div>

          {/* Status Badge */}
          <div className="mb-4">
            {project.status === "Active" ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 w-fit rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium tracking-wide uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                Active
              </span>
            ) : project.status === "On Hold" ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 w-fit rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium tracking-wide uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                On Hold
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 w-fit rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium tracking-wide uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                {project.status || 'Completed'}
              </span>
            )}
          </div>

          <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {project.description || <span className="italic text-muted-foreground/50">No description provided.</span>}
          </p>

          {/* Meta info */}
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-2">
            {project.users?.full_name && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <User className="w-3 h-3" />
                <span>Created by <span className="text-white/70">{project.users.full_name}</span></span>
              </div>
            )}
            {project.created_at && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{new Date(project.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
