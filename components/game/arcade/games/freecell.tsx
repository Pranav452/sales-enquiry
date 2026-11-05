"use client"

// FreeCell on the shared solitaire engine. Deal numbers follow the
// classic Microsoft FreeCell numbering.

import { useCallback, useState } from "react"
import type { ArcadeGameProps } from "@/lib/game/arcade"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SetupScreen, useGameOverOnce } from "@/components/game/arcade/kit/GameShell"
import { createRng } from "@/components/game/arcade/kit/random"
import { SolitaireBoard } from "./solitaire/SolitaireBoard"
import { FC_MAX_DEAL, freecellAdapter, newFreeCell, randomDealNumber } from "./solitaire/freecell-logic"

export default function Freecell({ onGameOver }: ArcadeGameProps) {
  const finish = useGameOverOnce(onGameOver)
  const [deal, setDeal] = useState<number | null>(null)
  const [typed, setTyped] = useState("")
  const init = useCallback(() => newFreeCell(deal ?? 1), [deal])

  const parsed = Number(typed)
  const valid = typed === "" || (Number.isInteger(parsed) && parsed >= 1 && parsed <= FC_MAX_DEAL)

  if (deal == null) {
    return (
      <SetupScreen
        title="FreeCell"
        description="Every card is dealt face up. Use the four free cells to build the foundations from Ace to King."
        options={[]}
        defaults={{}}
        startLabel="Deal"
        onStart={() => {
          if (!valid) return
          setDeal(typed ? parsed : randomDealNumber(createRng()))
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="freecell-deal" className="text-xs font-medium text-muted-foreground">
            Deal number (optional)
          </Label>
          <Input
            id="freecell-deal"
            inputMode="numeric"
            placeholder="Random deal"
            value={typed}
            onChange={(e) => setTyped(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
            aria-invalid={!valid}
          />
          <p className="text-xs text-muted-foreground">
            {valid ? "Leave blank for a random deal, or enter 1 to 1,000,000 to replay a deal." : "Enter a number from 1 to 1,000,000."}
          </p>
        </div>
      </SetupScreen>
    )
  }

  return <SolitaireBoard adapter={freecellAdapter} init={init} onFinish={finish} openingMs={1100} />
}
