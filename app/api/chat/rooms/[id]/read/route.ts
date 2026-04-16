import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"

// PATCH /api/chat/rooms/[id]/read  — mark all messages in this room as read
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: roomId } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from("chat_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
