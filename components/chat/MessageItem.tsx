"use client"

import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { parseMessageContent } from "@/lib/utils/chatParser"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/types/chat"

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

interface Props {
  message: ChatMessage
  currentUserId: string
  /** Show sender name above bubble (relevant in group chats) */
  showSenderName?: boolean
}

export function MessageItem({ message, currentUserId, showSenderName }: Props) {
  const router  = useRouter()
  const isOwn   = message.sender_id === currentUserId
  const segments = parseMessageContent(message.content)

  return (
    <div className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
      {/* Sender name (shown for others in groups) */}
      {showSenderName && !isOwn && message.sender_name && (
        <span className="text-[11px] text-muted-foreground px-1">
          {message.sender_name}
        </span>
      )}

      <div
        className={cn(
          "max-w-[72%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return <span key={i}>{seg.value}</span>
          }

          if (seg.type === "mention") {
            return (
              <span
                key={i}
                className={cn(
                  "font-semibold rounded px-0.5",
                  isOwn
                    ? "text-white/90 underline decoration-dotted"
                    : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50"
                )}
              >
                @{seg.name}
              </span>
            )
          }

          if (seg.type === "enquiry") {
            return (
              <button
                key={i}
                type="button"
                onClick={() => router.push(`/enquiry?edit=${seg.enquiryId}`)}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors mx-0.5",
                  "cursor-pointer",
                  isOwn
                    ? "bg-white/20 text-white hover:bg-white/30"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                <FileText className="h-3 w-3 flex-shrink-0" />
                {seg.refNo}
              </button>
            )
          }

          return null
        })}
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-muted-foreground px-1">
        {formatTime(message.created_at)}
      </span>
    </div>
  )
}
