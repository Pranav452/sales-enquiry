"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { SendHorizonal, FileText } from "lucide-react"
import { useSendMessage } from "@/lib/hooks/useChat"
import { MentionDropdown } from "@/components/chat/MentionDropdown"
import { EnquiryCommandPalette } from "@/components/chat/EnquiryCommandPalette"
import { cn } from "@/lib/utils"
import type { ChatMember, EnquirySearchResult } from "@/lib/types/chat"

// ─── Types ────────────────────────────────────────────────────────────────────
interface TriggerState {
  type: "mention" | "enquiry"
  search: string
  anchorRect: DOMRect
}

interface Props {
  roomId: string
  members: ChatMember[]
  currentUserId: string
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

/** Get the text in the current text node up to the cursor. */
function getTextBeforeCursor(): string {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return ""
  const range = sel.getRangeAt(0)
  if (range.startContainer.nodeType !== Node.TEXT_NODE) return ""
  return (range.startContainer.textContent ?? "").slice(0, range.startOffset)
}

/** Get cursor DOMRect for positioning dropdowns. */
function getCursorRect(): DOMRect | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  return sel.getRangeAt(0).getBoundingClientRect()
}

/** Insert any DOM node at the current cursor position. */
function insertNodeAtCursor(node: Node) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  range.deleteContents()
  range.insertNode(node)
  range.setStartAfter(node)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

/** Replace the trigger fragment (@search or /search) at cursor with a pill span. */
function replaceTriggerWithPill(
  triggerType: "mention" | "enquiry",
  pillEl: HTMLSpanElement
) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range   = sel.getRangeAt(0)
  const textNode = range.startContainer
  if (textNode.nodeType !== Node.TEXT_NODE) return

  const text        = textNode.textContent ?? ""
  const cursorPos   = range.startOffset
  const textBefore  = text.slice(0, cursorPos)

  // Find the trigger start position
  const pattern = triggerType === "mention" ? /@([a-zA-Z\s]*)$/ : /\/([A-Za-z0-9/\-]*)$/
  const match   = textBefore.match(pattern)
  if (!match) return

  const triggerStart = cursorPos - match[0].length

  // Split the text node at the trigger start
  const before  = text.slice(0, triggerStart)
  const after   = text.slice(cursorPos)

  // Rebuild: text-before + pill + space + text-after
  const parent       = textNode.parentNode!
  const beforeNode   = document.createTextNode(before)
  const spaceNode    = document.createTextNode("\u00A0") // non-breaking space after pill
  const afterNode    = document.createTextNode(after)

  parent.replaceChild(afterNode, textNode)
  parent.insertBefore(spaceNode, afterNode)
  parent.insertBefore(pillEl, spaceNode)
  parent.insertBefore(beforeNode, pillEl)

  // Place cursor after the space
  const newRange = document.createRange()
  newRange.setStart(spaceNode, spaceNode.length)
  newRange.collapse(true)
  sel.removeAllRanges()
  sel.addRange(newRange)
}

/** Walk the editor DOM and extract { content, mentions, enquiry_refs }. */
function extractContent(editor: HTMLDivElement): {
  content: string
  mentions: string[]
  enquiry_refs: string[]
} {
  const mentions: string[] = []
  const enquiry_refs: string[] = []
  let content = ""

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Replace non-breaking spaces with regular spaces
      content += (node.textContent ?? "").replace(/\u00A0/g, " ")
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.getAttribute("data-type") === "mention") {
        const userId = el.getAttribute("data-user-id") ?? ""
        const name   = el.getAttribute("data-name") ?? ""
        content += `@[${name}](${userId})`
        if (userId) mentions.push(userId)
      } else if (el.getAttribute("data-type") === "enquiry") {
        const enquiryId = el.getAttribute("data-enq-id") ?? ""
        const refNo     = el.getAttribute("data-ref-no") ?? ""
        content += `/[${refNo}](${enquiryId})`
        if (refNo) enquiry_refs.push(refNo)
      } else if (el.tagName === "BR") {
        content += "\n"
      } else {
        el.childNodes.forEach(walk)
        // Block-level elements add a newline after
        if (["DIV", "P"].includes(el.tagName)) content += "\n"
      }
    }
  }

  editor.childNodes.forEach(walk)
  return {
    content: content.trim(),
    mentions:     [...new Set(mentions)],
    enquiry_refs: [...new Set(enquiry_refs)],
  }
}

/** Check if the editor has any visible content (text or pills). */
function editorIsEmpty(editor: HTMLDivElement | null): boolean {
  if (!editor) return true
  const text  = (editor.textContent ?? "").replace(/\u00A0/g, "").trim()
  const pills = editor.querySelectorAll("[data-type]").length
  return text === "" && pills === 0
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MessageInput({ roomId, members, currentUserId }: Props) {
  const editorRef     = useRef<HTMLDivElement>(null)
  const [isEmpty, setIsEmpty]   = useState(true)
  const [trigger, setTrigger]   = useState<TriggerState | null>(null)

  const sendMessage = useSendMessage(roomId, currentUserId)

  // ── Detect @ / trigger at cursor ───────────────────────────────────────────
  const detectTrigger = useCallback(() => {
    const textBefore = getTextBeforeCursor()
    const rect       = getCursorRect()

    const mentionMatch  = textBefore.match(/@([a-zA-Z\s]*)$/)
    if (mentionMatch && rect) {
      setTrigger({ type: "mention", search: mentionMatch[1].trim(), anchorRect: rect })
      return
    }
    const enquiryMatch = textBefore.match(/\/([A-Za-z0-9/\-]*)$/)
    if (enquiryMatch && rect) {
      setTrigger({ type: "enquiry", search: enquiryMatch[1], anchorRect: rect })
      return
    }
    setTrigger(null)
  }, [])

  // ── Handle input changes ────────────────────────────────────────────────────
  function handleInput() {
    detectTrigger()
    setIsEmpty(editorIsEmpty(editorRef.current))
  }

  // ── Handle keyboard ─────────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Let dropdowns intercept ArrowUp/Down/Enter/Escape first
    if (trigger) return

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submitMessage()
    }
    // Shift+Enter → let browser insert <br> naturally in contentEditable
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  function submitMessage() {
    const editor = editorRef.current
    if (!editor || editorIsEmpty(editor) || sendMessage.isPending) return

    const { content, mentions, enquiry_refs } = extractContent(editor)
    if (!content) return

    // ← Clear IMMEDIATELY so the input feels instant
    editor.innerHTML = ""
    setIsEmpty(true)
    setTrigger(null)
    editor.focus()

    sendMessage.mutate({ content, mentions, enquiry_refs })
  }

  // ── Insert mention pill ─────────────────────────────────────────────────────
  function handleSelectMention(member: ChatMember) {
    const pill = document.createElement("span")
    pill.setAttribute("contenteditable", "false")
    pill.setAttribute("data-type", "mention")
    pill.setAttribute("data-user-id", member.user_id)
    pill.setAttribute("data-name", member.full_name ?? "")
    pill.className =
      "inline-flex items-center rounded px-1.5 py-0.5 text-sm font-semibold " +
      "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 " +
      "mx-0.5 cursor-default select-none align-baseline"
    pill.textContent = `@${member.full_name}`

    replaceTriggerWithPill("mention", pill)
    setTrigger(null)
    setIsEmpty(false)
    editorRef.current?.focus()
  }

  // ── Insert enquiry pill ─────────────────────────────────────────────────────
  function handleSelectEnquiry(result: EnquirySearchResult) {
    const pill = document.createElement("span")
    pill.setAttribute("contenteditable", "false")
    pill.setAttribute("data-type", "enquiry")
    pill.setAttribute("data-enq-id", String(result.id))
    pill.setAttribute("data-ref-no", result.ref_no)
    pill.className =
      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium " +
      "bg-blue-50 dark:bg-blue-950 text-primary border border-primary/20 " +
      "mx-0.5 cursor-default select-none align-baseline"

    // Add a tiny file icon via text (emoji-free)
    const iconSpan = document.createElement("span")
    iconSpan.textContent = "↗"
    iconSpan.className = "text-[10px] opacity-60"
    pill.appendChild(iconSpan)

    const labelSpan = document.createElement("span")
    labelSpan.textContent = result.ref_no
    pill.appendChild(labelSpan)

    replaceTriggerWithPill("enquiry", pill)
    setTrigger(null)
    setIsEmpty(false)
    editorRef.current?.focus()
  }

  // ── Paste: strip HTML, only allow plain text ────────────────────────────────
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, text)
    detectTrigger()
    setIsEmpty(editorIsEmpty(editorRef.current))
  }

  // ── Anchor rect for dropdowns: use cursor rect or fallback to editor bottom ─
  function getAnchorRect(): DOMRect | null {
    return trigger?.anchorRect ?? editorRef.current?.getBoundingClientRect() ?? null
  }

  return (
    <div className="relative">
      {/* Mention dropdown */}
      {trigger?.type === "mention" && (
        <MentionDropdown
          search={trigger.search}
          members={members}
          onSelect={handleSelectMention}
          onClose={() => setTrigger(null)}
          anchorRect={getAnchorRect()}
        />
      )}

      {/* Enquiry command palette */}
      {trigger?.type === "enquiry" && (
        <EnquiryCommandPalette
          search={trigger.search}
          onSelect={handleSelectEnquiry}
          onClose={() => setTrigger(null)}
          anchorRect={getAnchorRect()}
        />
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* ContentEditable editor */}
        <div className="relative flex-1">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className={cn(
              "min-h-[40px] max-h-[160px] overflow-y-auto",
              "w-full rounded-xl border border-input bg-background px-3.5 py-2.5",
              "text-sm leading-relaxed",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
              "break-words whitespace-pre-wrap",
              // Placeholder via CSS when empty
              "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:pointer-events-none"
            )}
            data-placeholder="Message… (@ to mention, / to link enquiry)"
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={submitMessage}
          disabled={isEmpty || sendMessage.isPending}
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
            "bg-primary text-primary-foreground",
            "disabled:opacity-35 disabled:cursor-not-allowed",
            "hover:bg-primary/90 active:scale-95"
          )}
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </div>

      {/* Error feedback */}
      {sendMessage.isError && (
        <p className="text-[10px] text-destructive mt-1 px-0.5">
          Failed to send — {sendMessage.error?.message}
        </p>
      )}
      <p className="text-[10px] text-muted-foreground/40 mt-1 px-0.5">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}
