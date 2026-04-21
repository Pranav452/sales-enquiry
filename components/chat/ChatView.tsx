"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { ChatSidebar } from "@/components/chat/ChatSidebar"
import { ChatRoom } from "@/components/chat/ChatRoom"

interface Props {
  initialRoomId?: string | null
}

export function ChatView({ initialRoomId = null }: Props) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — room + user list */}
      <ChatSidebar
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
      />

      {/* Right panel — full chat view */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedRoomId ? (
          <ChatRoom key={selectedRoomId} roomId={selectedRoomId} />
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
        <MessageSquare className="h-8 w-8 opacity-40" />
      </div>
      <div className="text-center">
        <p className="font-medium text-foreground text-sm">No conversation selected</p>
        <p className="text-xs mt-1">
          Choose from the left, or hover a name to pop it out
        </p>
      </div>
    </div>
  )
}
