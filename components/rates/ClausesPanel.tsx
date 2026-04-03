"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react"

interface LineClause {
  line: string
  clauses: string
  pdf_url: string | null
}

interface Props {
  items: LineClause[]
}

const LINE_COLORS: Record<string, { bg: string; border: string; label: string; dot: string }> = {
  MSC:   { bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200 dark:border-blue-800",   label: "text-blue-800 dark:text-blue-200",   dot: "bg-blue-500"   },
  PIL:   { bg: "bg-green-50 dark:bg-green-950/30",  border: "border-green-200 dark:border-green-800",  label: "text-green-800 dark:text-green-200",  dot: "bg-green-500"  },
  COSCO: { bg: "bg-amber-50 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800",  label: "text-amber-800 dark:text-amber-200",  dot: "bg-amber-500"  },
  ESL:   { bg: "bg-purple-50 dark:bg-purple-950/30",border: "border-purple-200 dark:border-purple-800",label: "text-purple-800 dark:text-purple-200", dot: "bg-purple-500" },
  ONE:   { bg: "bg-cyan-50 dark:bg-cyan-950/30",    border: "border-cyan-200 dark:border-cyan-800",    label: "text-cyan-800 dark:text-cyan-200",    dot: "bg-cyan-500"   },
}

const DEFAULT_COLOR = { bg: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-200 dark:border-slate-700", label: "text-slate-800 dark:text-slate-200", dot: "bg-slate-400" }

function getColor(line: string) {
  const key = Object.keys(LINE_COLORS).find((k) => line.toUpperCase().includes(k))
  return key ? LINE_COLORS[key] : DEFAULT_COLOR
}

function ClauseBlock({ item }: { item: LineClause }) {
  const [open, setOpen] = useState(false)
  const color = getColor(item.line)
  const clauses = item.clauses.split("|").map((c) => c.trim()).filter(Boolean)

  return (
    <div className={`rounded-xl border ${color.border} ${color.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${color.dot}`} />
          <span className={`font-semibold text-sm ${color.label}`}>{item.line}</span>
          <span className="text-xs text-muted-foreground">{clauses.length} clause{clauses.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.pdf_url && (
            <a
              href={encodeURI(item.pdf_url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`flex items-center gap-1 text-xs font-medium ${color.label} hover:underline`}
            >
              <ExternalLink className="h-3 w-3" />
              View PDF
            </a>
          )}
          {open
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-inherit">
          <ul className="mt-3 space-y-1.5">
            {clauses.map((clause, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className={`shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full ${color.dot}`} />
                <span className="text-foreground/80">{clause}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function ClausesPanel({ items }: Props) {
  if (!items.length) return null

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Terms &amp; Conditions</h2>
        <span className="text-xs text-muted-foreground">— click each line to expand clauses</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <ClauseBlock key={item.line} item={item} />
        ))}
      </div>
    </div>
  )
}
