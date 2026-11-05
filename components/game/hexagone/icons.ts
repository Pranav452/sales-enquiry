// Icons per Hexagone category (shared by the stage and the panel, no three.js here).

import { Factory, House, Landmark, Ship, TreePine, Warehouse, type LucideIcon } from "lucide-react"
import type { HexCategory } from "@/lib/game/hexagone"

export const CATEGORY_ICON: Record<HexCategory, LucideIcon> = {
  base: Landmark, house: House, tree: TreePine, factory: Factory, residence: Warehouse, ship: Ship, landmark: Landmark,
}

export const CATEGORY_LABEL: Record<HexCategory, string> = {
  base: "Home ground", house: "Village", tree: "Forest", factory: "Port industry",
  residence: "Residence block", ship: "Fleet", landmark: "Landmark",
}
