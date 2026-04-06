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
    try {
      return await extractViaService(filePath)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Service error"
      console.warn(`[pdf-extract] Service failed, falling back to pdf-parse: ${message}`)
      // Fall through to pdf-parse
    }
  }

  // Fallback to local pdf-parse (pure JS, works on Vercel)
  return await extractViaPdfParse(filePath)
}

async function extractViaService(
  filePath: string
): Promise<{ text: string; method: "pdfplumber-service" }> {
  if (!PDF_SERVICE_URL) throw new Error("PDF_SERVICE_URL not configured")

  const buffer = fs.readFileSync(filePath)
  const formData = new FormData()
  formData.append("file", new Blob([buffer], { type: "application/pdf" }), "document.pdf")

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(`${PDF_SERVICE_URL}/extract`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Service error (${response.status}): ${error}`)
    }

    const result = (await response.json()) as { success: boolean; text: string; detail?: string }
    if (!result.success) {
      throw new Error(result.detail || "Service extraction failed")
    }

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
