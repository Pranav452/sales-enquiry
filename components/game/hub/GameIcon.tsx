"use client"

// Maps the icon-name strings used by lib/game (quests, trophies, arcade)
// to lucide components. A static map keeps the bundle small.

import { createElement } from "react"
import {
  Anchor, BookUser, Bomb, Boxes, Brush, CalendarCheck, CalendarRange, Castle,
  ClipboardList, CloudLightning, Coins, Compass, Container, Crosshair, Crown, Eye,
  Flame, Footprints, Gamepad2, Gem, Globe2, Handshake, Infinity as InfinityIcon, Library,
  Lightbulb, Link as LinkIcon, Link2, Lock, LockOpen, Magnet, Map as MapIcon, MapPinned, Moon,
  PawPrint, Phone, PhoneCall, PhoneForwarded, PhoneIncoming, Pickaxe, Route, Sailboat,
  ScrollText, Shell, Ship, ShipWheel, Shuffle, Snowflake, Sparkles, Sprout, Stamp,
  Star, Sun, Swords, Timer, Tornado, Trophy, Zap,
  type LucideIcon, type LucideProps,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  Anchor, BookUser, Bomb, Boxes, Brush, CalendarCheck, CalendarRange, Castle,
  ClipboardList, CloudLightning, Coins, Compass, Container, Crosshair, Crown, Eye,
  Flame, Footprints, Gamepad2, Gem, Globe2, Handshake, Infinity: InfinityIcon, Library,
  Lightbulb, Link: LinkIcon, Link2, Lock, LockOpen, Magnet, Map: MapIcon, MapPinned, Moon,
  PawPrint, Phone, PhoneCall, PhoneForwarded, PhoneIncoming, Pickaxe, Route, Sailboat,
  ScrollText, Shell, Ship, ShipWheel, Shuffle, Snowflake, Sparkles, Sprout, Stamp,
  Star, Sun, Swords, Timer, Tornado, Trophy, Zap,
}

export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles
}

export function GameIcon({ name, ...props }: { name: string } & LucideProps) {
  return createElement(iconFor(name), { "aria-hidden": true, ...props })
}
