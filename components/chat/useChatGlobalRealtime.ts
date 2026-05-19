"use client"

/**
 * Global Supabase Realtime subscription for the entire chat module.
 *
 * Placed at ChatView level so it stays alive regardless of which room is open.
 * A single channel listens to ALL new chat_messages (RLS filters to rooms the
 * user belongs to).  Uses refs so the subscription is created ONCE and never
 * torn down on re-render — avoiding the "new client each render" bug that
 * caused messages to silently stop arriving.
 */

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { chatKeys } from "@/lib/hooks/useChat"
import type { ChatMessage, ChatRoom, ChatUser } from "@/lib/types/chat"

/**
 * activeRoomIds — array of room IDs currently open and NOT minimized.
 * Messages arriving in these rooms won't increment the unread counter.
 */
export function useChatGlobalRealtime(activeRoomIds: string[]) {
  const qc               = useQueryClient()
  // Stable Supabase client — created ONCE for the lifetime of this hook
  const supabaseRef      = useRef(createClient())
  // Always-current active rooms without recreating the subscription
  const activeRoomIdsRef = useRef(activeRoomIds)
  useEffect(() => { activeRoomIdsRef.current = activeRoomIds }, [activeRoomIds])

  useEffect(() => {
    const supabase = supabaseRef.current

    const channel = supabase
      .channel("chat-global")
      .on(
        "postgres_changes",
        // No room filter here — RLS ensures we only receive rows we can SELECT
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg         = payload.new as ChatMessage
          const currentRoomIds = activeRoomIdsRef.current

          // Look up sender name from the already-cached users list (zero extra fetch)
          const users      = qc.getQueryData<ChatUser[]>(chatKeys.users())
          const senderName = users?.find((u) => u.id === newMsg.sender_id)?.full_name ?? undefined
          const msgWithName: ChatMessage = { ...newMsg, sender_name: senderName }

          // ── 1. Inject into any open (non-minimized) room's message list ──
          const isInActiveRoom = currentRoomIds.includes(newMsg.room_id)
          if (isInActiveRoom) {
            qc.setQueryData(chatKeys.messages(newMsg.room_id), (old: unknown) => {
              const data = old as
                | { pages: { messages: ChatMessage[]; nextCursor: string | null }[]; pageParams: unknown[] }
                | undefined
              if (!data?.pages?.length) return data

              const firstPage = data.pages[0]
              const allMsgs   = firstPage.messages

              // Replace optimistic placeholder if one exists for this content
              const optIdx = allMsgs.findIndex(
                (m) => m.id.startsWith("optimistic-") && m.content === newMsg.content
              )

              let newMessages: ChatMessage[]
              if (optIdx !== -1) {
                newMessages = allMsgs.map((m, i) => (i === optIdx ? msgWithName : m))
              } else {
                // Avoid duplicates (can happen when page is first loaded)
                if (allMsgs.some((m) => m.id === newMsg.id)) return data
                newMessages = [msgWithName, ...allMsgs]
              }

              return {
                ...data,
                pages: [{ ...firstPage, messages: newMessages }, ...data.pages.slice(1)],
              }
            })
          }

          // ── 2. Update sidebar: last_message preview + unread count ────────
          qc.setQueryData(chatKeys.rooms(), (old: unknown) => {
            const rooms = old as ChatRoom[] | undefined
            if (!rooms) {
              // Room not in cache yet (e.g. someone added us to a new group) — refetch
              qc.invalidateQueries({ queryKey: chatKeys.rooms() })
              return rooms
            }

            const roomExists = rooms.some((r) => r.id === newMsg.room_id)
            if (!roomExists) {
              qc.invalidateQueries({ queryKey: chatKeys.rooms() })
              return rooms
            }

            const isActiveRoom = currentRoomIds.includes(newMsg.room_id)

            const updated = rooms.map((room) => {
              if (room.id !== newMsg.room_id) return room
              return {
                ...room,
                last_message: msgWithName,
                // Only increment if this room is NOT currently open
                unread_count: isActiveRoom ? 0 : (room.unread_count ?? 0) + 1,
              }
            })

            // Show OS notification when tab is hidden and room is not active
            if (!isActiveRoom && typeof document !== 'undefined' && document.hidden) {
              const room    = rooms.find((r) => r.id === newMsg.room_id)
              const roomName = room?.name || 'Chat'
              navigator.serviceWorker?.controller?.postMessage({
                type:  'SHOW_NOTIFICATION',
                title: senderName ? `${senderName} in ${roomName}` : roomName,
                body:  (newMsg.content || '').slice(0, 120),
                url:   '/chat',
                tag:   `chat-${newMsg.room_id}`,
              })
            }

            // Re-sort by last message time (most recent at top)
            return [...updated].sort((a, b) => {
              const tA = (a.last_message as { created_at: string } | null)?.created_at ?? a.created_at
              const tB = (b.last_message as { created_at: string } | null)?.created_at ?? b.created_at
              return new Date(tB).getTime() - new Date(tA).getTime()
            })
          })
        }
      )
      .subscribe((status, err) => {
        if (err)   console.error("[chat-global] realtime error:", err)
        if (status === "SUBSCRIBED") console.log("[chat-global] realtime connected ✓")
      })

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ← intentionally empty: subscription created ONCE
}
