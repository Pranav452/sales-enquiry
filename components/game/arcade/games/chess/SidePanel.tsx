"use client"

// Side panel: player rows (captures + material), SAN move list, status and actions.

import { useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { PieceSvg, type PieceColor, type PieceType } from "./pieces"

export interface PlayerInfo {
  name:      string
  tag?:      string
  color:     PieceColor
  /** enemy pieces this side has captured, most valuable first */
  captured:  PieceType[]
  /** material lead in pawns (only > 0 is shown) */
  lead:      number
  thinking?: boolean
  toMove:    boolean
}

export function PlayerRow({ info }: { info: PlayerInfo }) {
  const enemy: PieceColor = info.color === "w" ? "b" : "w"
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-2">
      <span className="flex shrink-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "h-3 w-3 shrink-0 rounded-full border",
            info.color === "w" ? "border-slate-400 bg-white" : "border-slate-900 bg-slate-900 dark:border-slate-500",
          )}
        />
        <span className={cn("text-sm", info.toMove ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
          {info.name}
        </span>
        {info.tag && <span className="rounded border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{info.tag}</span>}
        {info.thinking && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Thinking" />}
      </span>
      {/* captures wrap under the name when there are many */}
      <span
        className="ml-auto flex items-center"
        aria-label={info.captured.length ? `Captured ${info.captured.length} piece${info.captured.length === 1 ? "" : "s"}` : undefined}
      >
        {info.captured.map((t, i) => (
          <PieceSvg
            key={i}
            type={t}
            color={enemy}
            className={cn(
              "h-5 w-5 shrink-0",
              // black pieces need a lighter outline to read on the dark theme's card
              enemy === "b" && "dark:[&>g]:stroke-slate-400",
              i > 0 && (info.captured[i - 1] === t ? "-ml-3" : "-ml-0.5"),
            )}
          />
        ))}
        {info.lead > 0 && <span className="ml-1 text-xs font-medium tabular-nums text-muted-foreground">+{info.lead}</span>}
      </span>
    </div>
  )
}

export function MoveList({ sans, className }: { sans: string[]; className?: string }) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [sans.length])

  const rows: { n: number; w?: string; b?: string }[] = []
  for (let i = 0; i < sans.length; i += 2) rows.push({ n: i / 2 + 1, w: sans[i], b: sans[i + 1] })
  const last = sans.length - 1

  return (
    <div ref={listRef} className={cn("overflow-y-auto overscroll-contain px-1.5 py-1.5", className)} aria-label="Move list" role="log">
      {rows.length === 0 ? (
        <p className="px-1.5 py-1 text-xs text-muted-foreground">No moves yet</p>
      ) : (
        <ol className="grid grid-cols-[2rem_1fr_1fr] gap-y-px text-sm">
          {rows.map((r) => (
            <li key={r.n} className="contents">
              <span className="py-0.5 pl-1.5 text-xs leading-5 tabular-nums text-muted-foreground">{r.n}.</span>
              <MoveCell san={r.w} active={(r.n - 1) * 2 === last} />
              <MoveCell san={r.b} active={(r.n - 1) * 2 + 1 === last} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function MoveCell({ san, active }: { san?: string; active: boolean }) {
  if (!san) return <span />
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-medium leading-5 tabular-nums",
        active ? "bg-primary/15 text-foreground" : "text-foreground/85",
      )}
    >
      {san}
    </span>
  )
}
