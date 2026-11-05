"use client"

// Spider solitaire (1, 2 or 4 suits) on the shared solitaire engine.

import { useCallback, useState } from "react"
import type { ArcadeGameProps } from "@/lib/game/arcade"
import { SetupScreen, useGameOverOnce } from "@/components/game/arcade/kit/GameShell"
import { createRng } from "@/components/game/arcade/kit/random"
import { SolitaireBoard } from "./solitaire/SolitaireBoard"
import { newSpider, spiderAdapter, type SpiderSuits } from "./solitaire/spider-logic"

export default function Spider({ onGameOver }: ArcadeGameProps) {
  const finish = useGameOverOnce(onGameOver)
  const [suits, setSuits] = useState<SpiderSuits | null>(null)
  const init = useCallback(() => newSpider(suits ?? 1, createRng()), [suits])

  if (!suits) {
    return (
      <SetupScreen
        title="Spider Solitaire"
        description="Build King-to-Ace runs in one suit to clear all eight from the table."
        options={[{
          id: "suits",
          label: "Difficulty",
          choices: [
            { value: "1", label: "1 suit", hint: "Spades only" },
            { value: "2", label: "2 suits", hint: "Spades and Hearts" },
            { value: "4", label: "4 suits", hint: "The full challenge" },
          ],
        }]}
        defaults={{ suits: "1" }}
        startLabel="Deal"
        onStart={(v) => setSuits(v.suits === "4" ? 4 : v.suits === "2" ? 2 : 1)}
      />
    )
  }

  return <SolitaireBoard adapter={spiderAdapter} init={init} onFinish={finish} openingMs={1300} />
}
