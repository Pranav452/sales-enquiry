"use client"

import { useEffect, useRef, useState } from "react"
import { Calculator, X, Delete, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Op = "+" | "-" | "×" | "÷"

interface HistoryEntry {
  expression: string
  result: string
}

const MAX_HISTORY = 8

function formatNumber(n: number): string {
  if (!isFinite(n)) return "Error"
  // Avoid floating point noise (0.1 + 0.2 = 0.30000000000000004)
  const rounded = Math.round(n * 1e10) / 1e10
  if (Math.abs(rounded) >= 1e15) return rounded.toExponential(6)
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 10 })
}

function applyOp(a: number, b: number, op: Op): number {
  switch (op) {
    case "+": return a + b
    case "-": return a - b
    case "×": return a * b
    case "÷": return b === 0 ? NaN : a / b
  }
}

export function CalculatorWidget() {
  const [open, setOpen] = useState(false)

  // Immediate-execution calculator state (handheld behaviour)
  const [entry, setEntry]         = useState("0")     // current number being typed
  const [acc, setAcc]             = useState<number | null>(null)
  const [pendingOp, setPendingOp] = useState<Op | null>(null)
  const [fresh, setFresh]         = useState(true)    // next digit replaces entry
  const [expr, setExpr]           = useState("")      // running expression display
  const [history, setHistory]     = useState<HistoryEntry[]>([])
  const [copied, setCopied]       = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)

  function clearAll() {
    setEntry("0"); setAcc(null); setPendingOp(null); setFresh(true); setExpr("")
  }

  function inputDigit(d: string) {
    setEntry((prev) => {
      if (fresh) { setFresh(false); return d === "." ? "0." : d }
      if (d === "." && prev.includes(".")) return prev
      if (prev === "0" && d !== ".") return d
      if (prev.replace(/[-.]/g, "").length >= 15) return prev
      return prev + d
    })
  }

  function backspace() {
    if (fresh) return
    setEntry((prev) => (prev.length <= 1 || (prev.length === 2 && prev.startsWith("-")) ? "0" : prev.slice(0, -1)))
  }

  function toggleSign() {
    setEntry((prev) => (prev.startsWith("-") ? prev.slice(1) : prev === "0" ? prev : "-" + prev))
  }

  function percent() {
    const v = parseFloat(entry) / 100
    setEntry(String(v))
    setFresh(true)
  }

  function pressOp(op: Op) {
    const current = parseFloat(entry)
    if (pendingOp !== null && !fresh) {
      const result = applyOp(acc ?? 0, current, pendingOp)
      setAcc(result)
      setEntry(String(result))
      setExpr(`${expr} ${entry} ${op}`)
    } else if (acc === null) {
      setAcc(current)
      setExpr(`${entry} ${op}`)
    } else {
      // Operator pressed twice — replace the pending operator
      setExpr(expr.replace(/[+\-×÷]\s*$/, `${op}`))
    }
    setPendingOp(op)
    setFresh(true)
  }

  function equals() {
    if (pendingOp === null || acc === null) return
    const current = parseFloat(entry)
    const result = applyOp(acc, current, pendingOp)
    const fullExpr = `${expr} ${entry}`
    const resultStr = formatNumber(result)

    setHistory((prev) => [{ expression: fullExpr, result: resultStr }, ...prev].slice(0, MAX_HISTORY))
    setEntry(isFinite(result) ? String(Math.round(result * 1e10) / 1e10) : "0")
    setAcc(null)
    setPendingOp(null)
    setFresh(true)
    setExpr("")
  }

  function recallHistory(h: HistoryEntry) {
    const raw = h.result.replace(/,/g, "")
    setEntry(raw)
    setAcc(null)
    setPendingOp(null)
    setFresh(true)
    setExpr("")
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(entry)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { /* clipboard unavailable */ }
  }

  // ── Keyboard support while panel is open ──────────────────
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      // Don't steal keys from form fields elsewhere on the page
      const target = e.target as HTMLElement
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return

      if (/^[0-9]$/.test(e.key)) { inputDigit(e.key); e.preventDefault() }
      else if (e.key === ".")          { inputDigit("."); e.preventDefault() }
      else if (e.key === "+")          { pressOp("+"); e.preventDefault() }
      else if (e.key === "-")          { pressOp("-"); e.preventDefault() }
      else if (e.key === "*")          { pressOp("×"); e.preventDefault() }
      else if (e.key === "/")          { pressOp("÷"); e.preventDefault() }
      else if (e.key === "%")          { percent(); e.preventDefault() }
      else if (e.key === "Enter" || e.key === "=") { equals(); e.preventDefault() }
      else if (e.key === "Backspace")  { backspace(); e.preventDefault() }
      else if (e.key === "Escape")     { clearAll(); e.preventDefault() }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  })

  const displayValue = (() => {
    const n = parseFloat(entry)
    if (entry.endsWith(".") || entry === "-" || isNaN(n)) return entry
    // Preserve trailing decimal zeros the user is typing ("1.50")
    if (/\.\d*0$/.test(entry)) return entry
    return formatNumber(n)
  })()

  // ── Button definitions ─────────────────────────────────────
  const keys: { label: string; onClick: () => void; variant?: "op" | "action" | "equals"; span2?: boolean }[] = [
    { label: "AC", onClick: clearAll,    variant: "action" },
    { label: "±",  onClick: toggleSign,  variant: "action" },
    { label: "%",  onClick: percent,     variant: "action" },
    { label: "÷",  onClick: () => pressOp("÷"), variant: "op" },
    { label: "7",  onClick: () => inputDigit("7") },
    { label: "8",  onClick: () => inputDigit("8") },
    { label: "9",  onClick: () => inputDigit("9") },
    { label: "×",  onClick: () => pressOp("×"), variant: "op" },
    { label: "4",  onClick: () => inputDigit("4") },
    { label: "5",  onClick: () => inputDigit("5") },
    { label: "6",  onClick: () => inputDigit("6") },
    { label: "-",  onClick: () => pressOp("-"), variant: "op" },
    { label: "1",  onClick: () => inputDigit("1") },
    { label: "2",  onClick: () => inputDigit("2") },
    { label: "3",  onClick: () => inputDigit("3") },
    { label: "+",  onClick: () => pressOp("+"), variant: "op" },
    { label: "0",  onClick: () => inputDigit("0"), span2: true },
    { label: ".",  onClick: () => inputDigit(".") },
    { label: "=",  onClick: equals, variant: "equals" },
  ]

  return (
    <>
      {/* ── Calculator Panel ─────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-20 left-4 z-50 w-[300px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-primary text-primary-foreground shrink-0">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <p className="text-sm font-semibold leading-none">Calculator</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md opacity-75 hover:opacity-100 transition-opacity"
              aria-label="Close calculator"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="max-h-28 overflow-y-auto border-b border-border bg-muted/30">
              {history.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => recallHistory(h)}
                  className="w-full px-3 py-1.5 text-right hover:bg-accent/50 transition-colors block"
                  title="Click to reuse result"
                >
                  <span className="text-[11px] text-muted-foreground">{h.expression} = </span>
                  <span className="text-xs font-medium text-foreground">{h.result}</span>
                </button>
              ))}
            </div>
          )}

          {/* Display */}
          <div className="px-4 pt-3 pb-2 text-right space-y-0.5">
            <p className="text-xs text-muted-foreground h-4 truncate">{expr || " "}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={copyResult}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Copy value"
                aria-label="Copy value"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <p className="text-3xl font-semibold text-foreground tabular-nums truncate" title={displayValue}>
                {displayValue}
              </p>
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-1.5 p-3 pt-1">
            {keys.map((k) => (
              <button
                key={k.label}
                type="button"
                onClick={k.onClick}
                className={cn(
                  "h-11 rounded-lg text-sm font-medium transition-colors select-none",
                  k.span2 && "col-span-2",
                  k.variant === "op"     && "bg-primary/10 text-primary hover:bg-primary/20 text-base",
                  k.variant === "equals" && "bg-primary text-primary-foreground hover:opacity-90 text-base",
                  k.variant === "action" && "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  !k.variant             && "bg-muted/50 text-foreground hover:bg-muted"
                )}
              >
                {k.label}
              </button>
            ))}
            {/* Backspace row */}
            <button
              type="button"
              onClick={backspace}
              className="col-span-4 h-9 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
            >
              <Delete className="h-3.5 w-3.5" /> Backspace
            </button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/50 pb-2 shrink-0">
            Keyboard works too — Enter for =, Esc to clear
          </p>
        </div>
      )}

      {/* ── Floating Button ─────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-4 left-4 z-50 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          open
            ? "bg-muted text-muted-foreground hover:bg-muted/80"
            : "bg-primary text-primary-foreground hover:opacity-90 scale-100 hover:scale-105"
        )}
        title="Calculator"
        aria-label="Toggle calculator"
        style={{ height: "52px", width: "52px" }}
      >
        {open ? <X className="h-5 w-5" /> : <Calculator className="h-5 w-5" />}
      </button>
    </>
  )
}
