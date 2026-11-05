// Icon per arcade game (lib/game/arcade.ts stores lucide icon names as strings).
// Kept local so the arcade and celebrations do not depend on the hub folder.

import {
  Anchor, Bomb, Boxes, Container, Crosshair, Gamepad2, Globe2, Lightbulb, Ship, Snowflake, Swords,
  type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  Anchor, Bomb, Boxes, Container, Crosshair, Globe2, Lightbulb, Ship, Snowflake, Swords,
}

export function arcadeIcon(name: string): LucideIcon {
  return ICONS[name] ?? Gamepad2
}
