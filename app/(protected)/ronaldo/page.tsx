import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function RonaldoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("id", user.id)
    .single()

  const email = profile?.email || user.email || ""
  if (email !== "sales2.bom@manilal.com") redirect("/enquiry")

  return (
    <div
      className="h-full w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/ronaldo.jpg')" }}
    />
  )
}
