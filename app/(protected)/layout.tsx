import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProtectedLayoutClient } from "@/components/layout/ProtectedLayoutClient"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, full_name, branch, email, company")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "sales"
  const displayName = profile?.full_name || user.email || "User"
  const branch = profile?.branch || ""
  const company = profile?.company || ""

  return (
    <ProtectedLayoutClient role={role} displayName={displayName} branch={branch} company={company} userId={user.id}>
      {children}
    </ProtectedLayoutClient>
  )
}
