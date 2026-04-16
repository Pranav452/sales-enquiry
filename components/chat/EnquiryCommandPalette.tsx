"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, Loader2, Search } from "lucide-react"
import { useEnquirySearch } from "@/lib/hooks/useChat"
import { cn } from "@/lib/utils"
import type { EnquirySearchResult } from "@/lib/types/chat"

interface Props {
  search: string
  onSelect: (result: EnquirySearchResult) => void
  onClose: () => void
  anchorRect: DOMRect | null
}

export function EnquiryCommandPalette({ search, onSelect, onClose, anchorRect }: Props) {
  const { data = [], isLoading } = useEnquirySearch(search)
  const [activeIdx, setActiveIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setActiveIdx(0) }, [search])

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!["ArrowUp", "ArrowDown", "Enter", "Escape", "Tab"].includes(e.key)) return
      e.preventDefault()
      e.stopPropagation()

      if (e.key === "Escape" || e.key === "Tab") { onClose(); return }
      if (e.key === "ArrowDown") { setActiveIdx((i) => Math.min(i + 1, data.length - 1)); return }
      if (e.key === "ArrowUp")   { setActiveIdx((i) => Math.max(i - 1, 0)); return }
      if (e.key === "Enter" && data[activeIdx]) { onSelect(data[activeIdx]); return }
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [data, activeIdx, onSelect, onClose])

  // Click outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [onClose])

  // Position above the input
  const style: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        bottom:   `${window.innerHeight - anchorRect.top + 6}px`,
        left:     `${anchorRect.left}px`,
        minWidth: "260px",
        maxWidth: "360px",
        zIndex:   100,
      }
    : { position: "fixed", bottom: "80px", left: "320px", zIndex: 100 }

  const showEmpty = !isLoading && search.length >= 2 && data.length === 0
  const showHint  = search.length < 2

  return (
    <div
      ref={listRef}
      style={style}
      className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Link Enquiry
        </span>
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />}
      </div>

      {/* Content */}
      {showHint && (
        <div className="px-3 py-2.5 text-xs text-muted-foreground">
          Type 2+ characters to search enquiry ref&hellip;
        </div>
      )}

      {showEmpty && (
        <div className="px-3 py-2.5 text-xs text-muted-foreground">
          No enquiries found for &ldquo;{search}&rdquo;
        </div>
      )}

      {data.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(item)
          }}
          onMouseEnter={() => setActiveIdx(i)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors text-sm",
            i === activeIdx ? "bg-accent" : "hover:bg-accent"
          )}
        >
          <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{item.ref_no}</p>
            <p className="text-[10px] text-muted-foreground">ID: {item.id}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
