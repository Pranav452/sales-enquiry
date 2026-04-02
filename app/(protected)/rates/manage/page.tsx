import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RateManageTable } from "@/components/rates/RateManageTable"

export default async function ManageRatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/rates")

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <RateManageTable />
    </div>
  )
}
