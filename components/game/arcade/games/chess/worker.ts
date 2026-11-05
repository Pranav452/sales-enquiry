// Web Worker entry: runs engine searches off the main thread.
// Loaded with new Worker(new URL("./chess/worker.ts", import.meta.url), { type: "module" }).

import { Engine } from "./engine"
import { runRequest, type EngineRequest, type EngineResponse } from "./protocol"

interface WorkerScope {
  onmessage: ((e: MessageEvent<EngineRequest>) => void) | null
  postMessage: (msg: EngineResponse) => void
}

const scope = self as unknown as WorkerScope
const engine = new Engine()

scope.onmessage = (e) => {
  scope.postMessage(runRequest(engine, e.data))
}
