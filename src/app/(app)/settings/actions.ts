"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const fullName = formData.get("fullName") as string

  // Update public users table
  const { error: dbError } = await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id)

  if (dbError) {
    throw new Error(dbError.message)
  }

  // Also update auth user metadata so the layout uses the correct name
  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName }
  })

  if (authError) {
    throw new Error(authError.message)
  }

  revalidatePath("/")
  revalidatePath("/settings")
}
