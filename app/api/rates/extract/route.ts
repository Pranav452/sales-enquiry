export const runtime = "nodejs"
export const maxDuration = 300

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { extractPdfText } from "@/lib/pdf-extract"
import OpenAI from "openai"
import { writeFile, unlink } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { randomUUID } from "crypto"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Max chars per GPT chunk — keeps output well within 16k token limit
const CHUNK_SIZE = 18000

const SYSTEM_PROMPT = `You are a freight rate extraction engine. Your ONLY job is to extract every single freight rate row from the PDF text provided and return them as a JSON array.

CRITICAL RULES — NEVER BREAK THESE:
1. Extract EVERY SINGLE RATE ROW. Do NOT skip any row for any reason.
2. Do NOT summarize, group, or combine rows. One destination port = one array element.
3. Do NOT stop early. Process the ENTIRE text from start to finish.
4. Do NOT add commentary, explanations, or markdown. Return ONLY the raw JSON array.
5. If a field is missing, use null. Never invent data.
6. If there are no rates in this chunk, return an empty array: []

FIELD SCHEMA (every object must have all these keys):
{
  "shipping_line": string — e.g. "MSC", "PIL", "COSCO", "ESL", "ONE". Use override if provided.
  "origin_country": string — usually "INDIA"
  "origin_port": string — e.g. "NHAVA SHEVA", "MUNDRA"
  "dest_country": string
  "dest_port": string — exact port name as written
  "currency": string — "USD" or "EUR"
  "rate_20": number or null — 20ft container rate, digits only
  "rate_40": number or null — 40ft container rate, digits only
  "valid_from": "YYYY-MM-DD" or null
  "valid_to": "YYYY-MM-DD" or null
  "transit_days": number or null
  "via_port": string or null — transhipment port
  "surcharges": string or null — format: "KEY:VALUE;KEY:VALUE" e.g. "EFS:55;BUC:50"
  "notes": string or null — route-specific note only
  "clauses": string or null — ALL document-level terms, footnotes, disclaimers joined with | separator. Same value on every row.
  "pdf_url": null
}

DATE CONVERSION: "01 Apr 2026 – 14 Apr 2026" → valid_from "2026-04-01", valid_to "2026-04-14"
SURCHARGES: Extract abbreviation and value only. "EFS USD 55/TEU" → "EFS:55"
OUTPUT: Raw JSON array only. No markdown fences. No text before or after the array.`

// ── Split text into chunks at page boundaries ──────────────────
function splitIntoChunks(text: string, maxChunkSize: number): string[] {
  const pages = text.split(/\n--- PAGE \d+ ---\n/).filter(Boolean)

  const chunks: string[] = []
  let current = ""

  for (const page of pages) {
    if (current.length + page.length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim())
      current = page
    } else {
      current += "\n" + page
    }
  }

  if (current.trim()) chunks.push(current.trim())

  // If no page markers, fall back to plain character chunking
  if (chunks.length === 0) {
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.slice(i, i + maxChunkSize))
    }
  }

  return chunks
}

// ── Call GPT-4o on a single chunk ─────────────────────────────
async function extractChunk(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
  shippingLineOverride: string | null,
  documentClauses: string
): Promise<unknown[]> {
  const linePrefix = shippingLineOverride
    ? `SHIPPING LINE OVERRIDE: Every rate belongs to "${shippingLineOverride}". Set shipping_line = "${shippingLineOverride}" on ALL rows.\n\n`
    : ""

  const clauseNote = documentClauses
    ? `DOCUMENT CLAUSES (apply to all rows): ${documentClauses}\n\n`
    : ""

  const prompt = `${linePrefix}${clauseNote}Extract every freight rate from this section (chunk ${chunkIndex + 1} of ${totalChunks}):\n\n--- TEXT START ---\n${chunk}\n--- TEXT END ---`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16384,
    temperature: 0,
    seed: 42,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
  })

  const finishReason = completion.choices[0]?.finish_reason
  const rawText = completion.choices[0]?.message?.content ?? "[]"

  if (finishReason === "length") {
    console.warn(`[extract] Chunk ${chunkIndex + 1} hit token limit — response may be truncated`)
  }

  let text = rawText.trim()
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim()
  }

  // If truncated JSON, attempt to salvage complete objects
  if (finishReason === "length" && !text.endsWith("]")) {
    const lastComplete = text.lastIndexOf("},")
    if (lastComplete > 0) {
      text = text.slice(0, lastComplete + 1) + "]"
      console.warn(`[extract] Salvaged truncated JSON up to position ${lastComplete}`)
    } else {
      return []
    }
  }

  const parsed = JSON.parse(text)
  return Array.isArray(parsed) ? parsed : []
}

// ── Extract document-level clauses from full text ──────────────
async function extractClauses(text: string): Promise<string> {
  // Only extract clauses if text has meaningful content beyond rates
  if (text.length < 200) return ""

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "Extract ALL document-level terms, conditions, footnotes, surcharge explanations, and disclaimers from this freight rate sheet. Return them as a single string with each clause separated by a | character. Return only the clauses string, nothing else. If none found, return empty string.",
        },
        { role: "user", content: text.slice(0, 8000) },
      ],
    })
    return completion.choices[0]?.message?.content?.trim() ?? ""
  } catch {
    return ""
  }
}

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null

  try {
    const auth = await getAuthContext()
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.log("[extract] Starting PDF extraction")
    console.log("[extract] PDF_SERVICE_URL:", process.env.PDF_SERVICE_URL ? "SET" : "NOT SET")

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })
    }

    const shippingLineOverride =
      (formData.get("shipping_line") as string | null)?.trim().toUpperCase() || null
    if (shippingLineOverride) {
      console.log(`[extract] Shipping line override: ${shippingLineOverride}`)
    }

    // ── Write temp file ────────────────────────────────────────
    tempFilePath = join(tmpdir(), `rate-extract-${randomUUID()}.pdf`)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(tempFilePath, buffer)

    // ── Extract text via pdfplumber / pdf-parse ───────────────
    let pdfText: string
    let extractMethod: string
    try {
      const result = await extractPdfText(tempFilePath)
      pdfText = result.text
      extractMethod = result.method
      console.log(`[extract] ${extractMethod} extracted ${pdfText.length} chars`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "PDF extraction failed"
      console.error("[extract] Text extraction error:", message)
      return NextResponse.json(
        { error: `Failed to read PDF: ${message}` },
        { status: 422 }
      )
    }

    if (!pdfText || pdfText.length < 50) {
      return NextResponse.json(
        { error: "PDF contains no extractable text. Please use a text-based PDF." },
        { status: 422 }
      )
    }

    // ── Extract document-level clauses first (fast, cheap) ────
    console.log("[extract] Extracting document clauses...")
    const documentClauses = await extractClauses(pdfText)
    if (documentClauses) {
      console.log(`[extract] Clauses extracted (${documentClauses.length} chars)`)
    }

    // ── Split into chunks and process each ────────────────────
    const chunks = splitIntoChunks(pdfText, CHUNK_SIZE)
    console.log(`[extract] Split into ${chunks.length} chunk(s), processing...`)

    const allRates: unknown[] = []

    for (let i = 0; i < chunks.length; i++) {
      console.log(`[extract] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`)
      try {
        const chunkRates = await extractChunk(
          chunks[i],
          i,
          chunks.length,
          shippingLineOverride,
          documentClauses
        )
        console.log(`[extract] Chunk ${i + 1} → ${chunkRates.length} rates`)
        allRates.push(...chunkRates)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Chunk error"
        console.error(`[extract] Chunk ${i + 1} failed: ${message}`)
        // Continue with other chunks rather than failing entirely
      }
    }

    // ── Backfill clauses onto all rates that have none ────────
    if (documentClauses) {
      for (const rate of allRates) {
        const r = rate as Record<string, unknown>
        if (!r.clauses) r.clauses = documentClauses
      }
    }

    console.log(`[extract] Total: ${allRates.length} rates from ${chunks.length} chunk(s) using ${extractMethod}`)
    return NextResponse.json({ rates: allRates, count: allRates.length })

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
