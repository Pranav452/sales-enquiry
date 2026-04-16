import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, role, branch")
    .order("full_name")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
