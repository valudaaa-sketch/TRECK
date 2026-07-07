'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileIcon, Trash2, Download, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

interface FileListProps {
  projectId?: string
  taskId?: string
}

export function FileList({ projectId, taskId }: FileListProps) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const supabase = createClient()

  const fetchFiles = async () => {
    try {
      let query = supabase
        .from('files')
        .select(`
          *,
          uploaded_by_user:users!files_uploaded_by_fkey(full_name),
          task:tasks(title)
        `)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      if (taskId) {
        query = query.eq('task_id', taskId)
      } else if (projectId) {
        query = query.eq('project_id', projectId)
      } else {
        return
      }

      const { data, error } = await query
      if (error) throw error
      setFiles(data || [])
    } catch (err) {
      console.error('Error fetching files:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id)
        supabase.from('users').select('role').eq('id', data.user.id).single().then(({ data: profile }) => {
          if (profile) setCurrentUserRole(profile.role)
        })
      }
    })
    fetchFiles()

    // Realtime subscription for new files
    const channel = supabase
      .channel('files_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: taskId ? `task_id=eq.${taskId}` : `project_id=eq.${projectId}`,
        },
        () => {
          fetchFiles()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, taskId])

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(filePath, 60)

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      console.error('Error downloading file:', err)
    }
  }

  const handleDelete = async (id: string, filePath: string, fileName: string, fileTaskId?: string) => {
    if (!confirm('⚠️ WARNING: Are you sure you want to delete this file?\n\nThis action cannot be undone.')) return

    try {
      // Soft delete from db
      const { error: dbError } = await supabase
        .from('files')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
      
      if (dbError) throw dbError

      // Log activity to generic file feed
      if (currentUserId) {
        await supabase.from("activity_logs").insert({
          entity_type: "file",
          entity_id: taskId || projectId || currentUserId,
          user_id: currentUserId,
          action: "file_deleted",
          previous_value: { file_name: fileName, file_path: filePath }
        })

        // Also log to task feed if applicable
        const targetTaskId = taskId || fileTaskId
        if (targetTaskId) {
          await supabase.from("activity_logs").insert({
            entity_type: "task",
            entity_id: targetTaskId,
            user_id: currentUserId,
            action: "file_deleted",
            previous_value: { file_name: fileName, file_path: filePath }
          })
        }
      }

      // Optimistic update
      setFiles((prev) => prev.filter(f => f.id !== id))
    } catch (err) {
      console.error('Error deleting file:', err)
      alert('Failed to delete file.')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  if (loading) {
    return <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-white/30" /></div>
  }

  if (files.length === 0) {
    return (
      <div className="border border-dashed border-input rounded-lg p-5 flex flex-col items-center justify-center text-center">
        <span className="text-[12px] text-muted-foreground italic">No files attached.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      {files.map((file) => {
        const isImage = file.file_name.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) != null;
        return (
          <div
            key={file.id}
            className="group relative flex flex-row items-center gap-4 p-2 rounded-lg bg-transparent hover:bg-card transition-colors border border-transparent hover:border-border"
          >
            <div className="flex items-center gap-4 w-full text-left">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-card border border-border flex items-center justify-center">
                {isImage ? (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0 pr-20">
                <span className="text-[13px] font-medium truncate text-white" title={file.file_name}>
                  {file.file_name}
                </span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium truncate flex items-center gap-2">
                  <span>{formatFileSize(file.file_size)} • {file.uploaded_by_user?.full_name}</span>
                  {!taskId && file.task && (
                    <span className="bg-[#858CE9]/10 text-[#858CE9] px-1.5 py-0.5 rounded text-[9px] truncate" title={`Task: ${file.task.title}`}>
                      Task: {file.task.title}
                    </span>
                  )}
                  {!taskId && !file.task && (
                    <span className="bg-white/5 text-white/50 px-1.5 py-0.5 rounded text-[9px]">
                      Project Resource
                    </span>
                  )}
                </span>
              </div>
            </div>
            
            <div className="absolute top-1/2 -translate-y-1/2 right-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10 flex gap-1">
              <button
                className="h-7 w-7 flex items-center justify-center rounded border border-transparent hover:bg-accent hover:border-input text-muted-foreground hover:text-white transition-all bg-background"
                onClick={() => handleDownload(file.file_path, file.file_name)}
                title="Download"
              >
                <Download className="h-3 w-3" />
              </button>
              {(currentUserId === file.uploaded_by || currentUserRole === 'Admin') && (
                <button
                  className="h-7 w-7 flex items-center justify-center rounded border border-transparent hover:bg-rose-500/10 hover:border-rose-500/20 text-muted-foreground hover:text-rose-400 transition-all bg-background"
                  onClick={() => handleDelete(file.id, file.file_path, file.file_name, file.task_id)}
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
