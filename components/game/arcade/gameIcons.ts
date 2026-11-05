// Icon per arcade game (lib/game/arcade.ts stores lucide icon names as strings).

import {
  Bomb, ChessKnight, CircleDot, Club, Columns4, Dice5, Dices, Disc, Gamepad2, Grid2x2, Grid3x3, Heart,
  Layers, Layers3, Spade, type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  Bomb, ChessKnight, CircleDot, Club, Columns4, Dice5, Dices, Disc, Grid2x2, Grid3x3, Heart, Layers, Layers3, Spade,
}

export function arcadeIcon(name: string): LucideIcon {
  return ICONS[name] ?? Gamepad2
}
