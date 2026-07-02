'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Paperclip, Loader2, X, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface FileUploaderProps {
  projectId?: string
  taskId?: string
  onUploadSuccess?: () => void
}

export function FileUploader({ projectId, taskId, onUploadSuccess }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('File exceeds 5MB limit.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      // Generate a unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${projectId || 'general'}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Record in the database
      const { error: dbError } = await supabase.from('files').insert({
        project_id: projectId || null,
        task_id: taskId || null,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: userData.user.id,
      })

      if (dbError) throw dbError

      // Log activity
      await supabase.from('activity_logs').insert({
        entity_type: 'file',
        entity_id: taskId || projectId || userData.user.id,
        user_id: userData.user.id,
        action: 'file_uploaded',
        new_value: { file_name: file.name, file_path: filePath, task_id: taskId, project_id: projectId },
      })

      if (onUploadSuccess) onUploadSuccess()
      toast.success('File uploaded successfully')
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
      // Reset the input
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="relative overflow-hidden group">
        <button
          className="flex items-center gap-1.5 text-[12px] text-[#858ce9] hover:text-[#7a81d4] font-medium transition-colors whitespace-nowrap bg-transparent px-0 border-0 outline-none"
          disabled={isUploading}
          title="Upload file (Max 5MB)"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          )}
          {isUploading ? 'Uploading...' : 'Add File'}
        </button>
        <input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-default"
          title="Attach file (Max 5MB)"
          onChange={handleUpload}
          disabled={isUploading}
        />
      </div>
      {error && <p className="text-[10px] text-rose-400 absolute top-full mt-1 right-0 whitespace-nowrap">{error}</p>}
    </div>
  )
}
