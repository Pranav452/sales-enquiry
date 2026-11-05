"use client"

// Klondike solitaire (Draw 1 / Draw 3) on the shared solitaire engine.

import { useCallback, useState } from "react"
import type { ArcadeGameProps } from "@/lib/game/arcade"
import { SetupScreen, useGameOverOnce } from "@/components/game/arcade/kit/GameShell"
import { createRng } from "@/components/game/arcade/kit/random"
import { SolitaireBoard } from "./solitaire/SolitaireBoard"
import { klondikeAdapter, newKlondike } from "./solitaire/klondike-logic"

export default function Klondike({ onGameOver }: ArcadeGameProps) {
  const finish = useGameOverOnce(onGameOver)
  const [draw, setDraw] = useState<1 | 3 | null>(null)
  const init = useCallback(() => newKlondike(draw ?? 1, createRng()), [draw])

  if (!draw) {
    return (
      <SetupScreen
        title="Klondike Solitaire"
        description="Build the four foundations up from Ace to King in suit."
        options={[{
          id: "draw",
          label: "Draw mode",
          choices: [
            { value: "1", label: "Draw 1", hint: "One card at a time, unlimited passes" },
            { value: "3", label: "Draw 3", hint: "Three at a time, three passes" },
          ],
        }]}
        defaults={{ draw: "1" }}
        startLabel="Deal"
        onStart={(v) => setDraw(v.draw === "3" ? 3 : 1)}
      />
    )
  }

  return <SolitaireBoard adapter={klondikeAdapter} init={init} onFinish={finish} openingMs={1300} />
}
