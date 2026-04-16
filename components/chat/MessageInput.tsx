"use client"

import { useRef, useState, useCallback } from "react"
import { SendHorizonal } from "lucide-react"
import { useSendMessage } from "@/lib/hooks/useChat"
import { MentionDropdown } from "@/components/chat/MentionDropdown"
import { EnquiryCommandPalette } from "@/components/chat/EnquiryCommandPalette"
import {
  detectTrigger,
  insertMentionToken,
  insertEnquiryToken,
  parseMessageForSend,
} from "@/lib/utils/chatParser"
import { cn } from "@/lib/utils"
import type { ChatMember, EnquirySearchResult } from "@/lib/types/chat"

interface TriggerState {
  type: "mention" | "enquiry"
  search: string
}

interface Props {
  roomId: string
  members: ChatMember[]
  currentUserId: string
}

export function MessageInput({ roomId, members, currentUserId }: Props) {
  const [value,   setValue]   = useState("")
  const [trigger, setTrigger] = useState<TriggerState | null>(null)
  const textareaRef            = useRef<HTMLTextAreaElement>(null)
  const wrapperRef             = useRef<HTMLDivElement>(null)

  const sendMessage = useSendMessage(roomId)

  // Get bounding rect of the textarea wrapper for dropdown positioning
  const getAnchorRect = useCallback((): DOMRect | null => {
    return wrapperRef.current?.getBoundingClientRect() ?? null
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value
    setValue(newValue)

    const cursor = e.target.selectionStart ?? newValue.length
    const detected = detectTrigger(newValue, cursor)
    setTrigger(detected)

    // Auto-grow textarea
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = "auto"
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // If a dropdown is open, let keyboard events go to the dropdown
    if (trigger) return

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submitMessage()
    }
  }

  function submitMessage() {
    const trimmed = value.trim()
    if (!trimmed || sendMessage.isPending) return

    const { mentions, enquiry_refs } = parseMessageForSend(trimmed)

    sendMessage.mutate(
      { content: trimmed, mentions, enquiry_refs },
      {
        onSuccess: () => {
          setValue("")
          setTrigger(null)
          const ta = textareaRef.current
          if (ta) ta.style.height = "auto"
          ta?.focus()
        },
      }
    )
  }

  function handleSelectMention(member: ChatMember) {
    if (!textareaRef.current) return
    const cursor = textareaRef.current.selectionStart ?? value.length
    const { newValue, newCursor } = insertMentionToken(value, cursor, member.full_name ?? "", member.user_id)
    setValue(newValue)
    setTrigger(null)
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursor, newCursor)
      }
    })
  }

  function handleSelectEnquiry(result: EnquirySearchResult) {
    if (!textareaRef.current) return
    const cursor = textareaRef.current.selectionStart ?? value.length
    const { newValue, newCursor } = insertEnquiryToken(value, cursor, result.ref_no, result.id)
    setValue(newValue)
    setTrigger(null)
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursor, newCursor)
      }
    })
  }

  const anchorRect = trigger ? getAnchorRect() : null

  return (
    <div ref={wrapperRef} className="relative">
      {/* Mention dropdown */}
      {trigger?.type === "mention" && (
        <MentionDropdown
          search={trigger.search}
          members={members}
          onSelect={handleSelectMention}
          onClose={() => setTrigger(null)}
          anchorRect={anchorRect}
        />
      )}

      {/* Enquiry command palette */}
      {trigger?.type === "enquiry" && (
        <EnquiryCommandPalette
          search={trigger.search}
          onSelect={handleSelectEnquiry}
          onClose={() => setTrigger(null)}
          anchorRect={anchorRect}
        />
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Message… (@ to mention, / to link enquiry)`}
            className={cn(
              "w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5",
              "text-sm leading-relaxed placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
              "min-h-[40px] max-h-[160px] overflow-y-auto"
            )}
          />

          {/* Hint badges */}
          {value === "" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <span className="text-[9px] text-muted-foreground/50 font-mono bg-muted rounded px-1">@</span>
              <span className="text-[9px] text-muted-foreground/50 font-mono bg-muted rounded px-1">/</span>
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={submitMessage}
          disabled={!value.trim() || sendMessage.isPending}
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
            "bg-primary text-primary-foreground",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "hover:bg-primary/90 active:scale-95"
          )}
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </div>

      {/* Helper text */}
      <div className="flex items-center justify-between mt-1 px-0.5">
        <p className="text-[10px] text-muted-foreground/60">
          Enter to send &nbsp;·&nbsp; Shift+Enter for new line
        </p>
        {sendMessage.isError && (
          <p className="text-[10px] text-destructive">Failed to send — try again</p>
        )}
      </div>
    </div>
  )
}
