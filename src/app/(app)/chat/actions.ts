"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function sendMessage(projectId: string, content: string, receiverId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  if (!content?.trim()) throw new Error("Message cannot be empty")
  if (!projectId) throw new Error("Project ID is required")

  const payload: any = {
    project_id: projectId,
    content: content.trim(),
    sender_id: user.id
  }

  if (receiverId && receiverId !== 'general') {
    payload.receiver_id = receiverId
  }

  const { error } = await supabase.from("chat_messages").insert(payload)

  if (error) {
    return { success: false, error: error.message }
  }
  
  // We don't necessarily need to revalidatePath here if we are relying on Realtime
  // but it's good practice for non-realtime fallback.
  revalidatePath("/")
  return { success: true }
}

export async function getInitialMessages(projectId: string, receiverId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from("chat_messages")
    .select("*, sender:users!chat_messages_sender_id_fkey(id, full_name, avatar_url)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(100)

  if (receiverId && receiverId !== 'general') {
    // For DMs, get messages where (sender=me AND receiver=them) OR (sender=them AND receiver=me)
    query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
  } else {
    // For general chat, get messages where receiver_id is null
    query = query.is("receiver_id", null)
  }

  const { data, error } = await query
  
  if (error) {
    console.error("Error fetching messages:", error)
    return []
  }

  return data || []
}
