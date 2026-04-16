"use client"

import { useEffect, useRef, useCallback } from "react"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import { Loader2, Users, User } from "lucide-react"
import { useMessages, useRooms } from "@/lib/hooks/useChat"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useChatRealtime } from "@/components/chat/useChatRealtime"
import { MessageItem } from "@/components/chat/MessageItem"
import { MessageInput } from "@/components/chat/MessageInput"
import type { ChatMember, ChatMessage } from "@/lib/types/chat"

interface Props {
  roomId: string
}

export function ChatRoom({ roomId }: Props) {
  useChatRealtime(roomId)

  const { data: rooms = [] } = useRooms()
  const currentUser          = useCurrentUser()
  const currentUserId        = currentUser?.id ?? null
  const bottomRef              = useRef<HTMLDivElement>(null)
  const topSentinelRef         = useRef<HTMLDivElement>(null)
  const viewportRef            = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages(roomId)

  // Find room details from rooms cache
  const room    = rooms.find((r) => r.id === roomId)
  const members: ChatMember[] = room?.members ?? []
  const isGroup = room?.type === "group"

  // Flatten pages: pages are newest-first per page; we want oldest at top
  const allMessages: ChatMessage[] = []
  if (data?.pages) {
    const pages = [...data.pages].reverse() // oldest page first
    for (const page of pages) {
      allMessages.push(...[...page.messages].reverse()) // oldest message first within page
    }
  }

  // Scroll to bottom on initial load and when the current user sends a message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [data?.pages[0]?.messages[0]?.id])

  // Infinite scroll — load older messages when sentinel enters viewport
  const handleSentinel = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        const viewport = viewportRef.current
        const prevScrollHeight = viewport?.scrollHeight ?? 0

        fetchNextPage().then(() => {
          // Preserve scroll position after older messages load
          requestAnimationFrame(() => {
            if (viewport) {
              viewport.scrollTop += viewport.scrollHeight - prevScrollHeight
            }
          })
        })
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  useEffect(() => {
    const el = topSentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(handleSentinel, { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [handleSentinel])

  // Room display name
  let roomDisplayName = room?.name ?? "Chat"
  if (room?.type === "direct" && currentUserId) {
    const other = members.find((m) => m.user_id !== currentUserId)
    if (other?.full_name) roomDisplayName = other.full_name
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border flex-shrink-0 bg-card">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          {isGroup ? (
            <Users className="h-4 w-4 text-muted-foreground" />
          ) : (
            <User className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">{roomDisplayName}</p>
          <p className="text-xs text-muted-foreground leading-tight">
            {isGroup
              ? `${members.length} member${members.length !== 1 ? "s" : ""}`
              : members.find((m) => m.user_id !== currentUserId)?.email ?? ""}
          </p>
        </div>
      </div>

      {/* Message list */}
      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport ref={viewportRef} className="h-full w-full">
          <div className="flex flex-col gap-3 px-5 py-4 min-h-full">
            {/* Top sentinel for infinite scroll */}
            <div ref={topSentinelRef} className="h-1" />

            {/* Loading older messages */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Initial load */}
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                No messages yet. Say hello!
              </div>
            ) : (
              allMessages.map((msg, idx) => {
                // Show sender name in groups or when it changes
                const prevMsg     = allMessages[idx - 1]
                const showSender  = isGroup && msg.sender_id !== prevMsg?.sender_id
                return (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    currentUserId={currentUserId ?? ""}
                    showSenderName={showSender}
                  />
                )
              })
            )}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex select-none touch-none p-0.5 bg-transparent transition-colors w-2">
          <ScrollArea.Thumb className="flex-1 bg-border rounded-full" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3">
        <MessageInput
          roomId={roomId}
          members={members}
          currentUserId={currentUserId ?? ""}
        />
      </div>
    </div>
  )
}
