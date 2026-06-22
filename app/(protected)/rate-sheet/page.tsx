import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import RateSheetPageContent from "./RateSheetPageContent"

export default async function RateSheetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, company")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/home")

  return <RateSheetPageContent company={profile.company ?? "manilal"} />
}
