"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { ChatSidebar } from "@/components/chat/ChatSidebar"
import { ChatRoom } from "@/components/chat/ChatRoom"
import { useChatGlobalRealtime } from "@/components/chat/useChatGlobalRealtime"

export function ChatView() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  // Single global subscription — lives for the lifetime of the chat page,
  // handles ALL rooms (messages + sidebar unread counts).
  useChatGlobalRealtime(selectedRoomId)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — users + rooms list */}
      <ChatSidebar
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
      />

      {/* Right panel — message area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedRoomId ? (
          <ChatRoom
            key={selectedRoomId}
            roomId={selectedRoomId}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
        <MessageSquare className="h-8 w-8" />
      </div>
      <div className="text-center">
        <p className="font-medium text-foreground">No conversation selected</p>
        <p className="text-sm mt-1">Choose a person or group from the left to start chatting</p>
      </div>
    </div>
  )
}
