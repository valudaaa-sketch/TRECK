"use server"

import { createClient } from "@/utils/supabase/server"

export type SearchResult = {
  id: string
  type: 'task' | 'document' | 'file' | 'comment'
  title: string
  description?: string
  url: string
}

export async function searchProject(projectId: string, query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const searchQuery = `%${query.trim()}%`
  const results: SearchResult[] = []

  // 1. Search Tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description')
    .eq('project_id', projectId)
    .is('archived_at', null)
    .or(`title.ilike.${searchQuery},description.ilike.${searchQuery}`)
    .limit(5)

  if (tasks) {
    tasks.forEach(t => results.push({
      id: t.id,
      type: 'task',
      title: t.title,
      description: t.description || undefined,
      url: `/tasks/${t.id}`
    }))
  }

  // 2. Search Documents
  const { data: docs } = await supabase
    .from('project_documents')
    .select('id, title, content')
    .eq('project_id', projectId)
    .or(`title.ilike.${searchQuery},content.ilike.${searchQuery}`)
    .limit(5)

  if (docs) {
    docs.forEach(d => results.push({
      id: d.id,
      type: 'document',
      title: d.title,
      description: d.content ? (d.content.length > 60 ? d.content.substring(0, 60) + '...' : d.content) : undefined,
      url: `/?tab=files&projectId=${projectId}`
    }))
  }

  // 3. Search Files
  const { data: files } = await supabase
    .from('files')
    .select('id, file_name')
    .eq('project_id', projectId)
    .is('archived_at', null)
    .ilike('file_name', searchQuery)
    .limit(5)

  if (files) {
    files.forEach(f => results.push({
      id: f.id,
      type: 'file',
      title: f.file_name,
      description: 'Project File',
      url: `/?tab=files&projectId=${projectId}`
    }))
  }

  // 4. Search Comments
  const { data: comments } = await supabase
    .from('comments')
    .select('id, content, task_id, tasks!inner(project_id, title)')
    .eq('tasks.project_id', projectId)
    .is('archived_at', null)
    .ilike('content', searchQuery)
    .limit(5)

  if (comments) {
    comments.forEach((c: any) => results.push({
      id: c.id,
      type: 'comment',
      title: `Comment on ${c.tasks?.title || 'a task'}`,
      description: c.content.length > 60 ? c.content.substring(0, 60) + '...' : c.content,
      url: `/tasks/${c.task_id}`
    }))
  }

  return results
}
