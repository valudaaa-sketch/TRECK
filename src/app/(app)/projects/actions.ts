"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"

export async function setActiveProjectCookie(projectId: string) {
  const cookieStore = await cookies()
  cookieStore.set('treck_last_project_id', projectId, { path: '/', maxAge: 60 * 60 * 24 * 30 })
}

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const logo_url = (formData.get("logo_url") as string) || null
  const tagsStr = formData.get("tags") as string
  const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()) : []

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      description,
      logo_url,
      tags,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Log activity
  await supabase.from("activity_logs").insert({
    entity_type: "project",
    entity_id: data.id,
    user_id: user.id,
    action: "project_created",
    new_value: { name }
  })

  revalidatePath("/projects")
  return data
}

export async function archiveProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Check admin role
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "Admin") {
    throw new Error("Only admins can archive projects")
  }

  // Soft delete logic
  const { error } = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", projectId)

  if (error) {
    throw new Error(error.message)
  }

  // Delete all user memberships for this project to cleanly disconnect it
  await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)

  // Log activity
  await supabase.from("activity_logs").insert({
    entity_type: "project",
    entity_id: projectId,
    user_id: user.id,
    action: "project_archived",
  })

  revalidatePath("/projects")
  revalidatePath(`/projects/${projectId}`)
}

export async function editProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Check admin role
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "Admin") {
    throw new Error("Only admins can edit projects")
  }

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const logo_url = (formData.get("logo_url") as string) || null
  const status = formData.get("status") as string
  const tagsStr = formData.get("tags") as string
  const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()) : []

  const { data, error } = await supabase
    .from("projects")
    .update({
      name,
      description,
      logo_url,
      status,
      tags,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Log activity
  await supabase.from("activity_logs").insert({
    entity_type: "project",
    entity_id: id,
    user_id: user.id,
    action: "project_edited",
    new_value: { name, description, status }
  })

  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
  return data
}

export async function exportProjectData(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Check admin role
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "Admin") {
    throw new Error("Only admins can export projects")
  }

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single()
  const { data: tasks } = await supabase.from("tasks").select("*").eq("project_id", projectId)
  
  let comments: any[] = []
  const taskIds = tasks?.map(t => t.id) || []
  if (taskIds.length > 0) {
    const { data: c } = await supabase.from("comments").select("*").in("task_id", taskIds)
    if (c) comments = c
  }

  return {
    project,
    tasks,
    comments,
    exported_at: new Date().toISOString()
  }
}

export async function createProjectDocument(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const projectId = formData.get("projectId") as string
  const title = formData.get("title") as string
  const content = formData.get("content") as string
  const reference = formData.get("reference") as string | null
  const version = parseInt((formData.get("version") as string) || "1", 10)
  const parentId = formData.get("parentId") as string | null

  if (!projectId || !title) throw new Error("Missing required fields")

  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      project_id: projectId,
      title,
      content,
      reference,
      version,
      parent_id: parentId || null,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Log activity
  await supabase.from("activity_logs").insert({
    entity_type: "project",
    entity_id: projectId,
    user_id: user.id,
    action: "document_created",
    new_value: { title }
  })

  revalidatePath(`/projects/${projectId}`)
  return data
}

export async function updateProjectDocument(id: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const { data, error } = await supabase
    .from("project_documents")
    .update({ content })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Log activity
  await supabase.from("activity_logs").insert({
    entity_type: "project",
    entity_id: data.project_id,
    user_id: user.id,
    action: "document_updated",
    new_value: { title: data.title }
  })

  revalidatePath(`/projects/${data.project_id}`)
  return data
}

export async function archiveProjectDocument(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const { data, error } = await supabase
    .from("project_documents")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Log activity
  await supabase.from("activity_logs").insert({
    entity_type: "project",
    entity_id: data.project_id,
    user_id: user.id,
    action: "document_deleted",
    previous_value: { title: data.title }
  })

  revalidatePath(`/projects/${data.project_id}`)
  return data
}

export async function postProjectUpdate(projectId: string, message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const { error } = await supabase.from("activity_logs").insert({
    entity_type: "project",
    entity_id: projectId,
    user_id: user.id,
    action: "project_update",
    new_value: { message }
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/")
}
