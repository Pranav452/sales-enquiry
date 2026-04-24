import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { getAuthContext } from "@/lib/api-auth"

// Flexible header matching — handles varied Excel column naming
const HEADER_ALIASES: Record<string, string> = {
  // shipper
  shipper: "shipper_name",
  "shipper name": "shipper_name",
  shipper_name: "shipper_name",
  exporter: "shipper_name",
  "shipper/exporter": "shipper_name",

  // consignee
  consignee: "consignee_name",
  "consignee name": "consignee_name",
  consignee_name: "consignee_name",
  importer: "consignee_name",
  "consignee/importer": "consignee_name",

  // mode
  mode: "mode",
  "shipping mode": "mode",
  "transport mode": "mode",
  "mode of shipment": "mode",

  // pol
  pol: "pol",
  "port of loading": "pol",
  "origin port": "pol",
  "port of origin": "pol",
  "loading port": "pol",

  // pod
  pod: "pod",
  "port of discharge": "pod",
  "destination port": "pod",
  "port of destination": "pod",
  "discharge port": "pod",

  // contact person
  contact: "contact_person",
  "contact person": "contact_person",
  contact_person: "contact_person",
  person: "contact_person",
  "contact name": "contact_person",

  // contact number
  "contact number": "contact_number",
  contact_number: "contact_number",
  phone: "contact_number",
  mobile: "contact_number",
  number: "contact_number",
  tel: "contact_number",
  telephone: "contact_number",
  "phone number": "contact_number",
  "mobile number": "contact_number",

  // email
  email: "email",
  "email address": "email",
  "e-mail": "email",
  "e mail": "email",
  mail: "email",
}

type ContactRow = {
  shipper_name: string
  consignee_name: string
  mode: string
  pol: string
  pod: string
  contact_person: string
  contact_number: string
  email: string
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const raw: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" })

    if (!raw.length) {
      return NextResponse.json({ error: "Spreadsheet is empty" }, { status: 400 })
    }

    // Map raw headers to canonical field names
    const contacts: ContactRow[] = raw.map((row) => {
      const mapped: Partial<ContactRow> = {}
      for (const [rawKey, rawVal] of Object.entries(row)) {
        const canonical = HEADER_ALIASES[rawKey.trim().toLowerCase()]
        if (canonical) {
          mapped[canonical as keyof ContactRow] = String(rawVal ?? "").trim()
        }
      }
      return {
        shipper_name:   mapped.shipper_name   ?? "",
        consignee_name: mapped.consignee_name ?? "",
        mode:           mapped.mode           ?? "",
        pol:            mapped.pol            ?? "",
        pod:            mapped.pod            ?? "",
        contact_person: mapped.contact_person ?? "",
        contact_number: mapped.contact_number ?? "",
        email:          mapped.email          ?? "",
      }
    }).filter((c) =>
      // drop completely blank rows
      c.shipper_name || c.consignee_name || c.contact_person || c.email
    )

    if (!contacts.length) {
      return NextResponse.json(
        { error: "No usable rows found. Check your column headers match the expected names." },
        { status: 400 }
      )
    }

    return NextResponse.json({ contacts, total: contacts.length })
  } catch (err) {
    console.error("[contacts/parse]", err)
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 })
  }
}
