import { redirect } from "next/navigation"
import { getProfile, getSessionUser } from "@/lib/auth/session"
import { ProtectedLayoutClient } from "@/components/layout/ProtectedLayoutClient"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  const profile = await getProfile(user)

  const role = profile?.role ?? "sales"
  const displayName = profile?.full_name || user.email || "User"
  const branch = profile?.branch || ""
  const company = profile?.company || ""

  const email = profile?.email || user.email || ""

  return (
    <ProtectedLayoutClient role={role} displayName={displayName} branch={branch} company={company} userId={user.id} email={email} salesperson={profile?.salesperson ?? null} fullName={profile?.full_name ?? null}>
      {children}
    </ProtectedLayoutClient>
  )
}
