import { redirect } from "next/navigation"
import { getProfile, getSessionUser } from "@/lib/auth/session"
import { DashboardView } from "@/components/dashboard/DashboardView"

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const profile = await getProfile(user)

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
