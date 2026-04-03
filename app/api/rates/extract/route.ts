export const runtime = "nodejs"
export const maxDuration = 120

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { extractPdfText } from "@/lib/pdf-extract"
import OpenAI from "openai"
import { writeFile, unlink } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { randomUUID } from "crypto"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a freight rate extraction assistant for a shipping/logistics company.

You will receive the raw text extracted from a shipping line rate sheet PDF. Extract ALL freight rates you can find.

Return a JSON array. Each element must have these exact fields (use null if not found):
- shipping_line: string (e.g. "MSC", "PIL", "COSCO", "ESL", "ONE" — infer from document header if not per row)
- origin_country: string (usually "INDIA" for these sheets)
- origin_port: string (e.g. "NHAVA SHEVA", "MUNDRA")
- dest_country: string
- dest_port: string
- currency: string (e.g. "USD", "EUR")
- rate_20: number or null (20' container rate — numeric only, no symbols)
- rate_40: number or null (40' container rate — numeric only, no symbols)
- valid_from: string ISO date "YYYY-MM-DD" or null
- valid_to: string ISO date "YYYY-MM-DD" or null
- transit_days: number or null
- via_port: string or null (transhipment/connecting port)
- surcharges: string or null (semicolon-separated KEY:VALUE pairs, e.g. "EFS:55;BUC:50;OCC:86")
- notes: string or null (route-specific short note)
- clauses: string or null (pipe-separated list of ALL general terms, conditions, footnotes, disclaimers, surcharge explanations found ANYWHERE in the document — same value for every row since they are document-level)
- pdf_url: null (always null — set after upload)

Rules:
1. Extract EVERY route row without exception, including nominal/freight-free routes ($1 rates).
2. clauses: capture everything from the footnotes/terms section using | as separator.
3. surcharges: abbreviation:value format only, semicolon-separated.
4. Convert date formats like "01 Apr 2026 – 14 Apr 2026" → valid_from "2026-04-01", valid_to "2026-04-14".
5. Do NOT invent data. Missing fields = null.
6. Return ONLY the raw JSON array — no markdown fences, no explanation text.`

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null

  try {
    const auth = await getAuthContext()
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })
    }

    // ── Write temp file for Python subprocess ────────────────
    tempFilePath = join(tmpdir(), `rate-extract-${randomUUID()}.pdf`)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(tempFilePath, buffer)

    // ── Extract text using pdfplumber ───────────────────────
    let pdfText: string
    try {
      pdfText = await extractPdfText(tempFilePath)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "PDF extraction failed"
      console.error("[extract] PDF text extraction failed:", message)

      if (message.includes("Python") || message.includes("pdfplumber")) {
        return NextResponse.json(
          {
            error:
              "PDF extraction requires Python 3 with pdfplumber. Install: python -m pip install pdfplumber",
          },
          { status: 503 }
        )
      }
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

    // ── Send to GPT-4o for structured extraction ─────────────
    const truncated =
      pdfText.length > 80000 ? pdfText.slice(0, 80000) + "\n[...truncated]" : pdfText

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 16384,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract all freight rates from this rate sheet:\n\n--- PDF TEXT START ---\n${truncated}\n--- PDF TEXT END ---`,
        },
      ],
    })

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
      if (!Array.isArray(rates)) throw new Error("Not an array")
    } catch {
      return NextResponse.json(
        { error: "GPT-4o returned malformed data — could not parse rate list. Try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({ rates, count: rates.length })
  } catch (err: unknown) {
    console.error("Extract error:", err)
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
