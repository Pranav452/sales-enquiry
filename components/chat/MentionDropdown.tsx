"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { ChatMember } from "@/lib/types/chat"

interface Props {
  search: string
  members: ChatMember[]
  onSelect: (member: ChatMember) => void
  onClose: () => void
  anchorRect: DOMRect | null
}

export function MentionDropdown({ search, members, onSelect, onClose, anchorRect }: Props) {
  const filtered = members.filter((m) =>
    (m.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6)

  const [activeIdx, setActiveIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset active index when search changes
  useEffect(() => { setActiveIdx(0) }, [search])

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!["ArrowUp", "ArrowDown", "Enter", "Escape", "Tab"].includes(e.key)) return
      e.preventDefault()
      e.stopPropagation()

      if (e.key === "Escape" || e.key === "Tab") { onClose(); return }
      if (e.key === "ArrowDown") { setActiveIdx((i) => (i + 1) % filtered.length); return }
      if (e.key === "ArrowUp")   { setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length); return }
      if (e.key === "Enter" && filtered[activeIdx]) { onSelect(filtered[activeIdx]); return }
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [filtered, activeIdx, onSelect, onClose])

  // Click outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [onClose])

  if (filtered.length === 0) return null

  // Position above the input
  const style: React.CSSProperties = anchorRect
    ? {
        position:  "fixed",
        bottom:    `${window.innerHeight - anchorRect.top + 6}px`,
        left:      `${anchorRect.left}px`,
        minWidth:  "220px",
        maxWidth:  "320px",
        zIndex:    100,
      }
    : { position: "fixed", bottom: "80px", left: "320px", zIndex: 100 }

  return (
    <div
      ref={listRef}
      style={style}
      className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
    >
      <div className="px-2.5 py-1.5 border-b border-border">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Mention
        </span>
      </div>
      {filtered.map((member, i) => {
        const initials = (member.full_name ?? "?")
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()

        return (
          <button
            key={member.user_id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault() // prevent textarea blur
              onSelect(member)
            }}
            onMouseEnter={() => setActiveIdx(i)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors text-sm",
              i === activeIdx ? "bg-accent" : "hover:bg-accent"
            )}
          >
            <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {initials}
            </div>
            <span className="truncate font-medium">{member.full_name}</span>
          </button>
        )
      })}
    </div>
  )
}
