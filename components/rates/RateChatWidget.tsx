"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, Loader2, Bot, User, ChevronDown } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface Props {
  origin?: string
  dest?: string
}

const SUGGESTIONS = [
  "Which shipping line is fastest to Kenya?",
  "Compare all rates to South Africa",
  "What does EFS surcharge mean?",
  "Best rate to Brazil right now?",
  "Which rates expire soon?",
]

export function RateChatWidget({ origin, dest }: Props) {
  const [open,     setOpen]     = useState(false)
  const [input,    setInput]    = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your freight rate analyst. Ask me anything about shipping rates, routes, or surcharges — I have access to all live rate data.\n\nWhat can I help you with?",
    },
  ])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function sendMessage(text?: string) {
    const userText = (text ?? input).trim()
    if (!userText || loading) return

    setInput("")
    setError(null)

    const userMsg: Message = { role: "user", content: userText }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setLoading(true)

    try {
      const res = await fetch("/api/rates/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: newHistory.slice(-10),
          origin,
          dest,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Request failed")

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Format message content with basic markdown-like rendering
  function formatContent(text: string) {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <li key={i} className="ml-3 list-disc">
            {line.slice(2)}
          </li>
        )
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>
      }
      if (line === "") return <br key={i} />
      return <p key={i}>{line}</p>
    })
  }

  return (
    <>
      {/* ── Chat Panel ─────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] max-h-[600px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <div>
                <p className="text-sm font-semibold leading-none">Rate Analyst</p>
                <p className="text-xs opacity-75 mt-0.5">Powered by live rate data</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md opacity-75 hover:opacity-100 transition-opacity"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed space-y-0.5 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                >
                  {formatContent(msg.content)}
                </div>
                {msg.role === "user" && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only show if only 1 message = initial greeting) */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs rounded-full border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border px-3 py-2.5 flex items-end gap-2 shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about rates, routes, surcharges..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring max-h-24 overflow-y-auto"
              style={{ minHeight: "36px" }}
              onInput={(e) => {
                const t = e.currentTarget
                t.style.height = "auto"
                t.style.height = Math.min(t.scrollHeight, 96) + "px"
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/50 pb-1.5 shrink-0">
            Answers based on live rate database only
          </p>
        </div>
      )}

      {/* ── Floating Button ─────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-4 right-4 z-50 h-13 w-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? "bg-muted text-muted-foreground hover:bg-muted/80"
            : "bg-primary text-primary-foreground hover:opacity-90 scale-100 hover:scale-105"
        }`}
        title="Rate Analyst Chat"
        style={{ height: "52px", width: "52px" }}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
        {!open && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </button>
    </>
  )
}
