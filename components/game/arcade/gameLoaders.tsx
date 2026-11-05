"use client"

// Lazy loaders for the arcade games (components/game/arcade/games/<id>.tsx).
// Explicit string paths so the bundler can split each game into its own chunk.

import dynamic from "next/dynamic"
import type { ComponentType } from "react"
import { Loader2 } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"

function Loading() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      Loading game...
    </div>
  )
}

// next/dynamic options must be object literals (SWC transform requirement).
export const GAME_COMPONENTS: Record<string, ComponentType<ArcadeGameProps>> = {
  "snakes-ladders": dynamic(() => import("./games/snakes-ladders"), { ssr: false, loading: Loading }),
  "connect-four": dynamic(() => import("./games/connect-four"), { ssr: false, loading: Loading }),
  "reversi": dynamic(() => import("./games/reversi"), { ssr: false, loading: Loading }),
  "checkers": dynamic(() => import("./games/checkers"), { ssr: false, loading: Loading }),
  "ludo": dynamic(() => import("./games/ludo"), { ssr: false, loading: Loading }),
  "chess": dynamic(() => import("./games/chess"), { ssr: false, loading: Loading }),
  "klondike": dynamic(() => import("./games/klondike"), { ssr: false, loading: Loading }),
  "blackjack": dynamic(() => import("./games/blackjack"), { ssr: false, loading: Loading }),
  "crazy-eights": dynamic(() => import("./games/crazy-eights"), { ssr: false, loading: Loading }),
  "freecell": dynamic(() => import("./games/freecell"), { ssr: false, loading: Loading }),
  "spider": dynamic(() => import("./games/spider"), { ssr: false, loading: Loading }),
  "hearts": dynamic(() => import("./games/hearts"), { ssr: false, loading: Loading }),
  "minesweeper": dynamic(() => import("./games/minesweeper"), { ssr: false, loading: Loading }),
  "sudoku": dynamic(() => import("./games/sudoku"), { ssr: false, loading: Loading }),
}
