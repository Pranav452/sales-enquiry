/**
 * PDF extraction that uses external Python service when available.
 * Calls microservice (Railway/Render) for pdfplumber extraction.
 * Falls back to local pdf-parse if service unavailable.
 */
import fs from "fs"

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || ""

export async function extractPdfText(
  filePath: string
): Promise<{ text: string; method: "pdfplumber-service" | "pdf-parse" }> {
  // Try external Python service first (if configured)
  if (PDF_SERVICE_URL && PDF_SERVICE_URL.trim()) {
    console.log(`[pdf-extract] Attempting service extraction from ${PDF_SERVICE_URL}`)
    try {
      const result = await extractViaService(filePath)
      console.log(`[pdf-extract] Service extraction successful`)
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Service error"
      console.error(`[pdf-extract] Service failed: ${message}`)
      // If PDF_SERVICE_URL is configured, always throw — do NOT fall back to pdf-parse
      // (pdf-parse fails on Vercel trying to load a test file)
      throw new Error(`PDF extraction service error: ${message}`)
    }
  }

  // No service configured — only reach here in local dev without PDF_SERVICE_URL
  console.log(`[pdf-extract] No PDF_SERVICE_URL set, using local pdf-parse`)
  return await extractViaPdfParse(filePath)
}

async function pingService(): Promise<boolean> {
  try {
    const res = await fetch(`${PDF_SERVICE_URL}/health`, { method: "GET" })
    return res.ok
  } catch {
    return false
  }
}

async function extractViaService(
  filePath: string
): Promise<{ text: string; method: "pdfplumber-service" }> {
  if (!PDF_SERVICE_URL) throw new Error("PDF_SERVICE_URL not configured")

  // ── Wake up Render free tier if sleeping ─────────────────
  console.log(`[service-extract] Pinging service to wake up...`)
  const awake = await pingService()
  if (!awake) {
    // Service is cold-starting — wait up to 30s for it to boot
    console.log(`[service-extract] Service cold-starting, waiting 15s...`)
    await new Promise((r) => setTimeout(r, 15000))
    const awake2 = await pingService()
    if (!awake2) {
      await new Promise((r) => setTimeout(r, 15000))
      const awake3 = await pingService()
      if (!awake3) throw new Error("PDF service is unavailable (cold start timeout)")
    }
  }
  console.log(`[service-extract] Service is up`)

  // ── Read file and send to service ────────────────────────
  console.log(`[service-extract] Reading file: ${filePath}`)
  const buffer = fs.readFileSync(filePath)
  console.log(`[service-extract] File size: ${buffer.length} bytes`)

  const formData = new FormData()
  formData.append("file", new Blob([buffer], { type: "application/pdf" }), "document.pdf")

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000)

  try {
    console.log(`[service-extract] Calling ${PDF_SERVICE_URL}/extract`)
    const response = await fetch(`${PDF_SERVICE_URL}/extract`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    console.log(`[service-extract] Response status: ${response.status}`)
    const rawBody = await response.text()
    console.log(`[service-extract] Raw response (first 300 chars): ${rawBody.slice(0, 300)}`)

    if (!response.ok) {
      throw new Error(`Service error (${response.status}): ${rawBody.slice(0, 300)}`)
    }

    let result: { success: boolean; text: string; detail?: string }
    try {
      result = JSON.parse(rawBody)
    } catch {
      throw new Error(`Service returned non-JSON: ${rawBody.slice(0, 200)}`)
    }

    if (!result.success) {
      throw new Error(result.detail || "Service extraction failed")
    }

    console.log(`[service-extract] Extracted ${result.text.length} characters`)
    return { text: result.text, method: "pdfplumber-service" }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function extractViaPdfParse(
  filePath: string
): Promise<{ text: string; method: "pdf-parse" }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse")

  const buffer = fs.readFileSync(filePath)
  const data = await pdfParse(buffer)

  return { text: (data.text ?? "").trim(), method: "pdf-parse" }
}
