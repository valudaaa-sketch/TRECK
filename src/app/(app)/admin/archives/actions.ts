"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export type ArchiveType = 'projects' | 'tasks' | 'comments' | 'project_documents' | 'shared_notes' | 'files'

export async function getArchivedItems(type: ArchiveType) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  let selectQuery = ""
  switch (type) {
    case 'projects':
      selectQuery = "id, name, archived_at"
      break
    case 'tasks':
    case 'project_documents':
      selectQuery = "id, title, archived_at, projects(name)"
      break
    case 'shared_notes':
      selectQuery = "id, content, archived_at"
      break
    case 'files':
      selectQuery = "id, file_name, archived_at, projects(name), tasks(projects(name))"
      break
    case 'comments':
      selectQuery = "id, content, archived_at, tasks(projects(name))"
      break
    default:
      selectQuery = "id, archived_at"
  }

  const { data, error } = await supabase
    .from(type)
    .select(selectQuery)
    .not("archived_at", "is", null)

  if (error) throw new Error(error.message)

  return (data || []).map((item: any) => {
    const archivedDate = new Date(item.archived_at)
    const daysSince = Math.floor((new Date().getTime() - archivedDate.getTime()) / (1000 * 3600 * 24))
    const daysUntilDeletion = Math.max(0, 15 - daysSince)
    
    let projectName = null
    if (type === 'comments') {
      projectName = item.tasks?.projects?.name
    } else if (type === 'files') {
      projectName = item.projects?.name || item.tasks?.projects?.name
    } else if (type === 'tasks' || type === 'project_documents') {
      projectName = item.projects?.name
    }

    return {
      id: item.id,
      name: item.name || item.title || item.file_name || item.content || 'Unknown',
      archived_at: item.archived_at,
      days_until_deletion: daysUntilDeletion,
      project_name: projectName || null
    }
  })
}

export async function restoreItem(type: ArchiveType, id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from(type)
    .update({ archived_at: null })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/archives")
}

export async function permanentlyDeleteItem(type: ArchiveType, id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  if (type === 'files') {
    const { data: fileData } = await supabase.from('files').select('file_path').eq('id', id).single()
    if (fileData?.file_path) {
      await supabase.storage.from('project-files').remove([fileData.file_path])
    }
  }

  const { error } = await supabase.from(type).delete().eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/archives")
}

export async function permanentlyDeleteProject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Fetch all tasks for this project
  const { data: tasks } = await supabase.from('tasks').select('id').eq('project_id', id)
  
  if (tasks && tasks.length > 0) {
    for (const task of tasks) {
      // Delete comments
      await supabase.from('comments').delete().eq('task_id', task.id)
      
      // Delete files
      const { data: files } = await supabase.from('files').select('id, file_path').eq('task_id', task.id)
      if (files && files.length > 0) {
        const filePaths = files.map(f => f.file_path).filter(Boolean) as string[]
        if (filePaths.length > 0) {
          await supabase.storage.from('project-files').remove(filePaths)
        }
        await supabase.from('files').delete().in('id', files.map(f => f.id))
      }
      
      // Delete task
      await supabase.from('tasks').delete().eq('id', task.id)
    }
  }

  // Delete project documents
  await supabase.from('project_documents').delete().eq('project_id', id)

  // Delete project
  await supabase.from('projects').delete().eq('id', id)

  revalidatePath("/admin/archives")
  revalidatePath("/projects")
}

export async function bulkDeleteItems(type: ArchiveType, ids: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  if (type === 'projects') {
    for (const id of ids) {
      await permanentlyDeleteProject(id)
    }
  } else {
    if (type === 'files') {
      const { data: filesData } = await supabase.from('files').select('file_path').in('id', ids)
      if (filesData && filesData.length > 0) {
        const filePaths = filesData.map(f => f.file_path).filter(Boolean) as string[]
        if (filePaths.length > 0) {
          await supabase.storage.from('project-files').remove(filePaths)
        }
      }
    }
    
    const { error } = await supabase.from(type).delete().in("id", ids)
    if (error) throw new Error(error.message)
  }

  revalidatePath("/admin/archives")
}


export async function cleanupExpiredArchives() {
  // Use a service role client to bypass RLS, since this could be run via a cron API route without user auth
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

  const types: ArchiveType[] = ['projects', 'tasks', 'comments', 'project_documents', 'shared_notes', 'files']
  
  const fifteenDaysAgo = new Date()
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
  const cutoffDateString = fifteenDaysAgo.toISOString()

  let hasErrors = false

  for (const type of types) {
    if (type === 'projects') {
      const { data: expiredProjects } = await supabase
        .from('projects')
        .select('id')
        .not('archived_at', 'is', null)
        .lt('archived_at', cutoffDateString)

      if (expiredProjects && expiredProjects.length > 0) {
        for (const project of expiredProjects) {
          const { data: tasks } = await supabase.from('tasks').select('id').eq('project_id', project.id)
          if (tasks && tasks.length > 0) {
            for (const task of tasks) {
              await supabase.from('comments').delete().eq('task_id', task.id)
              
              const { data: files } = await supabase.from('files').select('id, file_path').eq('task_id', task.id)
              if (files && files.length > 0) {
                const filePaths = files.map(f => f.file_path).filter(Boolean) as string[]
                if (filePaths.length > 0) await supabase.storage.from('project-files').remove(filePaths)
                await supabase.from('files').delete().in('id', files.map(f => f.id))
              }
              
              await supabase.from('tasks').delete().eq('id', task.id)
            }
          }
          await supabase.from('project_documents').delete().eq('project_id', project.id)
          await supabase.from('projects').delete().eq('id', project.id)
        }
      }
    } else if (type === 'files') {
      const { data: expiredFiles } = await supabase
        .from('files')
        .select('id, file_path')
        .not('archived_at', 'is', null)
        .lt('archived_at', cutoffDateString)
      
      if (expiredFiles && expiredFiles.length > 0) {
        const filePaths = expiredFiles.map(f => f.file_path).filter(Boolean) as string[]
        if (filePaths.length > 0) {
          await supabase.storage.from('project-files').remove(filePaths)
        }
        await supabase.from('files').delete().in('id', expiredFiles.map(f => f.id))
      }
    } else {
      const { error } = await supabase
        .from(type)
        .delete()
        .not('archived_at', 'is', null)
        .lt('archived_at', cutoffDateString)
        
      if (error) {
        console.error(`Error cleaning up ${type}:`, error)
        hasErrors = true
      }
    }
  }

  return { success: !hasErrors }
}
