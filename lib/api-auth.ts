import { getProfile, getSessionUser } from "@/lib/auth/session"

export interface AuthContext {
  userId: string
  role: string
  company: string
  email: string
  salesperson: string | null
}

/**
 * Verifies the Supabase session (locally, via JWT claims) and looks up the
 * user's profile (role + company, short in-memory cache).
 * Returns null if not authenticated.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const user = await getSessionUser()
  if (!user) return null

  const profile = await getProfile(user)

  return {
    userId: user.id,
    role: profile?.role ?? "sales",
    company: profile?.company ?? "manilal",
    email: user.email,
    salesperson: profile?.salesperson ?? null,
  }
}
