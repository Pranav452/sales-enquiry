"use client"

import { useState } from "react"
import { Users, Plus, MessageSquare } from "lucide-react"
import { useUsers, useRooms, useCreateRoom } from "@/lib/hooks/useChat"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { GroupChatModal } from "@/components/chat/GroupChatModal"
import { cn } from "@/lib/utils"
import type { ChatUser } from "@/lib/types/chat"

interface Props {
  selectedRoomId: string | null
  onSelectRoom: (roomId: string) => void
}

export function ChatSidebar({ selectedRoomId, onSelectRoom }: Props) {
  const [groupModalOpen, setGroupModalOpen] = useState(false)

  const currentUser                         = useCurrentUser()
  const { data: allUsers = [], isLoading: usersLoading } = useUsers()
  const { data: rooms = [],    isLoading: roomsLoading  } = useRooms()
  const createRoom = useCreateRoom()

  // Filter current user out of the People list — you can't DM yourself
  const users     = allUsers.filter((u) => u.id !== currentUser?.id)
  const groupRooms = rooms.filter((r) => r.type === "group")

  async function handleUserClick(user: ChatUser) {
    // Reuse existing DM room if one already exists with this person
    const existing = rooms.find(
      (r) =>
        r.type === "direct" &&
        r.members?.some((m) => m.user_id === user.id)
    )
    if (existing) { onSelectRoom(existing.id); return }

    try {
      const room = await createRoom.mutateAsync({
        type: "direct",
        member_ids: [user.id],
      })
      onSelectRoom(room.id)
    } catch (err) {
      console.error("[ChatSidebar] create DM room failed:", err)
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
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground
                       hover:bg-accent rounded-md px-2 py-1 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Group</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Groups ── */}
          {(roomsLoading || groupRooms.length > 0) && (
            <section>
              <SectionHeader label="Groups" />
              {roomsLoading ? (
                <LoadingRows count={2} />
              ) : (
                groupRooms.map((room) => (
                  <GroupRoomRow
                    key={room.id}
                    name={room.name ?? "Group"}
                    memberCount={room.members?.length ?? 0}
                    lastMessage={room.last_message?.content ?? null}
                    isActive={selectedRoomId === room.id}
                    onClick={() => onSelectRoom(room.id)}
                  />
                ))
              )}
            </section>
          )}

          {/* ── People ── */}
          <section>
            <SectionHeader label="People" />
            {usersLoading ? (
              <LoadingRows count={5} />
            ) : (
              users.map((user) => {
                const dmRoom = rooms.find(
                  (r) =>
                    r.type === "direct" &&
                    r.members?.some((m) => m.user_id === user.id)
                )
                return (
                  <UserRow
                    key={user.id}
                    user={user}
                    isActive={!!dmRoom && selectedRoomId === dmRoom.id}
                    lastMessage={dmRoom?.last_message?.content ?? null}
                    onClick={() => handleUserClick(user)}
                  />
                )
              })
            )}
          </section>
        </div>
      </div>

      <GroupChatModal
        open={groupModalOpen}
        onOpenChange={setGroupModalOpen}
        onCreated={(room) => {
          setGroupModalOpen(false)
          onSelectRoom(room.id)
        }}
      />
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pt-4 pb-1">
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
        <div key={i} className="flex items-center gap-2.5 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            <div className="h-2.5 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </>
  )
}

function UserRow({
  user,
  isActive,
  lastMessage,
  onClick,
}: {
  user: ChatUser
  isActive: boolean
  lastMessage: string | null
  onClick: () => void
}) {
  const initials = user.full_name
    ? user.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
        "hover:bg-accent",
        isActive && "bg-primary/10 text-primary"
      )}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
        <p className="text-xs text-muted-foreground truncate">
          {lastMessage ?? (user.branch || user.role)}
        </p>
      </div>
    </button>
  )
}

function GroupRoomRow({
  name,
  memberCount,
  lastMessage,
  isActive,
  onClick,
}: {
  name: string
  memberCount: number
  lastMessage: string | null
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
        "hover:bg-accent",
        isActive && "bg-primary/10 text-primary"
      )}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        <Users className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {lastMessage ?? `${memberCount} member${memberCount !== 1 ? "s" : ""}`}
        </p>
      </div>
    </button>
  )
}
