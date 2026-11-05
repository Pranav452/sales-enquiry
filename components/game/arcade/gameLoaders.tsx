"use client"

// Lazy loaders for the arcade games (components/game/arcade/games/<id>.tsx).
// Explicit string paths so the bundler can split each game into its own chunk.

import dynamic from "next/dynamic"
import type { ComponentType } from "react"
import { Loader2 } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"

function Loading() {
  return (
    <div role="status" className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-sm text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      Loading game...
    </div>
  )
}

// next/dynamic options must be object literals (SWC transform requirement).
export const GAME_COMPONENTS: Record<string, ComponentType<ArcadeGameProps>> = {
  "anchors":     dynamic(() => import("./games/anchors"), { ssr: false, loading: Loading }),
  "cargo-match": dynamic(() => import("./games/cargo-match"), { ssr: false, loading: Loading }),
  "lighthouse":  dynamic(() => import("./games/lighthouse"), { ssr: false, loading: Loading }),
  "teu-2048":    dynamic(() => import("./games/teu-2048"), { ssr: false, loading: Loading }),
  "minesweep":   dynamic(() => import("./games/minesweep"), { ssr: false, loading: Loading }),
  "convoy":      dynamic(() => import("./games/convoy"), { ssr: false, loading: Loading }),
  "port-battle": dynamic(() => import("./games/port-battle"), { ssr: false, loading: Loading }),
  "locode":      dynamic(() => import("./games/locode"), { ssr: false, loading: Loading }),
  "ice-breaker": dynamic(() => import("./games/ice-breaker"), { ssr: false, loading: Loading }),
  "kraken-hunt": dynamic(() => import("./games/kraken-hunt"), { ssr: false, loading: Loading }),
}
