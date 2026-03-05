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
    .select("role, full_name, branch, email")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "sales"
  const displayName = profile?.full_name || user.email || "User"
  const branch = profile?.branch || ""

  return (
    <ProtectedLayoutClient role={role} displayName={displayName} branch={branch}>
      {children}
    </ProtectedLayoutClient>
  )
}
