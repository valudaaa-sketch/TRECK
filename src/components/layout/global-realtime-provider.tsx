"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export function GlobalRealtimeProvider({ children, projectId }: { children: React.ReactNode, projectId?: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timeoutId: NodeJS.Timeout

    const handleRealtimeEvent = () => {
      // Debounce refresh to prevent rapid-fire requests
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        router.refresh()
      }, 500)
    }

    let channel = supabase.channel('global_sync')

    if (projectId) {
      const filter = `project_id=eq.${projectId}`
      channel = channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter }, handleRealtimeEvent)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, handleRealtimeEvent)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_documents', filter }, handleRealtimeEvent)
        // comments, files, task_checklists, activity_logs don't have project_id directly on them in all schemas, 
        // so we omit them from global sync to prevent the waterfall of updates from other projects.
        // If they have project_id, we can add them back later.
    } else {
      // If no project is selected, just listen to projects for dashboard updates
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, handleRealtimeEvent)
    }

    channel.subscribe()

    return () => {
      clearTimeout(timeoutId)
      supabase.removeChannel(channel)
    }
  }, [router])

  return <>{children}</>
}
