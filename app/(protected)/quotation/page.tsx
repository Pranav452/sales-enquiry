import { redirect } from "next/navigation"
import { getProfile, getSessionUser } from "@/lib/auth/session"
import { QuotationPageContent } from "./QuotationPageContent"

export default async function QuotationPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const profile = await getProfile(user)

  return <QuotationPageContent company={profile?.company ?? "manilal"} />
}
