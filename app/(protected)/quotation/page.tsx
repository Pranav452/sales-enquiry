import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuotationPageContent } from "./QuotationPageContent"

export default async function QuotationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("company")
    .eq("id", user.id)
    .single()

  return <QuotationPageContent company={profile?.company ?? "manilal"} />
}
