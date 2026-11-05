// ============================================================
// FreeCell — compact best-first solver used for hints.
// Cards are one character each (code 0..51 = suit*13 + rank-1,
// suits S H D C), columns are strings, free cells a sorted
// string, so states are cheap to copy and to key.
// Safe cards are played home automatically after every move,
// exactly as the game does.
// ============================================================

export interface SolverInput {
  cols:  string[]
  cells: string
  /** foundation height per suit S H D C */
  found: number[]
}

/** A move in solver terms; columns keep their real index. */
export type SolverMove =
  | { kind: "col-col"; from: number; count: number; to: number }
  | { kind: "col-cell"; from: number }
  | { kind: "col-home"; from: number }
  | { kind: "cell-col"; card: number; to: number }
  | { kind: "cell-home"; card: number }

const CH = (k: number) => String.fromCharCode(48 + k)
const code = (ch: string) => ch.charCodeAt(0) - 48
const suitOf = (k: number) => (k / 13) | 0
const rankOf = (k: number) => (k % 13) + 1
const redOf = (k: number) => { const s = suitOf(k); return s === 1 || s === 2 }

interface Node {
  cols:   string[]
  cells:  string
  found:  number[]
  g:      number
  parent: Node | null
  move:   SolverMove | null
}

function keyOf(n: { cols: string[]; cells: string; found: number[] }): string {
  return n.found.join("") + "|" + n.cells + "|" + n.cols.slice().sort().join(",")
}

function canHome(found: number[], k: number): boolean {
  return found[suitOf(k)] === rankOf(k) - 1
}

function safe(found: number[], k: number): boolean {
  const r = rankOf(k)
  if (r <= 2) return true
  return redOf(k) ? found[0] >= r - 1 && found[3] >= r - 1 : found[1] >= r - 1 && found[2] >= r - 1
}

/** Play every safe card home (mutates the fresh copies passed in). */
function settle(cols: string[], cellsIn: string, found: number[]): string {
  let cells = cellsIn
  for (let changed = true; changed;) {
    changed = false
    for (let i = 0; i < cells.length; i++) {
      const k = code(cells[i])
      if (canHome(found, k) && safe(found, k)) {
        found[suitOf(k)]++
        cells = cells.slice(0, i) + cells.slice(i + 1)
        changed = true
        i--
      }
    }
    for (let c = 0; c < 8; c++) {
      const col = cols[c]
      if (!col.length) continue
      const k = code(col[col.length - 1])
      if (canHome(found, k) && safe(found, k)) {
        found[suitOf(k)]++
        cols[c] = col.slice(0, -1)
        changed = true
      }
    }
  }
  return cells
}

function sortChars(s: string): string {
  return s.split("").sort().join("")
}

/** Length of the alternating run at the top of a column. */
function runLength(col: string): number {
  let n = col.length ? 1 : 0
  for (let i = col.length - 1; i > 0; i--) {
    const a = code(col[i - 1]), b = code(col[i])
    if (redOf(a) === redOf(b) || rankOf(a) !== rankOf(b) + 1) break
    n++
  }
  return n
}

function moves(n: Node): SolverMove[] {
  const out: SolverMove[] = []
  const free = 4 - n.cells.length
  let empty = 0
  for (const c of n.cols) if (!c.length) empty++
  const limit = (1 + free) * 2 ** empty
  const limitEmpty = (1 + free) * 2 ** Math.max(0, empty - 1)
  // home
  for (let i = 0; i < n.cells.length; i++) {
    const k = code(n.cells[i])
    if (canHome(n.found, k)) out.push({ kind: "cell-home", card: k })
  }
  for (let c = 0; c < 8; c++) {
    const col = n.cols[c]
    if (col.length && canHome(n.found, code(col[col.length - 1]))) out.push({ kind: "col-home", from: c })
  }
  // column to column
  let firstEmpty = -1
  for (let d = 0; d < 8; d++) if (!n.cols[d].length) { firstEmpty = d; break }
  for (let c = 0; c < 8; c++) {
    const col = n.cols[c]
    if (!col.length) continue
    const run = runLength(col)
    const topRank = rankOf(code(col[col.length - 1]))
    for (let d = 0; d < 8; d++) {
      if (d === c) continue
      const dest = n.cols[d]
      if (!dest.length) continue
      const t = code(dest[dest.length - 1])
      const count = rankOf(t) - 1 - topRank + 1
      if (count < 1 || count > run || count > limit) continue
      const base = code(col[col.length - count])
      if (redOf(base) === redOf(t)) continue
      out.push({ kind: "col-col", from: c, count, to: d })
    }
    if (firstEmpty >= 0) {
      const max = Math.min(run, limitEmpty)
      if (max < col.length) out.push({ kind: "col-col", from: c, count: max, to: firstEmpty })
      if (max > 1 && col.length > 1) out.push({ kind: "col-col", from: c, count: 1, to: firstEmpty })
    }
  }
  // cells to columns
  for (let i = 0; i < n.cells.length; i++) {
    if (i > 0 && n.cells[i] === n.cells[i - 1]) continue
    const k = code(n.cells[i])
    for (let d = 0; d < 8; d++) {
      const dest = n.cols[d]
      if (!dest.length) continue
      const t = code(dest[dest.length - 1])
      if (redOf(t) !== redOf(k) && rankOf(t) === rankOf(k) + 1) out.push({ kind: "cell-col", card: k, to: d })
    }
    if (firstEmpty >= 0) out.push({ kind: "cell-col", card: k, to: firstEmpty })
  }
  // columns to a free cell
  if (free > 0) for (let c = 0; c < 8; c++) if (n.cols[c].length) out.push({ kind: "col-cell", from: c })
  return out
}

function apply(n: Node, m: SolverMove): Node {
  const cols = n.cols.slice()
  let cells = n.cells
  const found = n.found.slice()
  switch (m.kind) {
    case "col-col": {
      const src = cols[m.from]
      cols[m.to] = cols[m.to] + src.slice(src.length - m.count)
      cols[m.from] = src.slice(0, src.length - m.count)
      break
    }
    case "col-cell": {
      const src = cols[m.from]
      cells = sortChars(cells + src[src.length - 1])
      cols[m.from] = src.slice(0, -1)
      break
    }
    case "col-home": {
      const src = cols[m.from]
      found[suitOf(code(src[src.length - 1]))]++
      cols[m.from] = src.slice(0, -1)
      break
    }
    case "cell-col":
      cells = cells.replace(CH(m.card), "")
      cols[m.to] = cols[m.to] + CH(m.card)
      break
    case "cell-home":
      cells = cells.replace(CH(m.card), "")
      found[suitOf(m.card)]++
      break
  }
  cells = settle(cols, cells, found)
  return { cols, cells, found, g: n.g + 1, parent: n, move: m }
}

/** Lower is better. */
function heuristic(n: Node): number {
  let home = 0
  for (const f of n.found) home += f
  let blockers = 0, depth = 0
  for (const col of n.cols) {
    let minBelow = 99
    for (let i = 0; i < col.length; i++) {
      const k = code(col[i])
      const r = rankOf(k)
      if (r > minBelow) blockers++
      if (r < minBelow) minBelow = r
      if (n.found[suitOf(k)] === r - 1) depth += col.length - 1 - i
    }
  }
  let empty = 0
  for (const c of n.cols) if (!c.length) empty++
  return (52 - home) * 2 + blockers + depth - (4 - n.cells.length) - empty * 2
}

// tiny binary heap keyed by f
class Heap {
  private a: { f: number; n: Node }[] = []
  get size() { return this.a.length }
  push(f: number, n: Node) {
    const a = this.a
    a.push({ f, n })
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p].f <= a[i].f) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop(): Node | undefined {
    const a = this.a
    if (!a.length) return undefined
    const top = a[0]
    const end = a.pop()!
    if (a.length) {
      a[0] = end
      let i = 0
      for (;;) {
        const l = i * 2 + 1, r = l + 1
        let m = i
        if (l < a.length && a[l].f < a[m].f) m = l
        if (r < a.length && a[r].f < a[m].f) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top.n
  }
}

/** Solve from a position; returns the move list or null if the budget runs out. */
export function solveFreeCell(input: SolverInput, budget = 12000): SolverMove[] | null {
  const root: Node = { cols: input.cols.slice(), cells: sortChars(input.cells), found: input.found.slice(), g: 0, parent: null, move: null }
  const seen = new Set<string>([keyOf(root)])
  const heap = new Heap()
  heap.push(heuristic(root), root)
  for (let expanded = 0; heap.size && expanded < budget; expanded++) {
    const n = heap.pop()!
    if (n.found.every((f) => f === 13)) {
      const path: SolverMove[] = []
      for (let x: Node | null = n; x && x.move; x = x.parent) path.push(x.move)
      return path.reverse()
    }
    for (const m of moves(n)) {
      const child = apply(n, m)
      const k = keyOf(child)
      if (seen.has(k)) continue
      seen.add(k)
      heap.push(heuristic(child) + child.g * 0.15, child)
    }
  }
  return null
}

/** Key of every position along a solution, mapped to the move to play there. */
export function solutionMap(input: SolverInput, path: SolverMove[]): Map<string, SolverMove> {
  const map = new Map<string, SolverMove>()
  let n: Node = { cols: input.cols.slice(), cells: sortChars(input.cells), found: input.found.slice(), g: 0, parent: null, move: null }
  for (const m of path) {
    map.set(keyOf(n), m)
    n = apply(n, m)
  }
  return map
}

export function positionKey(input: SolverInput): string {
  return keyOf({ cols: input.cols, cells: sortChars(input.cells), found: input.found })
}

export const cardCode = (suitIndex: number, rank: number) => CH(suitIndex * 13 + rank - 1)
