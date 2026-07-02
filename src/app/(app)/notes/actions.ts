"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function addNote(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const content = formData.get("content") as string
  const projectId = formData.get("projectId") as string
  if (!content?.trim()) throw new Error("Note cannot be empty")
  if (!projectId) throw new Error("Project ID is required")

  const { error } = await supabase.from("shared_notes").insert({
    content: content.trim(),
    project_id: projectId,
    created_by: user.id
  })

  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath("/")
  return { success: true }
}

export async function archiveNote(noteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase.from("shared_notes")
    .update({ archived_at: new Date().toISOString(), archived_by: user.id })
    .eq("id", noteId)
    .is("archived_at", null)

  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath("/")
  return { success: true }
}

export async function toggleNoteCheck(noteId: string, isChecked: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase.from("shared_notes")
    .update({ is_checked: isChecked })
    .eq("id", noteId)

  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath("/")
  return { success: true }
}
