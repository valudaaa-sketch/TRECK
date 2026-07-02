"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function addProjectMember(projectId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") throw new Error("Only admins can manage project members");

  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    user_id: userId
  });

  if (error) {
    // 23505 is unique violation, ignore if already a member
    if (error.code !== "23505") {
      throw new Error(error.message);
    }
  }

  revalidatePath("/");
  return { success: true };
}

export async function removeProjectMember(projectId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") throw new Error("Only admins can manage project members");

  const { error } = await supabase.from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  return { success: true };
}

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId);
    
  if (error) return [];
  return data.map(d => d.user_id);
}

export async function updateUserProjects(userId: string, projectIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") throw new Error("Only admins can manage project members");

  // Remove existing
  await supabase.from("project_members").delete().eq("user_id", userId);

  // Insert new
  if (projectIds.length > 0) {
    const inserts = projectIds.map(pId => ({
      project_id: pId,
      user_id: userId
    }));
    const { error } = await supabase.from("project_members").insert(inserts);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin/team");
  return { success: true };
}
