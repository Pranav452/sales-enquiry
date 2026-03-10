import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardView } from "@/components/dashboard/DashboardView"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") redirect("/enquiry")

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Admin Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time performance, team activity, and assignment tracking
        </p>
      </div>
      <DashboardView />
    </div>
  )
}
