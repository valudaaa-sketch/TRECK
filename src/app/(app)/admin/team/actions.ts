"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Create a Supabase client with the service role key for admin actions
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });
}

export async function createUserProfile(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as string || "Member";

  if (!email || !password || !fullName) {
    throw new Error("Missing required fields");
  }

  // Ensure current user is an Admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") throw new Error("Only admins can create users");

  const adminAuthClient = getAdminClient();

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto confirm their email
    user_metadata: { full_name: fullName }
  });

  if (authError) {
    throw new Error(authError.message);
  }

  // The database trigger will automatically create the record in public.users,
  // but we might want to ensure the role is set correctly if it differs from the default
  if (role === "Admin" && authData.user) {
    const { error: updateError } = await adminAuthClient
      .from("users")
      .update({ role: "Admin" })
      .eq("id", authData.user.id);
      
    if (updateError) {
      console.error("Failed to update user role:", updateError);
    }
  }

  // Handle project assignments
  const projectIds = formData.getAll("projectIds") as string[];
  if (projectIds.length > 0 && authData.user) {
    const inserts = projectIds.map(pId => ({
      project_id: pId,
      user_id: authData.user.id
    }));
    const { error: projectError } = await adminAuthClient
      .from("project_members")
      .insert(inserts);
      
    if (projectError) {
      console.error("Failed to assign projects:", projectError);
    }
  }

  revalidatePath("/admin/team");
  return { success: true };
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") throw new Error("Only admins can update users");

  if (user.id === userId) {
    throw new Error("You cannot deactivate your own account");
  }

  const { error } = await supabase.from("users").update({ is_active: isActive }).eq("id", userId);
  
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/team");
  return { success: true };
}

export async function updateUserCredentials(userId: string, email?: string, password?: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") throw new Error("Only admins can update credentials");

  const adminAuthClient = getAdminClient();
  const updates: any = {};
  
  if (email && email.trim() !== "") {
    updates.email = email.trim();
    updates.email_confirm = true; // Auto confirm email change for admin actions
  }
  
  if (password && password.trim() !== "") {
    updates.password = password;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No changes provided");
  }

  const { error } = await adminAuthClient.auth.admin.updateUserById(userId, updates);
  
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/team");
  return { success: true };
}

export async function deleteUserAccount(userId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") throw new Error("Only admins can delete users");

  if (user.id === userId) {
    throw new Error("You cannot delete your own account");
  }

  const adminAuthClient = getAdminClient();
  
  // This will cascade to public.users. If public.users deletion fails due to FK constraints
  // (e.g. they created a task), Supabase auth deletion will also fail and rollback.
  const { error } = await adminAuthClient.auth.admin.deleteUser(userId);
  
  if (error) {
    console.error("Delete user error:", error);
    // User-friendly error for FK violations
    if (error.message.includes('foreign key') || error.name === 'AuthApiError') {
      throw new Error("Cannot completely delete this user because they have created tasks, projects, or comments. Please Deactivate their account instead to preserve system history.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/team");
  return { success: true };
}

export async function updateUserRole(userId: string, newRole: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "Admin") throw new Error("Only admins can change roles");

  if (user.id === userId) {
    throw new Error("You cannot change your own role");
  }

  const { error } = await supabase.from("users").update({ role: newRole }).eq("id", userId);
  
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/team");
  return { success: true };
}
