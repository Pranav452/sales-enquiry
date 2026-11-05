// Message protocol between the Chess UI and the engine (worker or main-thread fallback).

import { createRng } from "../../kit/random"
import { Engine, type SearchConfig, type SearchResult } from "./engine"

export type ChessLevel = "easy" | "medium" | "hard"

/**
 * Strength per difficulty.
 * - easy:   shallow (2 ply + captures), noisy eval, picks among near-best moves, 12% random moves
 * - medium: up to 4 ply + quiescence in ~0.8s with light eval noise
 * - hard:   full-strength iterative deepening for ~2s
 */
export const LEVELS: Record<ChessLevel, SearchConfig> = {
  easy:   { timeMs: 200,  maxDepth: 2,  noise: 70, margin: 120, blunder: 0.12 },
  medium: { timeMs: 800,  maxDepth: 4,  noise: 18, margin: 0,   blunder: 0 },
  hard:   { timeMs: 2000, maxDepth: 64, noise: 0,  margin: 0,   blunder: 0 },
}

/** Full-strength short search used to judge draw offers. */
export const ANALYZE: SearchConfig = { timeMs: 350, maxDepth: 64, noise: 0, margin: 0, blunder: 0, analyze: true }

export interface EngineRequest {
  id:       number
  kind:     "move" | "analyze"
  startFen: string
  /** game moves so far in UCI */
  moves:    string[]
  level:    ChessLevel
  seed:     number
}

export type EngineResponse =
  | ({ id: number; ok: true } & SearchResult)
  | { id: number; ok: false; error: string }

export function configFor(req: EngineRequest, timeScale = 1): SearchConfig {
  const base = req.kind === "analyze" ? ANALYZE : LEVELS[req.level]
  return { ...base, timeMs: Math.max(60, Math.round(base.timeMs * timeScale)) }
}

/** Runs one request synchronously (used inside the worker). */
export function runRequest(engine: Engine, req: EngineRequest): EngineResponse {
  try {
    engine.setPosition(req.startFen, req.moves)
    const result = engine.search(configFor(req), createRng(req.seed))
    return { id: req.id, ok: true, ...result }
  } catch (err) {
    return { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
