"use client"

import { createContext, useContext, type ReactNode } from "react"

/**
 * The signed-in user's profile, resolved once on the server by the protected
 * layout and shared with every client page. Pages read it with useUser()
 * instead of each calling supabase.auth.getUser() + user_profiles on mount.
 */
export interface CurrentUserInfo {
  id: string
  email: string
  role: string
  company: string
  salesperson: string | null
  fullName: string | null
  branch: string
}

const UserContext = createContext<CurrentUserInfo | null>(null)

export function UserProvider({ value, children }: { value: CurrentUserInfo; children: ReactNode }) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser(): CurrentUserInfo | null {
  return useContext(UserContext)
}
