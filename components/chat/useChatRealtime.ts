"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { chatKeys } from "@/lib/hooks/useChat"
import type { ChatMessage } from "@/lib/types/chat"

export function useChatRealtime(roomId: string | null) {
  const qc      = useQueryClient()
  const supabase = createClient()
  // Keep a stable ref so the effect cleanup can call removeChannel
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage

          qc.setQueryData(chatKeys.messages(roomId), (old: unknown) => {
            const data = old as
              | {
                  pages: { messages: ChatMessage[]; nextCursor: string | null }[]
                  pageParams: unknown[]
                }
              | undefined

            if (!data || !data.pages.length) return data

            const firstPage = data.pages[0]
            const allMsgs   = firstPage.messages

            // Deduplicate: replace the optimistic placeholder if it matches
            const optimisticIdx = allMsgs.findIndex(
              (m) =>
                m.id.startsWith("optimistic-") &&
                m.sender_id === "__optimistic__" &&
                m.content === newMsg.content
            )

            let newMessages: ChatMessage[]
            if (optimisticIdx !== -1) {
              // Replace optimistic entry with the real message
              newMessages = allMsgs.map((m, i) =>
                i === optimisticIdx ? newMsg : m
              )
            } else {
              // Prepend new message from another user
              newMessages = [newMsg, ...allMsgs]
            }

            return {
              ...data,
              pages: [
                { ...firstPage, messages: newMessages },
                ...data.pages.slice(1),
              ],
            }
          })

          // Update room list (last_message preview + ordering)
          qc.invalidateQueries({ queryKey: chatKeys.rooms() })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])
}
