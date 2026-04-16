// ─── Token format ────────────────────────────────────────────────────────────
// Mentions : @[Full Name](uuid)
// Enquiries: /[ENQ-REF-001](123)   ← 123 is the MSSQL integer ENQ_ID
// ─────────────────────────────────────────────────────────────────────────────

export type MessageSegment =
  | { type: "text";    value: string }
  | { type: "mention"; name: string; userId: string }
  | { type: "enquiry"; refNo: string; enquiryId: string }

const MENTION_RE  = /@\[([^\]]+)\]\(([^)]+)\)/g
const ENQUIRY_RE  = /\/\[([^\]]+)\]\(([^)]+)\)/g
const COMBINED_RE = /@\[([^\]]+)\]\(([^)]+)\)|\/\[([^\]]+)\]\(([^)]+)\)/g

/**
 * Parse a message before sending — extract mention UUIDs and enquiry ref numbers.
 */
export function parseMessageForSend(content: string): {
  mentions: string[]
  enquiry_refs: string[]
} {
  const mentions: string[] = []
  const enquiry_refs: string[] = []

  let m: RegExpExecArray | null
  const mr = new RegExp(MENTION_RE.source, "g")
  while ((m = mr.exec(content)) !== null) mentions.push(m[2])

  const er = new RegExp(ENQUIRY_RE.source, "g")
  while ((m = er.exec(content)) !== null) enquiry_refs.push(m[1])

  return {
    mentions: [...new Set(mentions)],
    enquiry_refs: [...new Set(enquiry_refs)],
  }
}

/**
 * Parse message content into renderable segments for MessageItem.
 */
export function parseMessageContent(content: string): MessageSegment[] {
  const segments: MessageSegment[] = []
  const re = new RegExp(COMBINED_RE.source, "g")
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) })
    }
    if (match[0].startsWith("@")) {
      segments.push({ type: "mention", name: match[1], userId: match[2] })
    } else {
      segments.push({ type: "enquiry", refNo: match[3], enquiryId: match[4] })
    }
    lastIndex = re.lastIndex
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) })
  }

  return segments
}

/**
 * Detect trigger character at current cursor position.
 * Returns { type: "mention"|"enquiry", search: string } or null.
 */
export function detectTrigger(
  value: string,
  cursorPos: number
): { type: "mention" | "enquiry"; search: string } | null {
  const textUpToCursor = value.slice(0, cursorPos)
  const mentionMatch = textUpToCursor.match(/@([a-zA-Z\s]*)$/)
  if (mentionMatch) return { type: "mention", search: mentionMatch[1].trim() }
  const enquiryMatch = textUpToCursor.match(/\/([A-Za-z0-9-]*)$/)
  if (enquiryMatch) return { type: "enquiry", search: enquiryMatch[1] }
  return null
}

/**
 * Replace "@search" at the cursor with "@[Name](uuid)".
 */
export function insertMentionToken(
  value: string,
  cursorPos: number,
  name: string,
  userId: string
): { newValue: string; newCursor: number } {
  const before = value.slice(0, cursorPos)
  const after  = value.slice(cursorPos)
  const token  = `@[${name}](${userId}) `
  const newBefore = before.replace(/@([a-zA-Z\s]*)$/, token)
  return { newValue: newBefore + after, newCursor: newBefore.length }
}

/**
 * Replace "/search" at the cursor with "/[REF](id)".
 */
export function insertEnquiryToken(
  value: string,
  cursorPos: number,
  refNo: string,
  enquiryId: number
): { newValue: string; newCursor: number } {
  const before = value.slice(0, cursorPos)
  const after  = value.slice(cursorPos)
  const token  = `/[${refNo}](${enquiryId}) `
  const newBefore = before.replace(/\/([A-Za-z0-9-]*)$/, token)
  return { newValue: newBefore + after, newCursor: newBefore.length }
}
