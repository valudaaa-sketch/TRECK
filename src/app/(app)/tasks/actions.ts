"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error("Unauthorized")

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const projectId = formData.get("projectId") as string
  const priority = formData.get("priority") as string || "Medium"
  const suggestedOwnerRaw = formData.get("suggestedOwner") as string || null
  const suggestedOwner = suggestedOwnerRaw === "unassigned" ? null : suggestedOwnerRaw
  const deadline = formData.get("deadline") as string || null
  const statusId = formData.get("statusId") as string

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      project_id: projectId,
      priority,
      status_id: statusId,
      suggested_owner: suggestedOwner,
      current_owner: suggestedOwner,
      deadline,
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const taskId = data.id

  // Process Files
  const files = formData.getAll("files") as File[]
  const validFiles = files.filter(f => f.size > 0 && f.name !== "undefined")
  
  if (validFiles.length > 0) {
    for (const file of validFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${projectId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file)

      if (!uploadError) {
        await supabase.from('files').insert({
          project_id: projectId,
          task_id: taskId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
        })

        // Log file upload
        await supabase.from("activity_logs").insert({
          entity_type: "task",
          entity_id: taskId,
          user_id: user.id,
          action: "file_uploaded",
          new_value: { file_name: file.name, file_size: file.size, file_path: filePath }
        })
      }
    }
  }

  // Log creation
  await supabase.from("activity_logs").insert({
    entity_type: "task",
    entity_id: taskId,
    user_id: user.id,
    action: "task_created",
    new_value: { title, priority, project_id: projectId }
  })

  // Checklists
  const checklists = formData.getAll("checklists") as string[]
  if (checklists.length > 0) {
    const checklistInserts = checklists.map(c => ({
      task_id: taskId,
      item_text: c,
      is_completed: false
    }))
    await supabase.from("task_checklists").insert(checklistInserts)
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/tasks")
  revalidatePath("/")
  return data
}

export async function updateTaskField(taskId: string, field: string, value: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Get current task data for logging
  const { data: task } = await supabase
    .from("tasks")
    .select("*, task_statuses(name), owner:users!tasks_current_owner_fkey(full_name)")
    .eq("id", taskId)
    .single()

  if (!task) throw new Error("Task not found")

  const updateData: Record<string, any> = {}
  let previousLabel = ""
  let newLabel = ""
  let logAction = "task_edited"

  switch (field) {
    case "title":
      updateData.title = value
      previousLabel = task.title
      newLabel = value || ""
      logAction = "title_changed"
      break
    case "description":
      updateData.description = value
      previousLabel = task.description || "(empty)"
      newLabel = value || "(empty)"
      logAction = "description_changed"
      break
    case "priority":
      updateData.priority = value
      previousLabel = task.priority
      newLabel = value || ""
      logAction = "priority_changed"
      break
    case "status_id": {
      updateData.status_id = value
      const { data: newStatus } = await supabase.from("task_statuses").select("name").eq("id", value!).single()
      previousLabel = (task.task_statuses as any)?.name || "Unknown"
      newLabel = newStatus?.name || "Unknown"
      logAction = "status_changed"
      if (newLabel === "Resolved") {
        updateData.resolved_at = new Date().toISOString()
      }
      break
    }
    case "current_owner": {
      const newOwnerId = value === "unassigned" ? null : value
      updateData.current_owner = newOwnerId
      previousLabel = (task.owner as any)?.full_name || "Unassigned"
      if (newOwnerId) {
        const { data: newUser } = await supabase.from("users").select("full_name").eq("id", newOwnerId).single()
        newLabel = newUser?.full_name || "Unknown"
      } else {
        newLabel = "Unassigned"
      }
      logAction = "assignee_changed"
      break
    }
    case "deadline":
      updateData.deadline = value || null
      previousLabel = task.deadline ? new Date(task.deadline).toLocaleDateString() : "None"
      newLabel = value ? new Date(value).toLocaleDateString() : "None"
      logAction = "deadline_changed"
      break
    default:
      throw new Error(`Unknown field: ${field}`)
  }

  const { error } = await supabase.from("tasks").update(updateData).eq("id", taskId)
  if (error) throw new Error(error.message)

  // Log detailed change
  await supabase.from("activity_logs").insert({
    entity_type: "task",
    entity_id: taskId,
    user_id: user.id,
    action: logAction,
    previous_value: { [field]: previousLabel },
    new_value: { [field]: newLabel }
  })

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath("/tasks")
  revalidatePath("/")
  if (task.project_id) revalidatePath(`/projects/${task.project_id}`)
}

export async function updateTaskBulk(taskId: string, updates: Record<string, any>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: task } = await supabase.from('tasks').select('*, task_statuses(name), owner:users!tasks_current_owner_fkey(full_name)').eq('id', taskId).single()
  if (!task) throw new Error("Task not found")

  const { error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", taskId)

  if (error) throw new Error(error.message)

  // Log detailed changes
  for (const [key, newValue] of Object.entries(updates)) {
    const previousValue = task[key];
    if (previousValue !== newValue) {
      let action = "task_edited";
      let prevVal = previousValue;
      let newVal = newValue;

      if (key === "title") action = "title_changed";
      if (key === "description") action = "description_changed";
      if (key === "priority") action = "priority_changed";
      
      if (key === "status_id") {
        action = "status_changed";
        const { data: newStatus } = await supabase.from("task_statuses").select("name").eq("id", newValue as string).single();
        prevVal = (task.task_statuses as any)?.name || "Unknown";
        newVal = newStatus?.name || "Unknown";
      }
      
      if (key === "current_owner") {
        action = "assignee_changed";
        prevVal = (task.owner as any)?.full_name || "Unassigned";
        if (newValue) {
          const { data: newUser } = await supabase.from("users").select("full_name").eq("id", newValue as string).single();
          newVal = newUser?.full_name || "Unknown";
        } else {
          newVal = "Unassigned";
        }
      }
      
      if (key === "deadline") {
        action = "deadline_changed";
        prevVal = previousValue ? new Date(previousValue).toLocaleDateString() : "None";
        newVal = newValue ? new Date(newValue as string).toLocaleDateString() : "None";
      }

      await supabase.from('activity_logs').insert({
        entity_type: 'task',
        entity_id: taskId,
        user_id: user.id,
        action,
        previous_value: { [key]: prevVal },
        new_value: { [key]: newVal }
      })
    }
  }
  
  revalidatePath(`/tasks/${taskId}`)
  return { success: true }
}

export async function takeOverTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: task } = await supabase
    .from("tasks")
    .select("title, project_id, current_owner, owner:users!tasks_current_owner_fkey(full_name)")
    .eq("id", taskId)
    .single()

  if (!task) throw new Error("Task not found")

  const { data: currentUser } = await supabase.from("users").select("full_name").eq("id", user.id).single()

  const { error } = await supabase.from("tasks").update({ current_owner: user.id }).eq("id", taskId)
  if (error) throw new Error(error.message)

  await supabase.from("activity_logs").insert({
    entity_type: "task",
    entity_id: taskId,
    user_id: user.id,
    action: "assignee_changed",
    previous_value: { current_owner: (task.owner as any)?.full_name || "Unassigned" },
    new_value: { current_owner: currentUser?.full_name || "Unknown" }
  })

  revalidatePath(`/projects/${task.project_id}`)
  revalidatePath(`/tasks/${taskId}`)
  revalidatePath("/tasks")
  revalidatePath("/")
}

export async function archiveTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", taskId)

  if (error) throw new Error(error.message)

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath("/tasks")
  revalidatePath("/")
}

export async function quickResolveTask(taskId: string, resolvedStatusId: string, projectId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: currentTask } = await supabase
    .from("tasks")
    .select("status_id, current_owner")
    .eq("id", taskId)
    .single()

  if (!currentTask) throw new Error("Task not found")

  const updates: any = {
    status_id: resolvedStatusId,
    updated_at: new Date().toISOString()
  }

  if (!currentTask.current_owner) {
    updates.current_owner = user.id
  }

  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)

  if (error) throw new Error(error.message)

  // Run subsequent fetches in parallel
  const [
    { data: statuses },
    newUserResult
  ] = await Promise.all([
    supabase.from("task_statuses").select("id, name").in("id", [currentTask.status_id, resolvedStatusId]),
    updates.current_owner ? supabase.from("users").select("full_name").eq("id", user.id).single() : Promise.resolve({ data: null })
  ])

  const prevStatusName = statuses?.find(s => s.id === currentTask.status_id)?.name || "Unknown"
  const newStatusName = statuses?.find(s => s.id === resolvedStatusId)?.name || "Unknown"

  const logPromises: any[] = [
    supabase.from("activity_logs").insert({
      entity_type: "task",
      entity_id: taskId,
      user_id: user.id,
      action: "status_changed",
      previous_value: { status: prevStatusName },
      new_value: { status: newStatusName }
    })
  ];

  if (updates.current_owner) {
    const newUser = newUserResult.data;
    logPromises.push(
      supabase.from("activity_logs").insert({
        entity_type: "task",
        entity_id: taskId,
        user_id: user.id,
        action: "assigned",
        previous_value: { assignee: "Unassigned" },
        new_value: { assignee: newUser?.full_name || "Unknown" }
      })
    );
  }

  await Promise.all(logPromises);

  if (projectId) revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/tasks/${taskId}`)
  revalidatePath("/tasks")
  revalidatePath("/")
}
