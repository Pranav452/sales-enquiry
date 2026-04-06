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

const SYSTEM_PROMPT = `You are a freight rate extraction engine. Your ONLY job is to extract every single freight rate row from the PDF text provided and return them as a JSON array.

CRITICAL RULES — NEVER BREAK THESE:
1. Extract EVERY SINGLE RATE ROW. Count them as you go. Do NOT skip any row for any reason.
2. Do NOT summarize, group, or combine rows. One destination port = one array element.
3. Do NOT stop early. Process the ENTIRE text from start to finish.
4. Do NOT add commentary, explanations, or markdown. Return ONLY the raw JSON array.
5. If a field is missing, use null. Never invent data.

FIELD SCHEMA (every object must have all these keys):
{
  "shipping_line": string — e.g. "MSC", "PIL", "COSCO", "ESL", "ONE". Use the override value if provided.
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

    // Optional shipping line override (for PDFs where line name is an image)
    const shippingLineOverride = (formData.get("shipping_line") as string | null)?.trim().toUpperCase() || null
    if (shippingLineOverride) {
      console.log(`[extract] Shipping line override: ${shippingLineOverride}`)
    }

    // ── Write temp file for extraction ────────────────────────
    tempFilePath = join(tmpdir(), `rate-extract-${randomUUID()}.pdf`)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(tempFilePath, buffer)

    // ── Extract text (pdfplumber > pdf-parse fallback) ───────
    let pdfText: string
    let extractMethod: string
    try {
      const result = await extractPdfText(tempFilePath)
      pdfText = result.text
      extractMethod = result.method
      console.log(`[extract] Successfully used ${extractMethod} for text extraction`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "PDF extraction failed"
      console.error("[extract] PDF text extraction error:", message)

      return NextResponse.json(
        {
          error: `Failed to read PDF: ${message}. Please ensure the PDF is not password-protected or a scanned image.`,
        },
        { status: 422 }
      )
    }

    if (!pdfText || pdfText.length < 50) {
      return NextResponse.json(
        {
          error:
            "PDF contains no extractable text. Please use a text-based PDF (not a scanned image).",
        },
        { status: 422 }
      )
    }

    // ── Send to GPT-4o for structured extraction ─────────────
    const truncated =
      pdfText.length > 80000 ? pdfText.slice(0, 80000) + "\n[...truncated]" : pdfText

    const userPrompt = shippingLineOverride
      ? `SHIPPING LINE OVERRIDE: Every rate in this document belongs to "${shippingLineOverride}". Set shipping_line = "${shippingLineOverride}" on ALL rows.\n\nExtract every freight rate from this rate sheet:\n\n--- PDF TEXT START ---\n${truncated}\n--- PDF TEXT END ---`
      : `Extract every freight rate from this rate sheet:\n\n--- PDF TEXT START ---\n${truncated}\n--- PDF TEXT END ---`

    let completion
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 16384,
        temperature: 0,         // deterministic — same input always gives same output
        seed: 42,               // extra determinism where supported
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: userPrompt },
        ],
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "API error"
      console.error("[extract] OpenAI API error:", message)

      if (message.includes("API key") || message.includes("auth")) {
        return NextResponse.json(
          { error: "OpenAI API key not configured. Set OPENAI_API_KEY in env." },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: `AI extraction failed: ${message}` },
        { status: 500 }
      )
    }

    const rawText = completion.choices[0]?.message?.content ?? ""

    // ── Parse GPT-4o response ────────────────────────────────
    let rates: unknown[]
    try {
      let text = rawText.trim()
      // Strip markdown fences if GPT-4o wraps anyway
      if (text.startsWith("```")) {
        text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim()
      }
      rates = JSON.parse(text)
      if (!Array.isArray(rates)) throw new Error("Response is not an array")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Parse error"
      console.error("[extract] JSON parse error:", message)

      return NextResponse.json(
        {
          error: `GPT-4o-mini returned malformed data: ${message}. Try again with a clearer PDF.`,
        },
        { status: 500 }
      )
    }

    console.log(`[extract] Successfully extracted ${rates.length} rates using ${extractMethod}`)
    return NextResponse.json({ rates, count: rates.length })
  } catch (err: unknown) {
    console.error("[extract] Unexpected error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    )
  } finally {
    // ── Cleanup temp file ────────────────────────────────────
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
