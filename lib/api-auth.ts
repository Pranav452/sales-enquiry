import { createClient } from "@/lib/supabase/server"

export interface AuthContext {
  userId: string
  role: string
  company: string
  email: string
}

/**
 * Verifies the Supabase session and looks up the user's profile (role + company).
 * Returns null if not authenticated.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, company")
    .eq("id", user.id)
    .single()

  return {
    userId: user.id,
    role: profile?.role ?? "sales",
    company: profile?.company ?? "manilal",
    email: user.email ?? "",
  }
}
