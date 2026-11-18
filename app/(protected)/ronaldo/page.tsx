import { redirect } from "next/navigation"
import { getProfile, getSessionUser } from "@/lib/auth/session"

export default async function RonaldoPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const profile = await getProfile(user)

  const email = profile?.email || user.email || ""
  if (email !== "sales2.bom@manilal.com") redirect("/enquiry")

  return (
    <div
      className="h-full w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/ronaldo.jpg')" }}
    />
  )
}
