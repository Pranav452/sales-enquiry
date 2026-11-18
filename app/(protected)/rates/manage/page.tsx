import { redirect } from "next/navigation"
import { getProfile, getSessionUser } from "@/lib/auth/session"
import { RateManageTable } from "@/components/rates/RateManageTable"

export default async function ManageRatesPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const profile = await getProfile(user)

  if (profile?.role !== "admin") redirect("/rates")

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <RateManageTable />
    </div>
  )
}
