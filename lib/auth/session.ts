import { cache } from "react"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

/**
 * Fast server-side session + profile lookup.
 *
 * - The JWT is verified locally with getClaims() (project uses ES256 keys and
 *   the JWKS is cached), instead of getUser() which is a network round trip to
 *   Supabase Auth on every call.
 * - The user_profiles row is cached in memory for a short TTL per user+session,
 *   so API calls don't each pay a second Supabase round trip.
 * - Both are wrapped in React cache() so a layout + page + nested server
 *   components in one request share a single lookup.
 */

export interface SessionUser {
  id: string
  email: string
  sessionId: string
}

export interface UserProfile {
  role: string
  company: string
  salesperson: string | null
  full_name: string | null
  branch: string | null
  email: string | null
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  const c = data.claims as { sub: string; email?: string; session_id?: string }
  return { id: c.sub, email: c.email ?? "", sessionId: c.session_id ?? "" }
})

const PROFILE_TTL_MS = 60_000

declare global {
  // eslint-disable-next-line no-var
  var __profileCache: Map<string, { at: number; p: Promise<UserProfile | null> }> | undefined
}
const profileCache = (global.__profileCache ??= new Map())

async function loadProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_profiles")
    .select("role, company, salesperson, full_name, branch, email")
    .eq("id", userId)
    .single()
  if (!data) return null
  return {
    role: data.role ?? "sales",
    company: data.company ?? "manilal",
    salesperson: data.salesperson ?? null,
    full_name: data.full_name ?? null,
    branch: data.branch ?? null,
    email: data.email ?? null,
  }
}

export const getProfile = cache(async (user: SessionUser): Promise<UserProfile | null> => {
  // "pv" cookie is bumped by the company switcher so every server instance misses the cache.
  const pv = (await cookies()).get("pv")?.value ?? ""
  const key = `${user.id}:${user.sessionId}:${pv}`
  const hit = profileCache.get(key)
  if (hit && Date.now() - hit.at < PROFILE_TTL_MS) return hit.p
  const p = loadProfile(user.id).catch((err) => {
    profileCache.delete(key)
    throw err
  })
  profileCache.set(key, { at: Date.now(), p })
  if (profileCache.size > 500) {
    for (const [k, v] of profileCache) if (Date.now() - v.at >= PROFILE_TTL_MS) profileCache.delete(k)
  }
  return p
})

/** Drop cached profiles for a user (call after changing their role/company). */
export function invalidateProfile(userId: string) {
  for (const k of profileCache.keys()) if (k.startsWith(`${userId}:`)) profileCache.delete(k)
}
