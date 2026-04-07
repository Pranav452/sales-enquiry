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
  col_dest_port:  number          // Required
  col_rate_20:    number          // Required
  col_rate_40:    number          // Required
  col_via_port:   number | null
  col_surcharges: number | null
  col_transit:    number | null

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
  shippingLineOverride?: string | null
): Promise<DocumentSchema> {
  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    max_completion_tokens: 1024,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are a freight rate sheet document analyst.
You receive raw extracted content from a shipping rate sheet (tab-separated table rows or plain text).
Your job is to understand the document structure and return a JSON schema that describes:
1. Document metadata (shipping line, origin, validity, currency, clauses)
2. Exact column positions for rate data extraction

COLUMN DETECTION RULES:
- col_dest_port: the column that has destination port names (usually col 0)
- col_rate_20: the column with 20ft container rates (look for "20'" or "20" in the header row)
- col_rate_40: the column with 40ft container rates (look for "40'" or "40HC" or "40" in the header row)
- If columns are unclear, default: dest_port=0, rate_20=1, rate_40=2
- col_via_port / col_surcharges / col_transit: set to null if not present

SKIP ROW DETECTION:
- skip_row_starts: list of strings that identify section headers, not rate rows
  (e.g. "WEST AFRICA", "EAST AFRICA", "Ex-", "Rates in USD", "Subject to")
  These are rows where the first cell is a section title, not a port name.

EXTRACTION MODE:
- Use "table" if the content has clear tab-separated columns with rate data
- Use "text" if the content is mostly plain text paragraphs (no clear table structure)

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
  "col_via_port": number or null,
  "col_surcharges": number or null,
  "col_transit": number or null,
  "skip_row_starts": string[]
}`,
      },
      {
        role: "user",
        content: rawContent.slice(0, 4000),
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
      col_dest_port:   parsed.col_dest_port    ?? 0,
      col_rate_20:     parsed.col_rate_20      ?? 1,
      col_rate_40:     parsed.col_rate_40      ?? 2,
      col_via_port:    parsed.col_via_port     ?? null,
      col_surcharges:  parsed.col_surcharges   ?? null,
      col_transit:     parsed.col_transit      ?? null,
      skip_row_starts: Array.isArray(parsed.skip_row_starts) ? parsed.skip_row_starts : [],
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
      col_dest_port:   0,
      col_rate_20:     1,
      col_rate_40:     2,
      col_via_port:    null,
      col_surcharges:  null,
      col_transit:     null,
      skip_row_starts: [],
    }
  }
}

// ── Phase 2A: Table extraction using schema (deterministic) ───

function parseRateCell(cell: string): number | null {
  if (!cell) return null
  const cleaned = cell.replace(/[$,+\s]|USD|EUR/gi, "")
  const match = cleaned.match(/\b(\d{3,6})\b/)
  if (match) {
    const val = parseInt(match[1])
    return val >= 200 ? val : null
  }
  return null
}

function extractFromTablesWithSchema(tables: PdfTable[], schema: DocumentSchema): RateRow[] {
  const rows: RateRow[] = []
  const skipSet = schema.skip_row_starts.map(s => s.toUpperCase())

  for (const table of tables) {
    for (const row of table.rows) {
      const destPort = (row[schema.col_dest_port] ?? "").trim()
      if (!destPort) continue

      // Skip section headers and meta rows identified by the schema
      const destUpper = destPort.toUpperCase()
      if (skipSet.some(skip => destUpper.startsWith(skip))) continue

      const rate20 = parseRateCell(row[schema.col_rate_20] ?? "")
      const rate40 = parseRateCell(row[schema.col_rate_40] ?? "")

      // Skip rows with no valid rates (section sub-headers, blank rows)
      if (rate20 === null && rate40 === null) continue

      rows.push({
        dest_port:    destPort,
        dest_country: null, // assigned in Phase 3
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

  const portList = portsNeedingCountry.map((p, i) => `${i + 1}. ${p}`).join("\n")
  let countryMap      = new Map<string, string>()
  let correctedPortMap = new Map<string, string>()

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

Return ONLY raw JSON where each KEY is the ORIGINAL (possibly misspelled) port name and VALUE is an object:
{"ORIGINAL_PORT": {"corrected": "CORRECT PORT NAME", "country": "COUNTRY NAME"}}
Use UPPERCASE for all values. Example:
{"Brsibane": {"corrected": "BRISBANE", "country": "AUSTRALIA"}, "APAPA": {"corrected": "APAPA", "country": "NIGERIA"}}`,
        },
        { role: "user", content: `Process these ports:\n${portList}` },
      ],
    })

    let text = completion.choices[0]?.message?.content?.trim() ?? "{}"
    if (text.startsWith("```")) text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim()
    const parsed = JSON.parse(text)
    // Build two maps: original → corrected port name, original → country
    type PortInfo = { corrected?: string; country?: string }
    correctedPortMap = new Map(
      Object.entries(parsed).map(([k, v]) => {
        const info = v as PortInfo
        return [k.toUpperCase(), (info.corrected ?? k).toUpperCase()]
      })
    )
    countryMap = new Map(
      Object.entries(parsed).map(([k, v]) => {
        const info = v as PortInfo
        return [k.toUpperCase(), (info.country ?? "").toUpperCase()]
      })
    )
  } catch (e) {
    console.warn("[extract] assignDestCountries failed:", e)
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

    // Split on comma or slash when the cell clearly contains multiple port names
    // (only split if there are 2+ words that look like port names — not "NEW ZEALAND")
    const parts = row.dest_port
      .split(/[,\/]/)
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

    // ── Phase 1: AI analyzes structure → DocumentSchema ─────────
    console.log("[extract] Phase 1 — analyzing document structure...")
    const schema = await analyzeStructure(fullText, shippingLineOverride)
    console.log(`[extract] Schema: ${schema.shipping_line} | ${schema.origin_port} | ${schema.valid_from}–${schema.valid_to} | mode=${schema.extraction_mode} | cols=[${schema.col_dest_port},${schema.col_rate_20},${schema.col_rate_40}] | skip=${JSON.stringify(schema.skip_row_starts)}`)

    // ── Phase 2: Extract rates using schema ─────────────────────
    let rawRows: RateRow[]

    if (schema.extraction_mode === "table" && tables.length > 0) {
      // PATH A — deterministic table extraction (zero additional GPT calls)
      console.log(`[extract] Phase 2A — table extraction (${tables.length} tables)`)
      rawRows = extractFromTablesWithSchema(tables, schema)
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
      valid_from:     schema.valid_from,
      valid_to:       schema.valid_to,
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
