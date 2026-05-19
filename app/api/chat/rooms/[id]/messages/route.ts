import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"
import { sendPushToUsers } from "@/lib/webpush/vapid"

// ─── GET /api/chat/rooms/[id]/messages ───────────────────────────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: roomId } = await params
  const url    = new URL(request.url)
  const cursor = url.searchParams.get("cursor")
  const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100)

  const supabase = await createClient()

  // Verify membership
  const { data: membership } = await supabase
    .from("chat_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", auth.userId)
    .single()

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Fetch messages (newest first)
  let query = supabase
    .from("chat_messages")
    .select("id, room_id, sender_id, content, mentions, enquiry_refs, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit + 1)

  if (cursor) query = query.lt("created_at", cursor)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows    = data ?? []
  const hasMore = rows.length > limit
  const slice   = rows.slice(0, limit)

  // Resolve sender names in one batch
  const senderIds = [...new Set(slice.map((m) => m.sender_id))]
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .in("id", senderIds)

  const nameMap = new Map<string, string>()
  for (const p of profiles ?? []) nameMap.set(p.id, p.full_name ?? "")

  const messages = slice.map((msg) => ({
    id:           msg.id,
    room_id:      msg.room_id,
    sender_id:    msg.sender_id,
    content:      msg.content,
    mentions:     msg.mentions,
    enquiry_refs: msg.enquiry_refs,
    created_at:   msg.created_at,
    sender_name:  nameMap.get(msg.sender_id) ?? null,
  }))

  const nextCursor = hasMore ? messages[messages.length - 1].created_at : null

  return NextResponse.json({ messages, nextCursor })
}

// ─── POST /api/chat/rooms/[id]/messages ──────────────────────────────────────
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: roomId } = await params
  const body = await request.json()
  const { content, mentions = [], enquiry_refs = [] } = body as {
    content: string
    mentions: string[]
    enquiry_refs: string[]
  }

  if (!content || content.trim() === "") {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify membership
  const { data: membership } = await supabase
    .from("chat_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", auth.userId)
    .single()

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: msg, error: insertErr } = await supabase
    .from("chat_messages")
    .insert({
      room_id:      roomId,
      sender_id:    auth.userId,
      content:      content.trim(),
      mentions,
      enquiry_refs,
    })
    .select("id, room_id, sender_id, content, mentions, enquiry_refs, created_at")
    .single()

  if (insertErr || !msg) {
    return NextResponse.json({ error: insertErr?.message ?? "Failed to send" }, { status: 500 })
  }

  // Fetch sender name separately
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", auth.userId)
    .single()

  const senderName = profile?.full_name ?? "Someone"

  // Push to all other room members (fire-and-forget, don't block response)
  supabase
    .from("chat_members")
    .select("user_id")
    .eq("room_id", roomId)
    .neq("user_id", auth.userId)
    .then(({ data: otherMembers }) => {
      const otherIds = (otherMembers ?? []).map((m) => m.user_id)
      if (otherIds.length === 0) return

      // Fetch room name
      supabase
        .from("chat_rooms")
        .select("name, type")
        .eq("id", roomId)
        .single()
        .then(({ data: room }) => {
          const roomLabel = room?.name || (room?.type === "direct" ? senderName : "Chat")
          sendPushToUsers(otherIds, {
            title: `${senderName} in ${roomLabel}`,
            body:  content.trim().slice(0, 120),
            url:   `/chat?room=${roomId}`,
            tag:   `chat-${roomId}`,
          }).catch(() => {})
        })
    })

  return NextResponse.json({ ...msg, sender_name: senderName })
}
