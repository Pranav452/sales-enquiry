"use client"

import { MessageSquare } from "lucide-react"
import { ChatSidebar } from "@/components/chat/ChatSidebar"

export function ChatView() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — room + user list */}
      <ChatSidebar />

      {/* Right panel — informational empty state */}
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 bg-background">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <MessageSquare className="h-8 w-8 opacity-40" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground text-sm">Select a conversation</p>
          <p className="text-xs mt-1 text-muted-foreground">
            Chats open as pop-up panels at the bottom of your screen
          </p>
        </div>
      </div>
    </div>
  )
}
