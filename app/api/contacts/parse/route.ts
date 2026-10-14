import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { getAuthContext } from "@/lib/api-auth"

// Flexible header matching — handles varied Excel column naming.
// Keys are lowercased + trimmed raw header strings.
// Values are the canonical field names used in the app.
const HEADER_ALIASES: Record<string, string> = {
  // ── shipper ───────────────────────────────────────────────────
  "shipper":              "shipper_name",
  "shipper name":         "shipper_name",
  "shipper_name":         "shipper_name",
  "exporter":             "shipper_name",
  "shipper/exporter":     "shipper_name",
  "exporter name":        "shipper_name",
  "company":              "shipper_name",   // prospect lists use COMPANY
  "company name":         "shipper_name",

  // ── consignee ─────────────────────────────────────────────────
  "consignee":            "consignee_name",
  "consignee name":       "consignee_name",
  "consignee_name":       "consignee_name",
  "importer":             "consignee_name",
  "consignee/importer":   "consignee_name",
  "importer name":        "consignee_name",

  // ── mode ──────────────────────────────────────────────────────
  "mode":                 "mode",
  "shipping mode":        "mode",
  "transport mode":       "mode",
  "mode of shipment":     "mode",
  "sea/air":              "mode",   // ← this file uses "SEA/AIR"
  "air/sea":              "mode",
  "sea / air":            "mode",
  "air / sea":            "mode",
  "shipment mode":        "mode",
  "type":                 "mode",

  // ── pol ───────────────────────────────────────────────────────
  "pol":                  "pol",
  "port of loading":      "pol",
  "origin port":          "pol",
  "port of origin":       "pol",
  "loading port":         "pol",
  "origin":               "pol",

  // ── pod ───────────────────────────────────────────────────────
  "pod":                  "pod",
  "port of discharge":    "pod",
  "destination port":     "pod",
  "port of destination":  "pod",
  "discharge port":       "pod",
  "destination":          "pod",

  // ── contact person (name) ─────────────────────────────────────
  "contact person":       "contact_person",
  "contact_person":       "contact_person",
  "contact name":         "contact_person",
  "person":               "contact_person",
  "sales contact":        "contact_person",
  "attn":                 "contact_person",
  "attention":            "contact_person",
  "pic":                  "contact_person",
  "person in charge":     "contact_person",

  // ── designation (folded into contact_person, no own column) ───
  "desg":                 "designation",
  "desig":                "designation",
  "designation":          "designation",

  // ── contact number (phone) ────────────────────────────────────
  // NOTE: plain "contact" is treated as a phone number because
  // most freight Excel sheets use "CONTACT" for the phone field.
  "contact":              "contact_number",
  "contact number":       "contact_number",
  "contact_number":       "contact_number",
  "phone":                "contact_number",
  "mobile":               "contact_number",
  "number":               "contact_number",
  "tel":                  "contact_number",
  "telephone":            "contact_number",
  "phone number":         "contact_number",
  "mobile number":        "contact_number",
  "cell":                 "contact_number",

  // ── email ─────────────────────────────────────────────────────
  "email":                "email",
  "email address":        "email",
  "e-mail":               "email",
  "e mail":               "email",
  "mail":                 "email",
  "email id":             "email",   // ← this file uses "EMAIL ID"
  "email id.":            "email",
  "emailid":              "email",
}

// Normalise mode values from various free-text representations
function normaliseMode(raw: string): string {
  const v = raw.trim().toUpperCase()
  if (v === "SEA" || v === "OCEAN" || v.startsWith("SEA") || v === "FCL" || v === "LCL") return "SEA"
  if (v === "AIR" || v.startsWith("AIR")) return "AIR"
  return raw.trim()
}

type ContactRow = {
  shipper_name:   string
  consignee_name: string
  mode:           string
  pol:            string
  pod:            string
  contact_person: string
  contact_number: string
  email:          string
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const buffer   = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheet    = workbook.Sheets[workbook.SheetNames[0]]

    // sheet_to_json with raw:false converts numbers/dates to strings
    const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    })

    if (!raw.length) {
      return NextResponse.json({ error: "Spreadsheet is empty" }, { status: 400 })
    }

    // Map raw headers → canonical field names
    const mappedRows: ContactRow[] = raw.map((row) => {
      const mapped: Partial<ContactRow & { designation: string }> = {}
      for (const [rawKey, rawVal] of Object.entries(row)) {
        const canonical = HEADER_ALIASES[rawKey.trim().toLowerCase()]
        if (canonical) {
          mapped[canonical as keyof typeof mapped] = String(rawVal ?? "").trim()
        }
      }

      const mode = mapped.mode ? normaliseMode(mapped.mode) : ""
      const person = mapped.contact_person ?? ""
      const desg   = mapped.designation ?? ""

      return {
        shipper_name:   mapped.shipper_name   ?? "",
        consignee_name: mapped.consignee_name ?? "",
        mode,
        pol:            mapped.pol            ?? "",
        pod:            mapped.pod            ?? "",
        contact_person: person && desg ? `${person} (${desg})` : person,
        contact_number: mapped.contact_number ?? "",
        email:          mapped.email          ?? "",
      }
    }).filter((c) =>
      // Drop completely blank rows
      c.shipper_name || c.consignee_name || c.contact_person || c.contact_number || c.email
    )

    // Merge rows that would otherwise be lost on save: continuation rows
    // (extra email/phone under the row above) and repeat rows for the same
    // shipper (POST dedups on shipper name, so a 2nd person would be skipped).
    const appendDistinct = (a: string, b: string) =>
      !b || a.toLowerCase().includes(b.toLowerCase()) ? a : a ? `${a} / ${b}` : b

    const contacts: ContactRow[] = []
    const byShipper = new Map<string, ContactRow>()
    for (const c of mappedRows) {
      const key = c.shipper_name.toLowerCase()
      const isContinuation = !c.shipper_name && !c.consignee_name && !c.contact_person
      const target = isContinuation ? contacts[contacts.length - 1] : key ? byShipper.get(key) : undefined

      if (!target) {
        contacts.push(c)
        if (key) byShipper.set(key, c)
        continue
      }
      target.contact_person = appendDistinct(target.contact_person, c.contact_person)
      target.contact_number = appendDistinct(target.contact_number, c.contact_number)
      target.email          = appendDistinct(target.email, c.email)
      for (const f of ["consignee_name", "mode", "pol", "pod"] as const) {
        if (!target[f]) target[f] = c[f]
      }
    }

    if (!contacts.length) {
      return NextResponse.json(
        {
          error:
            "No usable rows found. Make sure your Excel columns include headers like: " +
            "Shipper Name, Consignee Name, SEA/AIR, POL, POD, Contact, Email ID",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ contacts, total: contacts.length })
  } catch (err) {
    console.error("[contacts/parse]", err)
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 })
  }
}
