import { getProfile, getSessionUser } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import RateSheetPageContent from "./RateSheetPageContent"

export default async function RateSheetPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const profile = await getProfile(user)

  if (!profile || profile.role !== "admin") redirect("/home")

  return <RateSheetPageContent company={profile.company ?? "manilal"} />
}
