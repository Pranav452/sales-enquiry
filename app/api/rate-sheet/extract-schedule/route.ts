import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Carrier-specific prompts built from real screenshot structures ───────────

function buildPrompt(carrier: string): string {
  const base = `You are extracting vessel schedule data from a ${carrier} screenshot.

Return ONLY a valid JSON array — no markdown, no explanation, no backticks, no text before or after.

Each sailing must have exactly these fields:
{
  "vessel_name":  string,       // Full vessel name in UPPERCASE. Use "TBN" if blank or "To Be Named"
  "voyage_no":    string|null,  // Voyage/booking reference e.g. "OM626A", "626W", "FE4-126E" — null if not shown
  "etd":          string,       // Departure date → "D Mon YYYY" e.g. "1 Jul 2026", "16 Jul 2026"
  "eta":          string,       // Arrival date → same format
  "transit_days": string,       // Whole days only e.g. "18 days", "20 days" — drop hours/minutes
  "via_port":     string|null,  // "Direct" / "Transhipment" / named port e.g. "Colombo, LK" — null if unknown
  "gate_in":      string|null   // Gate-in/cut-off date → "D Mon YYYY" — null if not shown
}

DATE NORMALISATION (always apply):
  "Wed 1st Jul 2026"   → "1 Jul 2026"
  "29 June 2026"       → "29 Jun 2026"
  "06 July 2026"       → "6 Jul 2026"
  "02-Jul-2026"        → "2 Jul 2026"
  "Thursday, 02-Jul-2026" → "2 Jul 2026"
  Rule: D Mon YYYY — single-digit day, 3-letter month, no leading zero.

TRANSIT TIME (always round down to whole days):
  "20 days 10 hours" → "20 days"
  "18 days 1 hour"   → "18 days"
  "12 Days"          → "12 days"   (lowercase)

`

  const specific: Record<string, string> = {

    "CMA CGM": `WHAT YOU WILL SEE:
CMA CGM schedule pages display sailings as a vertical timeline/list.
Each sailing entry shows (top to bottom):
  • Departure date header  e.g. "Tuesday, 30-Jun-2026" or "Monday, 06-Jul-2026"
  • "First Service" label + service code  e.g. SWAX2, MIDAS1, MIDAS2, INDAMEX, EPIC, PIKEX2, PIKEX, FE4, AEX, EARLI
  • "Vessel" label + vessel name  e.g. "CMA CGM MOMBASA", "ZHONG GU RI ZHAO", "APL ANTWERP", "SOL UNITY"
  • CO2 line — ignore
  • Transit days badge  e.g. "12 Days", "28 Days"
  • Routing badge — "+ Direct" means via_port = "Direct"; "+ via COLOMBO , LK" → via_port = "Colombo, LK"
  • Arrival date at bottom  e.g. "Tuesday, 14-Jul-2026"

RULES FOR CMA CGM:
  - Extract ALL sailings visible, even if they have a red dot (earliest available).
  - voyage_no is NOT shown on CMA CGM schedule pages — always set to null.
  - gate_in is NOT shown by CMA CGM — always set to null.
  - Normalise "via COLOMBO , LK" → "Colombo, LK", "via PORT KLANG , MY" → "Port Klang, MY", etc.
  - If the routing badge shows "+ Direct", via_port = "Direct".`,

    "Maersk": `WHAT YOU WILL SEE:
Maersk pages show individual sailing cards. Each card typically has four columns across the top:

  [Departure]          [Gate in Deadline]     [Arrival]            [Transit time]
  29 June 2026         09 July 2026           19 July 2026         20 days 10 hours
  (sometimes with time e.g. "01:00" — ignore the time)

Below the dates, the vessel and voyage are shown as "VESSEL NAME / VOYAGE" e.g.:
  "MAERSK CUBANGO / 626W"   "Maersk Florence / 628W"   "CMA CGM MASAI MARA / 630W"
  (if vessel section is missing or blank, use vessel_name = "TBN" and voyage_no = null)

RULES FOR MAERSK:
  - Each screenshot usually shows ONE card — extract whatever cards are visible.
  - Gate in Deadline → gate_in field (date only, normalised).
  - "Transit time" like "20 days 10 hours" → transit_days = "20 days".
  - Maersk does NOT show via_port in these card views → via_port = null.
  - Vessel names can be mixed case ("Maersk Florence") — convert to UPPERCASE in output.
  - If a card says "Maersk Spot - Vessel sold out" or similar status text, still extract the sailing — the dates are real.`,

    "MSC": `WHAT YOU WILL SEE:
MSC shows sailings in a table with these columns (left to right):
  Departure | Arrival | Vessel / Voyage No. | Estimated Transit Time | Routing Type

  Example row:
  "Wed 1st Jul 2026" | "Sun 19th Jul 2026" | "MSC ROBERTA V" (line 1) / "OM626A" (line 2) | "18 Days" | "Transhipment"
  "Wed 15th Jul 2026" | "Sun 2nd Aug 2026" | "TBN" (line 1) / "OM628A" (line 2) | "18 Days" | "Transhipment"

RULES FOR MSC:
  - Extract ALL rows visible — including TBN (To Be Named) vessels.
  - Vessel/Voyage cell: first line = vessel_name (uppercase), second line = voyage_no.
  - "Routing Type" → "Transhipment" means via_port = "Transhipment"; "Direct" means via_port = "Direct".
  - MSC does NOT show gate_in dates → gate_in = null always.
  - "Estimated Transit Time" e.g. "18 Days" → transit_days = "18 days" (lowercase).`,

    "ONE LINE": `WHAT YOU WILL SEE:
ONE LINE schedule pages show sailings in a list or table format.
Look for: vessel name, voyage number, departure date (ETD), arrival date (ETA), transit time, and routing/via port info.

RULES FOR ONE LINE:
  - Extract all sailings visible.
  - gate_in is typically shown as "SI Cutoff" or "VGM Cutoff" — if visible, extract as gate_in.
  - If no gate_in is shown, set to null.`,

    "Hapag-Lloyd": `WHAT YOU WILL SEE:
Hapag-Lloyd schedule pages show sailings in a table or list with vessel name, voyage, departure, arrival, transit, and ports.

RULES FOR HAPAG-LLOYD:
  - Extract all visible sailings.
  - "SI Cutoff" or "Documentation Cutoff" date → gate_in.
  - Transshipment ports may be listed as "via [PORT]" — use as via_port.`,

    "Evergreen": `WHAT YOU WILL SEE:
Evergreen schedule pages show sailings in a table with vessel name, voyage, CY Closing date (gate-in), ETD, ETA, and transit days.

RULES FOR EVERGREEN:
  - "CY Closing" or "CY CUT" date → gate_in.
  - Transit days shown as a number — append " days" e.g. "30" → "30 days".
  - Extract all visible sailings.`,
  }

  const fallback = `Extract all vessel schedule data visible in the image following the JSON structure and rules above.
  gate_in = null if no gate-in/cutoff date is shown.
  voyage_no = null if no voyage reference is visible.`

  return base + (specific[carrier] ?? fallback)
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function dedup(sailings: Record<string, string | null>[]) {
  const seen = new Set<string>()
  return sailings.filter(s => {
    const key = `${(s.etd ?? "").toLowerCase().trim()}||${(s.vessel_name ?? "").toLowerCase().trim()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── Parse GPT response ───────────────────────────────────────────────────────

function parseGptJson(raw: string): Record<string, string | null>[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim()
  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (!match) return []
    try { return JSON.parse(match[0]) } catch { return [] }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const carrier = (formData.get("carrier") as string | null)?.trim()
  if (!carrier) return NextResponse.json({ error: "carrier required" }, { status: 400 })

  const images = formData.getAll("images") as File[]
  if (images.length === 0) return NextResponse.json({ error: "No images provided" }, { status: 400 })
  if (images.length > 15) return NextResponse.json({ error: "Maximum 15 images per extraction" }, { status: 400 })

  const prompt = buildPrompt(carrier)

  // Process all images in parallel
  const results = await Promise.allSettled(
    images.map(async (img) => {
      const bytes = await img.arrayBuffer()
      const base64 = Buffer.from(bytes).toString("base64")
      const mime = img.type || "image/png"

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime};base64,${base64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      })

      const raw = response.choices[0]?.message?.content ?? "[]"
      return parseGptJson(raw)
    })
  )

  const allSailings = results.flatMap(r => (r.status === "fulfilled" ? r.value : []))
  const deduped = dedup(allSailings)

  // Sort by ETD (best-effort — strings vary, so just keep them ordered)
  return NextResponse.json(deduped)
}

export const dynamic = "force-dynamic"
