"use client"

import { motion } from "framer-motion"
import { PawPrint, X } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useGameStore } from "@/lib/game/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconBox } from "@/components/game/ui/primitives"
import { PetSprite } from "./PetSprite"
import { MAX_NAME_LENGTH, usePetStore } from "./petStore"
import { SPECIES, SPECIES_ORDER, clampStage, type SpeciesId } from "./species"

/** First-run picker. Dismissible; re-opened from the summon tab. */
export function AdoptCard({ reducedMotion }: { reducedMotion: boolean }) {
  const [picked, setPicked] = useState<SpeciesId>("crab")
  const [name, setName] = useState("")
  const stage = clampStage(useGameStore((s) => s.data?.me?.petStage))
  const sp = SPECIES[picked]

  function adopt(e: FormEvent) {
    e.preventDefault()
    usePetStore.getState().adopt(picked, name)
  }

  return (
    <motion.section
      aria-labelledby="pet-adopt-title"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pointer-events-auto absolute bottom-4 left-3 right-3 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-md sm:left-[72px] sm:right-auto sm:w-[348px]"
    >
      <div className="flex items-start gap-3">
        <IconBox icon={PawPrint} />
        <div className="min-w-0 flex-1">
          <h2 id="pet-adopt-title" className="text-sm font-semibold leading-tight">Choose a desk pet</h2>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            A small companion that reacts to the activities you log. You can hide it at any time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => usePetStore.getState().dismissAdopt()}
          aria-label="Not now"
          className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={adopt} className="mt-3 space-y-3">
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Species">
          {SPECIES_ORDER.map((id) => {
            const active = id === picked
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPicked(id)}
                className={cn(
                  "flex flex-col items-center rounded-lg border px-1 pb-1.5 pt-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
                )}
              >
                <span className="flex h-[60px] items-end">
                  <PetSprite
                    species={id}
                    stage={stage}
                    mood={active ? "happy" : "content"}
                    size={50}
                    animated={active && !reducedMotion}
                    shadow
                    className="text-foreground"
                  />
                </span>
                <span className="mt-1 text-xs font-medium capitalize text-foreground">{SPECIES[id].kind}</span>
              </button>
            )
          })}
        </div>

        <div>
          <label htmlFor="pet-adopt-name" className="mb-1 block text-xs font-medium text-muted-foreground">
            Name
          </label>
          <input
            id="pet-adopt-name"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder={sp.defaultName}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-input-bg px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => usePetStore.getState().dismissAdopt()}>
            Not now
          </Button>
          <Button type="submit" size="sm">
            Adopt {sp.kind}
          </Button>
        </div>
      </form>
    </motion.section>
  )
}
