import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"

const execFileAsync = promisify(execFile)

/**
 * Extract text and tables from a PDF using pdfplumber via Python subprocess.
 * Handles rate sheets with complex table layouts.
 */
export async function extractPdfText(filePath: string): Promise<string> {
  // Verify file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found: ${filePath}`)
  }

  const pythonScript = path.join(process.cwd(), "lib", "pdf-extract.py")

  // Try python3 first, fall back to python on Windows
  let lastError: Error | null = null

  for (const cmd of ["python3", "python"]) {
    try {
      const { stdout, stderr } = await execFileAsync(cmd, [pythonScript, filePath], {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large PDFs
      })

      if (stderr && stderr.trim()) {
        console.warn(`[${cmd}] stderr:`, stderr)
      }

      const result = JSON.parse(stdout)
      if (!result.success) {
        throw new Error(result.error || "PDF extraction failed")
      }

      return result.text
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      lastError = err instanceof Error ? err : new Error(String(err))

      // If it's a "command not found" error, try the next one
      if (message.includes("ENOENT") || message.includes("not found")) {
        console.log(`[pdf-extract] ${cmd} not found, trying next...`)
        continue
      }

      // Otherwise it's a real error, don't try other commands
      console.error(`[pdf-extract] ${cmd} failed:`, message)
      break
    }
  }

  // If we get here, neither python nor python3 worked
  const message = lastError?.message ?? "Unknown error"
  if (message.includes("ENOENT") || message.includes("not found")) {
    throw new Error(
      "Python with pdfplumber not found. Install: python -m pip install pdfplumber"
    )
  }

  throw new Error(`PDF extraction error: ${message}`)
}
