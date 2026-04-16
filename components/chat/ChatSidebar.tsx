"use client"

import { useState } from "react"
import { Users, Plus, MessageSquare } from "lucide-react"
import { useUsers, useRooms, useCreateRoom } from "@/lib/hooks/useChat"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { GroupChatModal } from "@/components/chat/GroupChatModal"
import { cn } from "@/lib/utils"
import type { ChatRoom, ChatUser } from "@/lib/types/chat"

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60_000)
  if (min < 1)   return "now"
  if (min < 60)  return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr  < 24)  return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

interface Props {
  selectedRoomId: string | null
  onSelectRoom: (roomId: string) => void
}

export function ChatSidebar({ selectedRoomId, onSelectRoom }: Props) {
  const [groupModalOpen, setGroupModalOpen] = useState(false)

  const currentUser                          = useCurrentUser()
  const { data: allUsers = [], isLoading: usersLoading } = useUsers()
  const { data: rooms = [],    isLoading: roomsLoading  } = useRooms()
  const createRoom = useCreateRoom()

  // Users without a DM room yet (for "New Conversation" section)
  const usersWithDm    = new Set(
    rooms
      .filter((r) => r.type === "direct")
      .flatMap((r) => (r.members ?? []).map((m) => m.user_id))
  )
  const usersForNew    = allUsers.filter(
    (u) => u.id !== currentUser?.id && !usersWithDm.has(u.id)
  )

  // Rooms sorted by last message time (already sorted by API, but ensure client-side too)
  const sortedRooms = [...rooms].sort((a, b) => {
    const tA = (a.last_message as { created_at: string } | null)?.created_at ?? a.created_at
    const tB = (b.last_message as { created_at: string } | null)?.created_at ?? b.created_at
    return new Date(tB).getTime() - new Date(tA).getTime()
  })

  async function handleUserClick(user: ChatUser) {
    const existing = rooms.find(
      (r) => r.type === "direct" && r.members?.some((m) => m.user_id === user.id)
    )
    if (existing) { onSelectRoom(existing.id); return }
    try {
      const room = await createRoom.mutateAsync({ type: "direct", member_ids: [user.id] })
      onSelectRoom(room.id)
    } catch (err) {
      console.error("[ChatSidebar] create DM:", err)
    }
  }

  return (
    <>
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col overflow-hidden bg-card">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Chat</span>
          </div>
          <button
            type="button"
            onClick={() => setGroupModalOpen(true)}
            title="New group chat"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md px-2 py-1.5 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Group</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Active conversations (sorted by recency) ── */}
          {(roomsLoading || sortedRooms.length > 0) && (
            <section>
              {sortedRooms.length > 0 && (
                <SectionHeader label="Messages" />
              )}
              {roomsLoading ? (
                <LoadingRows count={3} />
              ) : (
                sortedRooms.map((room) => (
                  <ConversationRow
                    key={room.id}
                    room={room}
                    currentUserId={currentUser?.id ?? null}
                    isActive={selectedRoomId === room.id}
                    onClick={() => onSelectRoom(room.id)}
                  />
                ))
              )}
            </section>
          )}

          {/* ── New conversations ── */}
          {(usersLoading || usersForNew.length > 0) && (
            <section>
              <SectionHeader label="New Conversation" />
              {usersLoading ? (
                <LoadingRows count={4} />
              ) : (
                usersForNew.map((user) => (
                  <NewUserRow
                    key={user.id}
                    user={user}
                    onClick={() => handleUserClick(user)}
                  />
                ))
              )}
            </section>
          )}

          {/* Empty state */}
          {!roomsLoading && !usersLoading && sortedRooms.length === 0 && usersForNew.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No other users found
            </div>
          )}
        </div>
      </div>

      <GroupChatModal
        open={groupModalOpen}
        onOpenChange={setGroupModalOpen}
        onCreated={(room) => { setGroupModalOpen(false); onSelectRoom(room.id) }}
      />
    </>
  )
}

// ─── ConversationRow: shows active DMs and groups with unread badge ───────────
function ConversationRow({
  room,
  currentUserId,
  isActive,
  onClick,
}: {
  room: ChatRoom
  currentUserId: string | null
  isActive: boolean
  onClick: () => void
}) {
  const unread = room.unread_count ?? 0

  // Display name: for DMs, show the other person's name
  let displayName = room.name ?? "Group"
  let initials    = "G"
  let isGroup     = room.type === "group"

  if (room.type === "direct" && currentUserId) {
    const other = (room.members ?? []).find((m) => m.user_id !== currentUserId)
    if (other?.full_name) {
      displayName = other.full_name
      initials    = other.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
      isGroup     = false
    }
  } else if (room.type === "group") {
    initials = (room.name ?? "G").slice(0, 2).toUpperCase()
  }

  const lastMsg  = room.last_message as { content: string; created_at: string; sender_id: string } | null
  const lastTime = lastMsg?.created_at ? relativeTime(lastMsg.created_at) : ""
  const preview  = lastMsg?.content
    ? lastMsg.content.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1").replace(/\/\[([^\]]+)\]\([^)]+\)/g, "$1").slice(0, 40)
    : isGroup ? `${room.members?.length ?? 0} members` : ""

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
        "hover:bg-accent",
        isActive && "bg-primary/10"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 relative",
        isGroup ? "rounded-lg" : "rounded-full",
        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {isGroup ? <Users className="h-4 w-4" /> : initials}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className={cn(
            "text-sm truncate",
            unread > 0 ? "font-semibold text-foreground" : "font-medium"
          )}>
            {displayName}
          </p>
          {lastTime && (
            <span className={cn(
              "text-[10px] flex-shrink-0",
              unread > 0 ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {lastTime}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className={cn(
            "text-xs truncate",
            unread > 0 ? "text-foreground" : "text-muted-foreground"
          )}>
            {preview}
          </p>
          {unread > 0 && !isActive && (
            <span className="flex-shrink-0 h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── NewUserRow: users with no existing DM ────────────────────────────────────
function NewUserRow({ user, onClick }: { user: ChatUser; onClick: () => void }) {
  const initials = user.full_name
    ? user.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent"
    >
      <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
        <p className="text-xs text-muted-foreground truncate">{user.branch || user.role}</p>
      </div>
    </button>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pt-3 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function LoadingRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 bg-muted animate-pulse rounded" />
            <div className="h-2.5 w-36 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </>
  )
}
