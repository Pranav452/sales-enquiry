"use client"

import { useUser } from "@/components/layout/UserContext"

interface CurrentUser {
  id: string
  email: string
}

/** Current user from the protected layout's context (no network call). */
export function useCurrentUser(): CurrentUser | null {
  const u = useUser()
  return u ? { id: u.id, email: u.email } : null
}
