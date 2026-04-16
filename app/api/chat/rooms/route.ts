import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getAuthContext } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

// ─── Helper: resolve user names for a list of IDs ────────────────────────────
async function fetchProfiles(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, { full_name: string | null; email: string | null }>> {
  const unique = [...new Set(userIds)]
  if (unique.length === 0) return new Map()
  const { data } = await supabase
    .from("user_profiles")
    .select("id, full_name, email")
    .in("id", unique)
  const map = new Map<string, { full_name: string | null; email: string | null }>()
  for (const p of data ?? []) map.set(p.id, { full_name: p.full_name, email: p.email })
  return map
}

// ─── Helper: fetch a room + its members (with names) ────────────────────────
async function enrichRoom(supabase: SupabaseClient, roomId: string, base: Record<string, unknown>) {
  const { data: members } = await supabase
    .from("chat_members")
    .select("room_id, user_id, joined_at")
    .eq("room_id", roomId)

  const profiles = await fetchProfiles(supabase, (members ?? []).map((m) => m.user_id))

  return {
    ...base,
    id: roomId,
    members: (members ?? []).map((m) => ({
      room_id:   m.room_id,
      user_id:   m.user_id,
      joined_at: m.joined_at,
      full_name: profiles.get(m.user_id)?.full_name ?? null,
      email:     profiles.get(m.user_id)?.email ?? null,
    })),
  }
}

// ─── GET /api/chat/rooms ──────────────────────────────────────────────────────
export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()

  // 1. Room IDs the user belongs to
  const { data: memberRows, error: memberErr } = await supabase
    .from("chat_members")
    .select("room_id")
    .eq("user_id", auth.userId)

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })
  if (!memberRows || memberRows.length === 0) return NextResponse.json([])

  const roomIds = memberRows.map((r) => r.room_id)

  // 2. Room details
  const { data: rooms, error: roomErr } = await supabase
    .from("chat_rooms")
    .select("*")
    .in("id", roomIds)
    .order("created_at", { ascending: false })

  if (roomErr) return NextResponse.json({ error: roomErr.message }, { status: 500 })

  // 3. Members (raw)
  const { data: allMembers, error: membersErr } = await supabase
    .from("chat_members")
    .select("room_id, user_id, joined_at")
    .in("room_id", roomIds)

  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 500 })

  // 4. Last message per room (raw)
  const { data: allMessages, error: msgErr } = await supabase
    .from("chat_messages")
    .select("id, room_id, sender_id, content, created_at")
    .in("room_id", roomIds)
    .order("created_at", { ascending: false })

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  // 5. Resolve names in one batch
  const allUserIds = [
    ...(allMembers ?? []).map((m) => m.user_id),
    ...(allMessages ?? []).map((m) => m.sender_id),
  ]
  const profiles = await fetchProfiles(supabase, allUserIds)

  // 6. Build maps
  const lastMessageByRoom = new Map<string, unknown>()
  for (const msg of allMessages ?? []) {
    if (!lastMessageByRoom.has(msg.room_id)) {
      lastMessageByRoom.set(msg.room_id, {
        id: msg.id, room_id: msg.room_id, sender_id: msg.sender_id,
        content: msg.content, created_at: msg.created_at,
        sender_name: profiles.get(msg.sender_id)?.full_name ?? null,
      })
    }
  }

  const membersByRoom = new Map<string, unknown[]>()
  for (const m of allMembers ?? []) {
    if (!membersByRoom.has(m.room_id)) membersByRoom.set(m.room_id, [])
    const p = profiles.get(m.user_id)
    membersByRoom.get(m.room_id)!.push({
      room_id: m.room_id, user_id: m.user_id, joined_at: m.joined_at,
      full_name: p?.full_name ?? null, email: p?.email ?? null,
    })
  }

  const result = (rooms ?? []).map((room) => ({
    ...room,
    members:      membersByRoom.get(room.id) ?? [],
    last_message: lastMessageByRoom.get(room.id) ?? null,
  }))

  return NextResponse.json(result)
}

// ─── POST /api/chat/rooms ─────────────────────────────────────────────────────
export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { type, name, member_ids } = body as {
    type: "direct" | "group"
    name?: string
    member_ids: string[]
  }

  if (!type || !member_ids || !Array.isArray(member_ids)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const supabase = await createClient()

  // ── Deduplicate direct rooms ──────────────────────────────────────────────
  if (type === "direct") {
    const otherId = member_ids[0]
    if (!otherId) return NextResponse.json({ error: "member_ids required" }, { status: 400 })

    const { data: myRooms }    = await supabase.from("chat_members").select("room_id").eq("user_id", auth.userId)
    const { data: otherRooms } = await supabase.from("chat_members").select("room_id").eq("user_id", otherId)

    const myRoomIds = new Set((myRooms    ?? []).map((r) => r.room_id))
    const sharedIds = (otherRooms ?? []).map((r) => r.room_id).filter((id) => myRoomIds.has(id))

    if (sharedIds.length > 0) {
      // Check if any of the shared rooms is a direct room
      const { data: existing } = await supabase
        .from("chat_rooms")
        .select("*")
        .in("id", sharedIds)
        .eq("type", "direct")
        .limit(1)

      if (existing && existing.length > 0) {
        return NextResponse.json(
          await enrichRoom(supabase, existing[0].id, existing[0] as Record<string, unknown>)
        )
      }
    }
  }

  if (type === "group" && (!name || name.trim() === "")) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 })
  }

  // ── KEY FIX: pre-generate the UUID so we never need RETURNING ────────────
  // This avoids the RLS timing issue where INSERT...RETURNING runs the SELECT
  // policy before any chat_members rows exist, making the row invisible.
  const newRoomId = randomUUID()
  const now       = new Date().toISOString()

  const { error: roomErr } = await supabase
    .from("chat_rooms")
    .insert({
      id:         newRoomId,
      type,
      name:       name?.trim() ?? null,
      created_by: auth.userId,
      created_at: now,
    })

  if (roomErr) {
    console.error("[POST /api/chat/rooms] insert room:", roomErr)
    return NextResponse.json({ error: roomErr.message }, { status: 500 })
  }

  // Insert ALL members immediately (creator always included)
  const allMemberIds  = [...new Set([auth.userId, ...member_ids])]
  const memberInserts = allMemberIds.map((uid) => ({
    room_id:   newRoomId,
    user_id:   uid,
    joined_at: now,
  }))

  const { error: insertErr } = await supabase
    .from("chat_members")
    .insert(memberInserts)

  if (insertErr) {
    console.error("[POST /api/chat/rooms] insert members:", insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Now that the creator is a member, SELECT + enrichment will work
  const enriched = await enrichRoom(supabase, newRoomId, {
    id: newRoomId, type, name: name?.trim() ?? null,
    created_by: auth.userId, created_at: now,
  })

  return NextResponse.json(enriched)
}
