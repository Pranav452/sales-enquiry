import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"

const execFileAsync = promisify(execFile)

// ─── Types ─────────────────────────────────────────────────────

export interface PdfTable {
  page: number
  rows: string[][]  // Raw rows — no header detection, AI figures out structure
}

export interface PdfExtractResult {
  text: string        // Full concatenated text (all pages)
  header_text: string // First 3000 chars (for context extraction)
  tables: PdfTable[]  // Structured tables (deterministic rate parsing)
  has_tables: boolean
}

// ─── Main function ─────────────────────────────────────────────

/**
 * Extract structured content from a PDF using pdfplumber via Python subprocess.
 * Returns both raw text AND structured table data for deterministic rate parsing.
 */
export async function extractPdf(filePath: string): Promise<PdfExtractResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found: ${filePath}`)
  }

  const pythonScript = path.join(process.cwd(), "lib", "pdf-extract.py")
  let lastError: Error | null = null

  for (const cmd of ["python3", "python"]) {
    try {
      const { stdout, stderr } = await execFileAsync(cmd, [pythonScript, filePath], {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      })

      if (stderr && stderr.trim()) {
        console.warn(`[pdf-extract] ${cmd} stderr:`, stderr)
      }

      const result = JSON.parse(stdout)

      if (!result.success) {
        throw new Error(result.error || "PDF extraction failed")
      }

      return {
        text:        result.text        ?? "",
        header_text: result.header_text ?? (result.text ?? "").slice(0, 3000),
        tables:      result.tables      ?? [],
        has_tables:  result.has_tables  ?? false,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      lastError = err instanceof Error ? err : new Error(String(err))

      if (message.includes("ENOENT") || message.includes("not found")) {
        console.log(`[pdf-extract] ${cmd} not found, trying next...`)
        continue
      }

      console.error(`[pdf-extract] ${cmd} failed:`, message)
      break
    }
  }

  const message = lastError?.message ?? "Unknown error"
  if (message.includes("ENOENT") || message.includes("not found")) {
    throw new Error("Python with pdfplumber not found. Install: python -m pip install pdfplumber")
  }

  throw new Error(`PDF extraction error: ${message}`)
}
