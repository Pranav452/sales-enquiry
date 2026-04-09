export const runtime = "nodejs"
export const maxDuration = 300

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { extractPdf, PdfTable } from "@/lib/pdf-extract"
import OpenAI from "openai"
import * as XLSX from "xlsx"
import { writeFile, unlink } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { randomUUID } from "crypto"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Types ──────────────────────────────────────────────────────

/**
 * Phase 1 output: AI's understanding of the document structure.
 * Returned by analyzeStructure(), used by extractRates().
 */
interface DocumentSchema {
  // Document metadata
  shipping_line:  string
  origin_country: string
  origin_port:    string
  valid_from:     string | null
  valid_to:       string | null
  currency:       string
  clauses:        string | null

  // Extraction strategy
  extraction_mode: "table" | "text"

  // For table mode — column indices within each table row
  col_dest_port:    number          // Required
  col_rate_20:      number          // Required
  col_rate_40:      number          // Required
  col_dest_country: number | null   // If table has explicit country column
  col_via_port:     number | null
  col_surcharges:   number | null
  col_transit:      number | null
  col_valid_from:   number | null   // Per-row effective date column
  col_valid_to:     number | null   // Per-row expiry date column

  // Rows to skip — any row whose first cell matches one of these (case-insensitive)
  skip_row_starts: string[]
}

interface RateRow {
  dest_port:    string | null
  dest_country: string | null
  rate_20:      number | null
  rate_40:      number | null
  transit_days: number | null
  via_port:     string | null
  surcharges:   string | null
  notes:        string | null
  _valid_from?: string | null   // Per-row override
  _valid_to?:   string | null   // Per-row override
}

// ── Phase 1: Analyze document structure ───────────────────────

/**
 * One GPT call that reads a sample of the raw content and returns a
 * DocumentSchema — the full blueprint for how to extract data from this PDF.
 *
 * For table PDFs: identifies exact column positions, data start row, skip patterns.
 * For text PDFs: flags text mode so Phase 2 falls back to batch parsing.
 */
async function analyzeStructure(
  rawContent: string,
  tableForSample: PdfTable | null,
  shippingLineOverride?: string | null
): Promise<DocumentSchema> {
  // Build a sample of actual table rows so AI can see the real column structure
  let tableSample = ""
  if (tableForSample) {
    const sampleRows = tableForSample.rows.slice(0, 20)
    tableSample = "\n\n--- RAW TABLE ROWS (tab-separated, first 20 rows) ---\n"
    sampleRows.forEach((row, i) => {
      tableSample += `ROW ${i}: ${row.map((c, j) => `[${j}]${c}`).join("\t")}\n`
    })
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    max_completion_tokens: 1024,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are a freight rate sheet document analyst.
You receive raw extracted content from a shipping rate sheet plus actual raw table rows with column indices shown as [0], [1], [2], etc.
Your job is to understand the document structure and return a JSON schema that describes:
1. Document metadata (shipping line, origin, validity, currency, clauses)
2. Exact column positions for rate data extraction

COLUMN DETECTION RULES:
Look at the RAW TABLE ROWS for a header row (a row containing "20'" or "20GP" and "40'" or "40HC").
The column indices [0], [1], [2]... are shown explicitly in each row.

- col_dest_port: index of the column with DESTINATION PORT NAMES (city/port names like "Mombasa", "Shanghai")
  NOT the trade lane, NOT the origin port, NOT service names — the actual destination port
- col_rate_20: index of the column under "20'" or "20GP" or "20'GP" header
- col_rate_40: index of the column under "40'" or "40HC" or "40'HC" or "40GP" header
- col_dest_country: index of column with destination COUNTRY names (e.g. "POD Country", "Country"), or null
- col_via_port: index of via/routing column, or null
- col_transit: index of transit time column, or null
- col_surcharges: index of surcharges/remarks column, or null
- col_valid_from: index of per-row effective/start date column, or null
- col_valid_to: index of per-row expiry/end date column, or null
- If no clear header found, default: dest_port=0, rate_20=1, rate_40=2

SKIP ROW DETECTION:
- skip_row_starts: ONLY strings that appear in the FIRST COLUMN [0] of non-data rows
  (section headers, terms & conditions labels, notes). Keep this list SHORT (max 5 items).
  Do NOT put long sentences here. Do NOT include actual port names.

EXTRACTION MODE: Use "table" if clear column structure exists, else "text".

Return ONLY a raw JSON object (no markdown, no explanation):
{
  "shipping_line": string,
  "origin_country": string,
  "origin_port": string,
  "valid_from": "YYYY-MM-DD" or null,
  "valid_to": "YYYY-MM-DD" or null,
  "currency": "USD" or "EUR",
  "clauses": string or null,
  "extraction_mode": "table" or "text",
  "col_dest_port": number,
  "col_rate_20": number,
  "col_rate_40": number,
  "col_dest_country": number or null,
  "col_via_port": number or null,
  "col_surcharges": number or null,
  "col_transit": number or null,
  "col_valid_from": number or null,
  "col_valid_to": number or null,
  "skip_row_starts": string[]
}`,
      },
      {
        role: "user",
        content: rawContent.slice(0, 3000) + tableSample,
      },
    ],
  })

  try {
    let text = completion.choices[0]?.message?.content?.trim() ?? "{}"
    if (text.startsWith("```")) {
      text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim()
    }
    const parsed = JSON.parse(text)
    return {
      shipping_line:   shippingLineOverride?.trim().toUpperCase() || parsed.shipping_line  || "UNKNOWN",
      origin_country:  parsed.origin_country  || "INDIA",
      origin_port:     parsed.origin_port     || "NHAVA SHEVA",
      valid_from:      parsed.valid_from       || null,
      valid_to:        parsed.valid_to         || null,
      currency:        parsed.currency         || "USD",
      clauses:         parsed.clauses          || null,
      extraction_mode: parsed.extraction_mode  || "table",
      col_dest_port:    parsed.col_dest_port    ?? 0,
      col_rate_20:      parsed.col_rate_20      ?? 1,
      col_rate_40:      parsed.col_rate_40      ?? 2,
      col_dest_country: parsed.col_dest_country ?? null,
      col_via_port:     parsed.col_via_port     ?? null,
      col_surcharges:   parsed.col_surcharges   ?? null,
      col_transit:      parsed.col_transit      ?? null,
      col_valid_from:   parsed.col_valid_from   ?? null,
      col_valid_to:     parsed.col_valid_to     ?? null,
      skip_row_starts:  Array.isArray(parsed.skip_row_starts) ? parsed.skip_row_starts : [],
    }
  } catch {
    console.warn("[extract] analyzeStructure parse failed, using defaults")
    return {
      shipping_line:   shippingLineOverride?.trim().toUpperCase() || "UNKNOWN",
      origin_country:  "INDIA",
      origin_port:     "NHAVA SHEVA",
      valid_from:      null,
      valid_to:        null,
      currency:        "USD",
      clauses:         null,
      extraction_mode: "table",
      col_dest_port:    0,
      col_rate_20:      1,
      col_rate_40:      2,
      col_dest_country: null,
      col_via_port:     null,
      col_surcharges:   null,
      col_transit:      null,
      col_valid_from:   null,
      col_valid_to:     null,
      skip_row_starts:  [],
    }
  }
}

// ── Phase 2A: Table extraction using schema (deterministic) ───

function parseRateCell(cell: string): number | null {
  if (!cell) return null
  const lower = cell.toLowerCase().trim()
  // Non-numeric indicators
  if (lower === "case by case" || lower === "cbc" || lower === "on request" || lower === "n/a" || lower === "-") return null
  const cleaned = cell.replace(/[$,+]|USD|EUR/gi, "")  // preserve spaces so "3,163 3,245" → "3163 3245" not "31633245"
  const match = cleaned.match(/\b(\d{1,6})\b/)
  if (match) {
    const val = parseInt(match[1])
    return val >= 5 ? val : null  // Allow low rates (e.g. $20 for nearby ports)
  }
  return null
}

/**
 * Deterministic column detection from named header row.
 * Finds the header row in a table, then maps known column names to schema fields.
 * Overrides AI-detected column indices with exact matches when found.
 */
function detectColumnsFromHeader(table: PdfTable, schema: DocumentSchema): DocumentSchema {
  // Find the header row — a row containing rate column headers
  const headerRow = table.rows.find(r =>
    r.some(c => /OFT\s*20|20'D|20'GP|^\s*20'\s*$/i.test(c))
  )
  if (!headerRow) return schema

  const h = headerRow.map(c => c.trim().toLowerCase())

  function idx(...patterns: RegExp[]): number | null {
    for (const pat of patterns) {
      const i = h.findIndex(c => pat.test(c))
      if (i >= 0) return i
    }
    return null
  }

  // Port name: prefer "description" columns, then "pod" columns
  const destPort =
    idx(/^del\s*description$/i, /^pod\s*description$/i, /^destination\s*port$/i, /^port\s*of\s*discharge$/i) ??
    idx(/^pod$/i, /^pol$/i, /^del$/i) ??
    schema.col_dest_port

  const rate20   = idx(/oft\s*20|20'd|20'gp|^20'$/i) ?? schema.col_rate_20
  const rate40   = idx(/oft\s*40|40'd|40'gp|oft\s*hc|40'hc|hcd|^40'$/i) ?? schema.col_rate_40
  const country  = idx(/^pod\s*country$/i, /^dest.*country$/i, /^country$/i) ?? schema.col_dest_country
  const viaPort  = idx(/^t\/s\s*port$/i, /^routing$/i, /^via$/i) ?? schema.col_via_port
  const transit  = idx(/^transit/i, /^t\.time/i) ?? schema.col_transit
  const validFrom= idx(/^effective\s*date$/i, /^valid.*from$/i) ?? schema.col_valid_from
  const validTo  = idx(/^expiry\s*date$/i, /^expiration\s*date$/i, /^valid.*to$/i, /^validity$/i) ?? schema.col_valid_to

  return {
    ...schema,
    col_dest_port:    destPort,
    col_rate_20:      rate20,
    col_rate_40:      rate40,
    col_dest_country: country,
    col_via_port:     viaPort,
    col_transit:      transit,
    col_valid_from:   validFrom,
    col_valid_to:     validTo,
  }
}

function parseDate(val: string): string | null {
  if (!val) return null
  const s = val.trim()
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // "1-Apr-26" or "20-Apr-26"
  const m1 = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/)
  if (m1) {
    const months: Record<string,string> = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"}
    const mon = months[m1[2].toLowerCase()]
    if (mon) {
      const yr = m1[3].length === 2 ? `20${m1[3]}` : m1[3]
      return `${yr}-${mon}-${m1[1].padStart(2,"0")}`
    }
  }
  // "Apr-26" or "Apr 2026"
  const m2 = s.match(/^([A-Za-z]{3})[-\s](\d{2,4})$/)
  if (m2) {
    const months: Record<string,string> = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"}
    const mon = months[m2[1].toLowerCase()]
    if (mon) {
      const yr = m2[2].length === 2 ? `20${m2[2]}` : m2[2]
      return `${yr}-${mon}-01`
    }
  }
  return null
}

/**
 * Detect and flatten multi-group tables.
 * Some PDFs lay out 2-3 port groups side by side in the same table row:
 *   ["", "20'GP", "40'GP", "40'HC", "", "20'GP", "40'GP", "40'HC", ...]
 * This function splits each row into one row per group.
 */
function flattenMultiGroupTable(table: PdfTable): PdfTable {
  // Find the header row: one that has "20'" appearing 2+ times AND "40'" 2+ times
  // (both must repeat — avoids false positives on single-column tables)
  const headerRow = table.rows.find(r =>
    r.filter(c => /20'|20GP|20'GP/i.test(c)).length >= 2 &&
    r.filter(c => /40'|40HC|40GP/i.test(c)).length >= 2
  )
  if (!headerRow) return table  // Not a multi-group table

  // Find group start columns: columns where the header cell is empty (port column)
  // and the next columns have rate headers
  const groupStarts: number[] = []
  for (let i = 0; i < headerRow.length - 1; i++) {
    const cell = headerRow[i].trim()
    const next = headerRow[i + 1]?.trim() ?? ""
    if (!cell && /20'|20GP|20'GP/i.test(next)) {
      groupStarts.push(i)
    }
  }

  if (groupStarts.length < 2) return table  // Not multi-group

  // Determine column offsets within each group: port, 20', 40'
  const firstGroup = groupStarts[0]
  const groupSize  = groupStarts[1] - groupStarts[0]

  // Within a group, find 20' and 40' column offsets
  let off20 = 1, off40 = 2
  for (let j = firstGroup + 1; j < firstGroup + groupSize; j++) {
    const h = headerRow[j]?.trim() ?? ""
    if (/20'|20GP/i.test(h)) off20 = j - firstGroup
    if (/40'|40GP|40HC/i.test(h)) off40 = j - firstGroup
  }

  // Expand all data rows
  const expanded: string[][] = []
  for (const row of table.rows) {
    if (row === headerRow) continue  // Skip header
    for (const start of groupStarts) {
      const port   = (row[start]           ?? "").trim()
      const rate20 = (row[start + off20]   ?? "").trim()
      const rate40 = (row[start + off40]   ?? "").trim()
      if (!port && !rate20 && !rate40) continue
      expanded.push([port, rate20, rate40])
    }
  }

  return { page: table.page, rows: expanded }
}

function extractFromTablesWithSchema(tables: PdfTable[], schema: DocumentSchema): RateRow[] {
  const rows: RateRow[] = []
  const skipSet = schema.skip_row_starts.map(s => s.toUpperCase())

  for (const table of tables) {
    for (const row of table.rows) {
      const destPort = (row[schema.col_dest_port] ?? "").trim()
      if (!destPort) continue

      const destUpper = destPort.toUpperCase()
      if (skipSet.some(skip => destUpper.startsWith(skip))) continue

      const rate20 = parseRateCell(row[schema.col_rate_20] ?? "")
      const rate40 = parseRateCell(row[schema.col_rate_40] ?? "")

      if (rate20 === null && rate40 === null) continue

      // Per-row country (use schema column if available, else Phase 3 assigns it)
      const rowCountry = schema.col_dest_country !== null
        ? (row[schema.col_dest_country]?.trim().toUpperCase() || null)
        : null

      // Per-row validity dates (override schema-level dates when present)
      const rowValidFrom = schema.col_valid_from !== null
        ? parseDate(row[schema.col_valid_from] ?? "")
        : null
      const rowValidTo = schema.col_valid_to !== null
        ? parseDate(row[schema.col_valid_to] ?? "")
        : null

      rows.push({
        dest_port:    destPort,
        dest_country: rowCountry,
        rate_20:      rate20,
        rate_40:      rate40,
        transit_days: schema.col_transit !== null
          ? (parseInt(row[schema.col_transit] ?? "") || null)
          : null,
        via_port:     schema.col_via_port !== null
          ? (row[schema.col_via_port]?.trim() || null)
          : null,
        surcharges:   schema.col_surcharges !== null
          ? (row[schema.col_surcharges]?.trim() || null)
          : null,
        notes: null,
        _valid_from: rowValidFrom,
        _valid_to:   rowValidTo,
      })
    }
  }

  return rows
}

// ── Phase 2B: Text fallback — batch GPT parsing ───────────────

const BATCH_SIZE = 15

interface TaggedRow { id: string; line: string }
interface ParsedRow extends RateRow { row_id: string }

function filterCandidateRows(text: string, schema: DocumentSchema): string[] {
  const skipSet = schema.skip_row_starts.map(s => s.toUpperCase())
  const candidates: string[] = []

  for (const raw of text.split("\n")) {
    const line = raw.trim()
    if (line.length < 5) continue
    if (/^[-=_*]+$/.test(line) || /^(PAGE|---)/i.test(line)) continue

    const upper = line.toUpperCase()
    if (skipSet.some(s => upper.startsWith(s))) continue
    if (/^\d/.test(line) && !/[A-Z]/i.test(line.slice(0, 20))) continue

    const rateNums = line.match(/\b\d{3,6}\b/g)?.map(Number).filter(n => n >= 200)
    if (rateNums && rateNums.length >= 1) candidates.push(line)
  }

  return candidates
}

async function parseBatch(
  batch: TaggedRow[],
  schema: DocumentSchema
): Promise<ParsedRow[]> {
  const taggedText = batch.map(r => `${r.id} | ${r.line}`).join("\n")

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    max_completion_tokens: 4096,
    temperature: 0,
    seed: 42,
    messages: [
      {
        role: "system",
        content: `Parse freight rate rows. Return a JSON array, one object per ROW-ID.
Document: ${schema.shipping_line} from ${schema.origin_port} (${schema.currency})
CRITICAL: Include EVERY row_id. Use null for unknown fields.
Return ONLY raw JSON array.
Base rates are 500-6000. Surcharges (GRI, EFS, OCC) go in "surcharges" field.
{row_id, dest_port, dest_country (infer from port name), rate_20, rate_40, transit_days, via_port, surcharges, notes}`,
      },
      { role: "user", content: taggedText },
    ],
  })

  try {
    let text = completion.choices[0]?.message?.content?.trim() ?? "[]"
    if (text.startsWith("```")) text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim()
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let next = 0
  async function worker(): Promise<void> {
    while (next < tasks.length) {
      const idx = next++
      results[idx] = await tasks[idx]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

// ── Phase 3: Assign dest_country (single batch GPT call) ──────

async function assignDestCountries(rows: RateRow[]): Promise<RateRow[]> {
  // Only assign for rows that don't already have a country
  const portsNeedingCountry = [...new Set(
    rows.filter(r => r.dest_port && !r.dest_country).map(r => r.dest_port!)
  )]
  if (portsNeedingCountry.length === 0) return rows

  let countryMap      = new Map<string, string>()
  let correctedPortMap = new Map<string, string>()

  // Process in chunks of 60 to avoid token limits
  const CHUNK_SIZE = 60
  const chunks: string[][] = []
  for (let i = 0; i < portsNeedingCountry.length; i += CHUNK_SIZE) {
    chunks.push(portsNeedingCountry.slice(i, i + CHUNK_SIZE))
  }

  const chunkResults = await runWithConcurrency(
    chunks.map(chunk => async () => {
      const portList = chunk.map((p, i) => `${i + 1}. ${p}`).join("\n")
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5.4-mini",
          max_completion_tokens: 2048,
          temperature: 0,
          messages: [
            {
              role: "system",
              content: `You are a shipping port expert. For each port name:
1. Correct any spelling errors (e.g. "Brsibane" → "Brisbane", "Melbourn" → "Melbourne", "Neiper" → "Napier")
2. Map to its country

Return ONLY raw JSON where each KEY is the ORIGINAL port name and VALUE is an object:
{"ORIGINAL_PORT": {"corrected": "CORRECT PORT NAME", "country": "COUNTRY NAME"}}
Use UPPERCASE for all values. Example:
{"Brsibane": {"corrected": "BRISBANE", "country": "AUSTRALIA"}, "APAPA": {"corrected": "APAPA", "country": "NIGERIA"}}`,
            },
            { role: "user", content: `Process these ports:\n${portList}` },
          ],
        })
        let text = completion.choices[0]?.message?.content?.trim() ?? "{}"
        if (text.startsWith("```")) text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim()
        return JSON.parse(text) as Record<string, { corrected?: string; country?: string }>
      } catch {
        return {}
      }
    }),
    5
  )

  // Merge all chunk results
  type PortInfo = { corrected?: string; country?: string }
  for (const parsed of chunkResults) {
    for (const [k, v] of Object.entries(parsed)) {
      const info = v as PortInfo
      correctedPortMap.set(k.toUpperCase(), (info.corrected ?? k).toUpperCase())
      countryMap.set(k.toUpperCase(), (info.country ?? "").toUpperCase())
    }
  }

  return rows.map(r => ({
    ...r,
    dest_port: r.dest_port
      ? (correctedPortMap.get(r.dest_port.toUpperCase()) ?? r.dest_port.toUpperCase())
      : r.dest_port,
    dest_country: r.dest_country || (r.dest_port
      ? (countryMap.get(r.dest_port.toUpperCase()) ?? null)
      : null),
  }))
}

// ── Expand grouped port rows ──────────────────────────────────
// Some PDFs group multiple ports in a single cell: "Freemantle, Brisbane, Adelaide"
// Split these into individual rows so each port gets its own record.

function expandGroupedPorts(rows: RateRow[]): RateRow[] {
  const expanded: RateRow[] = []
  for (const row of rows) {
    if (!row.dest_port) { expanded.push(row); continue }

    // Split on "/" only — commas are often "Port, Country" format and must NOT be split
    // e.g. "Kingston /Cartagena/ Caucedo" → 3 ports ✓
    //      "Buenaventura,Colombia" → stays as 1 port ✓
    const parts = row.dest_port
      .split("/")
      .map(p => p.trim())
      .filter(p => p.length >= 3)

    if (parts.length <= 1) {
      expanded.push(row)
    } else {
      for (const port of parts) {
        expanded.push({ ...row, dest_port: port })
      }
    }
  }
  return expanded
}

// ── Deduplication ─────────────────────────────────────────────

function deduplicateRows(rows: RateRow[]): RateRow[] {
  const seen = new Map<string, RateRow>()
  for (const row of rows) {
    if (!row.dest_port && !row.dest_country) continue
    const normalizedPort = (row.dest_port ?? "")
      .toUpperCase()
      .replace(/\*.*$/, "")
      .replace(/\s*\(.*\)/, "")
      .trim()
    const key = `${normalizedPort}||${(row.dest_country ?? "").toUpperCase()}`
    const existing = seen.get(key)
    if (!existing || (row.rate_20 !== null && existing.rate_20 === null)) {
      seen.set(key, row)
    }
  }
  return Array.from(seen.values())
}

// ── XLSX extraction ───────────────────────────────────────────

function extractFromXlsx(buffer: Buffer): { tables: PdfTable[]; text: string } {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const tables: PdfTable[] = []
  let text = ""

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1, defval: "", raw: false,
    }) as string[][]

    const rows = raw
      .map(r => r.map(c => c?.toString().trim() ?? ""))
      .filter(r => r.some(c => c))

    if (rows.length < 2) continue

    tables.push({ page: 1, rows })
    text += `\n--- SHEET: ${sheetName} ---\n`
    for (const row of rows) text += row.join("\t") + "\n"
  }

  return { tables, text: text.trim() }
}

// ── Main handler ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null

  try {
    const auth = await getAuthContext()
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const shippingLineOverride = (formData.get("shipping_line") as string | null)?.trim().toUpperCase() || null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const fileName = file.name.toLowerCase()
    const isPdf  = fileName.endsWith(".pdf")
    const isXlsx = fileName.endsWith(".xlsx") || fileName.endsWith(".xls")
    if (!isPdf && !isXlsx) {
      return NextResponse.json({ error: "Only PDF and XLSX files are supported" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // ── Extract raw content ─────────────────────────────────────
    let tables: PdfTable[] = []
    let fullText = ""

    if (isXlsx) {
      const result = extractFromXlsx(buffer)
      tables   = result.tables
      fullText = result.text
      console.log(`[extract] XLSX: ${tables.length} sheets, ${tables.reduce((n, t) => n + t.rows.length, 0)} raw rows`)
    } else {
      tempFilePath = join(tmpdir(), `rate-extract-${randomUUID()}.pdf`)
      await writeFile(tempFilePath, buffer)

      try {
        const pdfResult = await extractPdf(tempFilePath)
        tables   = pdfResult.tables
        fullText = pdfResult.text
        console.log(`[extract] PDF: ${tables.length} tables, ${fullText.length} chars`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "PDF extraction failed"
        return NextResponse.json(
          { error: msg.includes("pdfplumber") ? msg : `Failed to read PDF: ${msg}` },
          { status: 422 }
        )
      }

      if (!fullText || fullText.length < 50) {
        return NextResponse.json(
          { error: "PDF has no extractable text (image/scanned). Set the Shipping Line manually and try the XLSX version if available." },
          { status: 422 }
        )
      }
    }

    // ── Phase 1: AI analyzes structure — per-table for multi-sheet XLSX ─
    console.log("[extract] Phase 1 — analyzing document structure...")
    let schemas: DocumentSchema[]
    if (tables.length > 1) {
      // Multi-sheet: analyze each table independently in parallel
      schemas = await runWithConcurrency(
        tables.map(t => () => analyzeStructure(fullText, t, shippingLineOverride)),
        5
      )
      console.log(`[extract] Per-table schemas: ${schemas.map((s,i) => `T${i+1}[${s.col_dest_port},${s.col_rate_20},${s.col_rate_40}]`).join(" ")}`)
    } else {
      schemas = [await analyzeStructure(fullText, tables[0] ?? null, shippingLineOverride)]
    }
    const schema = schemas[0] // Use first schema for metadata (carrier, dates, etc.)
    console.log(`[extract] Schema: ${schema.shipping_line} | ${schema.origin_port} | ${schema.valid_from}–${schema.valid_to} | mode=${schema.extraction_mode} | cols=[${schema.col_dest_port},${schema.col_rate_20},${schema.col_rate_40}] | skip=${JSON.stringify(schema.skip_row_starts)}`)

    // ── Phase 2: Extract rates using schema ─────────────────────
    let rawRows: RateRow[]

    if (schema.extraction_mode === "table" && tables.length > 0) {
      // PATH A — per-table deterministic extraction
      console.log(`[extract] Phase 2A — table extraction (${tables.length} tables)`)
      rawRows = []
      for (let i = 0; i < tables.length; i++) {
        let tbl = tables[i]
        let tSchema = schemas[i] ?? schema

        // Override AI schema with deterministic header-name detection
        tSchema = detectColumnsFromHeader(tbl, tSchema)
        console.log(`[extract] T${i+1} after header detection: [${tSchema.col_dest_port},${tSchema.col_rate_20},${tSchema.col_rate_40}] country=${tSchema.col_dest_country} from=${tSchema.col_valid_from} to=${tSchema.col_valid_to}`)

        // Only attempt multi-group flattening when schema shows dest_port in col 0 or 1
        // (if AI detected col 5+ for dest_port, the table is already structured correctly)
        if (tSchema.col_dest_port <= 1) {
          const flattened = flattenMultiGroupTable(tbl)
          if (flattened !== tbl) {
            console.log(`[extract] T${i+1}: multi-group flattened`)
            tbl = flattened
            tSchema = { ...tSchema, col_dest_port: 0, col_rate_20: 1, col_rate_40: 2 }
          }
        }

        const tableRows = extractFromTablesWithSchema([tbl], tSchema)
        console.log(`[extract] T${i+1} (${tSchema.col_dest_port},${tSchema.col_rate_20},${tSchema.col_rate_40}) → ${tableRows.length} rows`)
        rawRows.push(...tableRows)
      }
      console.log(`[extract] Phase 2A → ${rawRows.length} rows`)
    } else {
      // PATH B — text-based batch GPT (fallback for non-table PDFs)
      console.log("[extract] Phase 2B — text fallback")
      const candidates = filterCandidateRows(fullText, schema)
      console.log(`[extract] Phase 2B — ${candidates.length} candidate rows`)

      if (candidates.length === 0) {
        return NextResponse.json(
          { error: "No rate rows detected. Try uploading an XLSX version or set Shipping Line manually." },
          { status: 422 }
        )
      }

      const tagged = candidates.map((line, i) => ({
        id: `ROW-${String(i + 1).padStart(3, "0")}`,
        line,
      }))

      const batches: TaggedRow[][] = []
      for (let i = 0; i < tagged.length; i += BATCH_SIZE) {
        batches.push(tagged.slice(i, i + BATCH_SIZE))
      }

      console.log(`[extract] Phase 2B — ${batches.length} batches (concurrency 5)`)
      const batchResults = await runWithConcurrency(
        batches.map((batch, i) => async () => {
          console.log(`[extract] Batch ${i + 1}/${batches.length}`)
          return parseBatch(batch, schema)
        }),
        5
      )
      rawRows = batchResults.flat()
    }

    // ── Expand grouped ports (must happen before country assignment) ──
    rawRows = expandGroupedPorts(rawRows)

    // ── Phase 3: Assign dest_country (1 GPT call) ───────────────
    console.log("[extract] Phase 3 — assigning countries...")
    rawRows = await assignDestCountries(rawRows)
    const before = rawRows.length
    const deduped = deduplicateRows(rawRows)
    console.log(`[extract] Deduped: ${before} → ${deduped.length} unique routes`)

    // ── Build final rate objects ─────────────────────────────────
    const rates = deduped.map(row => ({
      shipping_line:  schema.shipping_line,
      origin_country: schema.origin_country,
      origin_port:    schema.origin_port,
      dest_country:   row.dest_country,
      dest_port:      row.dest_port,
      currency:       schema.currency,
      rate_20:        row.rate_20,
      rate_40:        row.rate_40,
      valid_from:     row._valid_from ?? schema.valid_from,
      valid_to:       row._valid_to   ?? schema.valid_to,
      transit_days:   row.transit_days,
      via_port:       row.via_port,
      surcharges:     row.surcharges,
      notes:          row.notes,
      clauses:        schema.clauses,
      pdf_url:        null,
    }))

    console.log(`[extract] Done — ${rates.length} rates`)
    return NextResponse.json({ rates, count: rates.length })

  } catch (err: unknown) {
    console.error("[extract] Unexpected error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    )
  } finally {
    if (tempFilePath) {
      try { await unlink(tempFilePath) } catch { /* ignore */ }
    }
  }
}
