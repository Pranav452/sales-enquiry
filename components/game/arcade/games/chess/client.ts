// Engine client for the UI: runs searches in a Web Worker and falls back to a
// chunked main-thread search (one iteration per task) if the worker cannot be
// created or crashes.

import { createRng } from "../../kit/random"
import { Engine, type SearchResult } from "./engine"
import { configFor, type EngineRequest, type EngineResponse } from "./protocol"

export type EngineReply = { ok: true } & SearchResult

interface Pending {
  req:     EngineRequest
  resolve: (r: EngineReply) => void
  reject:  (e: Error) => void
  timer:   ReturnType<typeof setTimeout>
}

export class EngineClient {
  private worker: Worker | null = null
  private workerBroken = false
  private pending = new Map<number, Pending>()
  private nextId = 1
  private mainEngine: Engine | null = null
  private mainToken = 0

  constructor(private createWorker: () => Worker) {}

  /** Asks for a move (or evaluation). Superseded/cancelled requests never resolve. */
  request(input: Omit<EngineRequest, "id">): Promise<EngineReply> {
    const req: EngineRequest = { ...input, id: this.nextId++ }
    const worker = this.getWorker()
    if (!worker) return this.runOnMainThread(req)
    return new Promise<EngineReply>((resolve, reject) => {
      // watchdog: a worker that never answers is treated as broken
      const budget = configFor(req).timeMs + 6000
      const timer = setTimeout(() => this.failWorker(), budget)
      this.pending.set(req.id, { req, resolve, reject, timer })
      try {
        worker.postMessage(req)
      } catch {
        this.failWorker()
      }
    })
  }

  /** Drops any in-flight search (terminates a busy worker so it stops at once). */
  cancel(): void {
    this.mainToken++
    if (this.pending.size > 0) {
      for (const p of this.pending.values()) clearTimeout(p.timer)
      this.pending.clear()
      this.worker?.terminate()
      this.worker = null
    }
  }

  dispose(): void {
    this.cancel()
    this.worker?.terminate()
    this.worker = null
  }

  get usingWorker(): boolean {
    return !this.workerBroken
  }

  private getWorker(): Worker | null {
    if (this.workerBroken) return null
    if (this.worker) return this.worker
    try {
      const w = this.createWorker()
      w.onmessage = (e: MessageEvent<EngineResponse>) => this.onMessage(e.data)
      w.onerror = (e) => { e.preventDefault(); this.failWorker() }
      w.onmessageerror = () => this.failWorker()
      this.worker = w
      return w
    } catch {
      this.workerBroken = true
      return null
    }
  }

  private onMessage(res: EngineResponse): void {
    const p = this.pending.get(res.id)
    if (!p) return
    this.pending.delete(res.id)
    clearTimeout(p.timer)
    if (res.ok) p.resolve(res)
    else p.reject(new Error(res.error))
  }

  /** Worker failed: switch to the main thread and re-run whatever was pending. */
  private failWorker(): void {
    this.workerBroken = true
    this.worker?.terminate()
    this.worker = null
    const queued = [...this.pending.values()]
    this.pending.clear()
    for (const p of queued) {
      clearTimeout(p.timer)
      this.runOnMainThread(p.req).then(p.resolve, p.reject)
    }
  }

  private runOnMainThread(req: EngineRequest): Promise<EngineReply> {
    const token = ++this.mainToken // latest request wins
    return new Promise<EngineReply>((resolve, reject) => {
      // shorter budget on the main thread: each depth iteration blocks until it finishes
      const engine = (this.mainEngine ??= new Engine())
      let it: Generator<number, SearchResult, void>
      try {
        engine.setPosition(req.startFen, req.moves)
        it = engine.iterate(configFor(req, 0.5), createRng(req.seed))
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
        return
      }
      const step = () => {
        if (token !== this.mainToken) return // cancelled
        try {
          const r = it.next()
          if (r.done) resolve({ ok: true, ...r.value })
          else setTimeout(step, 0)
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      }
      setTimeout(step, 0)
    })
  }
}
