import ExcelJS from "exceljs"
import { SALESPERSON_CODE_MAP, expandPortCity } from "@/lib/constants/dropdowns"

// Weekly Sales Report — Excel workbook in the management-approved layout:
// How to Use | Enquiries (source of truth) | Team Summary (formula-driven,
// every status incl. Pending has a column) | Follow-up Priorities | Prospecting.

export interface EnqRow {
  enq_ref_no: string | null
  enq_receipt_date: string | null
  mode: string | null
  exim: string | null
  sales_person: string | null
  shipper: string | null
  pol: string | null
  pod: string | null
  status: string | null
  remarks: string | null
  lost_reason: string | null
  contact_person: string | null
  quot_ref_no: string | null
  quot_status: string | null
  quoted_rate: number | null
  quot_currency: string | null
}

export interface ProspectRow {
  calls: number
  visits: number
  reached: number
  leadsSent: number
  followUps: number
  enquiries: number
}

// Order matches the approved template. DB stores LOSE; report shows Lost.
const STATUS_LABELS: Record<string, string> = {
  QUOTED: "Quoted",
  PENDING: "Pending",
  WIN: "Win",
  LOSE: "Lost",
  LOST: "Lost",
  "FOLLOW UP": "Follow Up",
  "NO FEEDBACK": "No Feedback",
}
const STANDARD_STATUSES = ["Quoted", "Pending", "Win", "Lost", "Follow Up", "No Feedback"]

// An open enquiry untouched this long is auto-flagged for follow-up
const STALE_DAYS = 3

const NAVY = "FF1E3A5F"
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
const SUBTLE_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
const THIN: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFE2E8F0" } }
const BORDER: Partial<ExcelJS.Borders> = { top: THIN, bottom: THIN, left: THIN, right: THIN }

function titleCase(v: string | null | undefined): string {
  if (!v) return ""
  return v
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-/(.])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

function statusLabel(s: string | null): string {
  const key = (s ?? "").trim().toUpperCase()
  if (!key) return "Pending"
  return STATUS_LABELS[key] ?? titleCase(key)
}

export function personName(raw: string | null): string {
  const v = (raw ?? "").trim()
  return titleCase(SALESPERSON_CODE_MAP[v] ?? v) || "Unknown"
}

function toDate(v: string | null): Date | null {
  if (!v) return null
  const d = new Date(`${v.slice(0, 10)}T00:00:00Z`)
  return isNaN(d.getTime()) ? null : d
}

function fmtPeriod(from: string, to: string): string {
  const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
  return `${toDate(from)!.toLocaleDateString("en-GB", opt)} – ${toDate(to)!.toLocaleDateString("en-GB", opt)}`
}

function colLetter(n: number): string {
  return String.fromCharCode(64 + n)
}

function styleTitle(ws: ExcelJS.Worksheet, range: string, text: string) {
  ws.mergeCells(range)
  const c = ws.getCell(range.split(":")[0])
  c.value = text
  c.font = { bold: true, size: 14, color: { argb: NAVY } }
}

function styleHeaderRow(row: ExcelJS.Row, from: number, to: number) {
  for (let i = from; i <= to; i++) {
    const c = row.getCell(i)
    c.fill = HEADER_FILL
    c.font = { bold: true, color: { argb: "FFFFFFFF" } }
    c.alignment = { vertical: "middle", wrapText: true }
    c.border = BORDER
  }
}

export function buildWorkbook(
  rows: EnqRow[],
  prospecting: Map<string, ProspectRow>,
  dateFrom: string,
  dateTo: string,
  company: string
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Sales Bridge"
  wb.created = new Date()
  const co = company.toUpperCase()
  const period = fmtPeriod(dateFrom, dateTo)
  const asOf = toDate(dateTo)!

  const FIRST = 4
  const lastData = FIRST + rows.length - 1
  // Formula/validation ranges leave room for manually added rows
  const rangeEnd = Math.max(lastData + 15, 43)

  const persons = Array.from(new Set(rows.map((r) => personName(r.sales_person))))
    .map((name) => ({ name, n: rows.filter((r) => personName(r.sales_person) === name).length }))
    .sort((a, b) => b.n - a.n)
    .map((p) => p.name)
  const extraStatuses = Array.from(new Set(rows.map((r) => statusLabel(r.status)))).filter(
    (s) => !STANDARD_STATUSES.includes(s)
  )
  const statuses = [...STANDARD_STATUSES, ...extraStatuses]

  // ── How to Use ────────────────────────────────────────────────
  const help = wb.addWorksheet("How to Use")
  help.columns = [{ width: 30 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }]
  styleTitle(help, "A1:F1", "Weekly Sales Report — How to Use This Workbook")
  const helpRows: [number, string, string, boolean?][] = [
    [4, "Tabs", "", true],
    [5, "Enquiries", "One row per enquiry, pulled from Sales Bridge — the single source of truth. Manual additions go at the bottom with Source = Manual."],
    [6, "Team Summary", "Formula-driven counts per salesperson and status (including Pending) — always reconciles to Total automatically."],
    [7, "Follow-up Priorities", "Rows marked Priority Follow-up = Yes on the Enquiries tab at the time the report was generated."],
    [8, "Prospecting", "Weekly outreach numbers from Sales Bridge Calls & Visits and Sales Leads — calls, prospects reached, leads sent, enquiries logged."],
    [10, "Where the data comes from", "", true],
    [11, "Quoted Rate", "Headline rate of the latest quotation linked to the enquiry in Sales Bridge. Blank = no linked quotation or no rate entered on it."],
    [12, "Contact", "Contact person of the contact linked to the enquiry in Sales Bridge."],
    [13, "Next Step / Follow-up Note", "The enquiry Remarks field. Keep it current in Sales Bridge rather than editing here."],
    [14, "Lost Reason", "The Lost Reason entered on the enquiry in Sales Bridge — mandatory there whenever status is Lost."],
    [15, "Priority Follow-up", `Auto-set to Yes for Follow Up / No Feedback, and for Pending / Quoted enquiries open more than ${STALE_DAYS} days. Override with the dropdown.`],
    [16, "Days Open", "Calculated from the report as-of date on Team Summary."],
  ]
  for (const [r, a, b, heading] of helpRows) {
    help.getCell(`A${r}`).value = a
    help.getCell(`A${r}`).font = { bold: true, color: heading ? { argb: NAVY } : undefined }
    if (!heading) {
      help.mergeCells(`B${r}:F${r}`)
      help.getCell(`B${r}`).value = b
      help.getCell(`B${r}`).alignment = { wrapText: true, vertical: "top" }
      help.getRow(r).height = 32
    }
  }

  // ── Enquiries ─────────────────────────────────────────────────
  const enq = wb.addWorksheet("Enquiries", { views: [{ state: "frozen", ySplit: 3 }] })
  const enqHeaders = [
    "Ref No", "Date", "Source", "Salesperson", "Mode", "EXIM", "Shipper", "POL", "POD",
    "Additional Destinations", "Status", "Quoted Rate", "Contact", "Next Step / Follow-up Note",
    "Lost Reason", "Priority Follow-up", "Days Open",
  ]
  const enqWidths = [13, 11, 20, 14, 7, 9, 32, 16, 18, 22, 12, 16, 18, 46, 26, 13, 10]
  enq.columns = enqWidths.map((width) => ({ width }))
  styleTitle(enq, "A1:Q1", `Weekly Sales Report — ${co}  |  Enquiries  |  Period: ${period}`)
  enq.getRow(3).values = enqHeaders
  enq.getRow(3).height = 30
  styleHeaderRow(enq.getRow(3), 1, enqHeaders.length)

  const flagged: number[] = []
  rows.forEach((r, i) => {
    const n = FIRST + i
    const status = statusLabel(r.status)
    const date = toDate(r.enq_receipt_date)
    const daysOpen = date ? Math.round((asOf.getTime() - date.getTime()) / 86400000) : 0
    const priority =
      status === "Follow Up" || status === "No Feedback" ||
      ((status === "Pending" || status === "Quoted") && daysOpen > STALE_DAYS)
    if (priority) flagged.push(n)

    const note =
      (r.remarks ?? "").trim() ||
      (r.quot_ref_no ? `Quotation ${r.quot_ref_no} (${titleCase((r.quot_status ?? "DRAFT").replace(/_/g, " "))})` : "")

    const row = enq.getRow(n)
    row.values = [
      r.enq_ref_no ?? "",
      date,
      "System",
      personName(r.sales_person),
      titleCase(r.mode),
      titleCase(r.exim),
      titleCase(r.shipper) || "— (not captured)",
      titleCase(expandPortCity(r.pol)) || "— (not captured)",
      titleCase(expandPortCity(r.pod)) || "— (not captured)",
      null,
      status,
      r.quoted_rate && r.quoted_rate > 0 ? Number(r.quoted_rate) : null,
      (r.contact_person ?? "").trim() || null,
      note || null,
      status === "Lost" ? (r.lost_reason ?? "").trim() || null : null,
      priority ? "Yes" : "No",
      { formula: `IF(B${n}="","",'Team Summary'!$B$2-B${n})`, result: daysOpen },
    ]
    row.getCell(2).numFmt = "dd-mmm-yy"
    row.getCell(12).numFmt = `"${(r.quot_currency ?? "USD").replace(/"/g, "")}" #,##0.00`
    row.getCell(14).alignment = { wrapText: true, vertical: "top" }
    row.getCell(15).alignment = { wrapText: true, vertical: "top" }
    for (let c = 1; c <= enqHeaders.length; c++) row.getCell(c).border = BORDER
  })

  for (let n = FIRST; n <= rangeEnd; n++) {
    enq.getCell(`K${n}`).dataValidation = {
      type: "list", allowBlank: true, formulae: [`"${statuses.join(",")}"`],
      showErrorMessage: true, errorTitle: "Status", error: "Pick a status from the list.",
    }
    enq.getCell(`C${n}`).dataValidation = {
      type: "list", allowBlank: true, formulae: ['"System,Manual (not in Sales Bridge)"'],
    }
    enq.getCell(`P${n}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"Yes,No"'] }
  }

  // ── Team Summary ──────────────────────────────────────────────
  const sum = wb.addWorksheet("Team Summary")
  sum.columns = [{ width: 18 }, { width: 14 }, ...statuses.map(() => ({ width: 13 }))]
  const lastCol = colLetter(2 + statuses.length)
  styleTitle(sum, `A1:${lastCol}1`, `Weekly Sales Report — ${co} — Team Summary`)
  sum.getCell("A2").value = "Report as-of date:"
  sum.getCell("B2").value = asOf
  sum.getCell("B2").numFmt = "dd-mmm-yy"
  sum.getCell("A3").value = "Period covered:"
  sum.getCell("B3").value = period
  sum.getCell("A2").font = sum.getCell("A3").font = { bold: true }

  sum.getCell("A6").value = "Salesperson-by-Status Breakdown"
  sum.getCell("A6").font = { bold: true, size: 12 }
  sum.getRow(7).values = ["Salesperson", "Total", ...statuses]
  styleHeaderRow(sum.getRow(7), 1, 2 + statuses.length)

  const spRange = `Enquiries!$D$${FIRST}:$D$${rangeEnd}`
  const stRange = `Enquiries!$K$${FIRST}:$K$${rangeEnd}`
  const modeRange = `Enquiries!$E$${FIRST}:$E$${rangeEnd}`
  const count = (pred: (r: EnqRow) => boolean) => rows.filter(pred).length

  const pFirst = 8
  persons.forEach((name, i) => {
    const n = pFirst + i
    const row = sum.getRow(n)
    row.getCell(1).value = name
    row.getCell(2).value = {
      formula: `COUNTIF(${spRange},A${n})`,
      result: count((r) => personName(r.sales_person) === name),
    }
    statuses.forEach((s, j) => {
      const col = colLetter(3 + j)
      row.getCell(3 + j).value = {
        formula: `COUNTIFS(${spRange},$A${n},${stRange},${col}$7)`,
        result: count((r) => personName(r.sales_person) === name && statusLabel(r.status) === s),
      }
    })
    for (let c = 1; c <= 2 + statuses.length; c++) {
      row.getCell(c).border = BORDER
      if (c > 1) row.getCell(c).alignment = { horizontal: "center" }
    }
    row.getCell(2).font = { bold: true }
  })

  const totalRow = pFirst + persons.length
  const pLast = totalRow - 1
  const tr = sum.getRow(totalRow)
  tr.getCell(1).value = "TEAM TOTAL"
  for (let c = 2; c <= 2 + statuses.length; c++) {
    const col = colLetter(c)
    tr.getCell(c).value = {
      formula: `SUM(${col}${pFirst}:${col}${pLast})`,
      result: c === 2 ? rows.length : count((r) => statusLabel(r.status) === statuses[c - 3]),
    }
    tr.getCell(c).alignment = { horizontal: "center" }
  }
  for (let c = 1; c <= 2 + statuses.length; c++) {
    tr.getCell(c).font = { bold: true }
    tr.getCell(c).fill = SUBTLE_FILL
    tr.getCell(c).border = BORDER
  }

  const noteRow = totalRow + 2
  sum.mergeCells(`A${noteRow}:${lastCol}${noteRow}`)
  sum.getCell(`A${noteRow}`).value =
    "Every status has its own column, including Pending — Total always equals the sum of the status columns, checked by formula, not by eye."
  sum.getCell(`A${noteRow}`).font = { italic: true, color: { argb: "FF64748B" } }
  sum.getCell(`A${noteRow}`).alignment = { wrapText: true }
  sum.getRow(noteRow).height = 30

  const bRow = noteRow + 3
  sum.getCell(`A${bRow}`).value = "Enquiries by Mode"
  sum.getCell(`D${bRow}`).value = "Enquiries by Status (Team)"
  sum.getCell(`A${bRow}`).font = sum.getCell(`D${bRow}`).font = { bold: true, size: 12 }
  sum.getRow(bRow + 1).getCell(1).value = "Mode"
  sum.getRow(bRow + 1).getCell(2).value = "Count"
  sum.getRow(bRow + 1).getCell(4).value = "Status"
  sum.getRow(bRow + 1).getCell(5).value = "Count"
  styleHeaderRow(sum.getRow(bRow + 1), 1, 2)
  styleHeaderRow(sum.getRow(bRow + 1), 4, 5)

  const modes = Array.from(new Set(rows.map((r) => titleCase(r.mode)).filter(Boolean)))
  modes.forEach((m, i) => {
    const n = bRow + 2 + i
    sum.getCell(`A${n}`).value = m
    sum.getCell(`B${n}`).value = { formula: `COUNTIF(${modeRange},A${n})`, result: count((r) => titleCase(r.mode) === m) }
    sum.getCell(`A${n}`).border = sum.getCell(`B${n}`).border = BORDER
  })
  statuses.forEach((s, i) => {
    const n = bRow + 2 + i
    sum.getCell(`D${n}`).value = s
    sum.getCell(`E${n}`).value = { formula: `COUNTIF(${stRange},D${n})`, result: count((r) => statusLabel(r.status) === s) }
    sum.getCell(`D${n}`).border = sum.getCell(`E${n}`).border = BORDER
  })

  // ── Follow-up Priorities ──────────────────────────────────────
  const fu = wb.addWorksheet("Follow-up Priorities", { views: [{ state: "frozen", ySplit: 4 }] })
  fu.columns = [12, 14, 28, 16, 18, 12, 10, 20, 48].map((width) => ({ width }))
  styleTitle(fu, "A1:I1", "Weekly Sales Report — Follow-up Priorities This Week")
  fu.mergeCells("A2:I2")
  fu.getCell("A2").value =
    "Enquiries stalled, awaiting a customer/internal response, or flagged as a priority — pulled live from the Enquiries tab."
  fu.getCell("A2").font = { italic: true, color: { argb: "FF64748B" } }
  fu.getRow(4).values = ["Ref No", "Salesperson", "Shipper", "POL", "POD", "Status", "Days Open", "Contact", "Next Step / Blocker"]
  styleHeaderRow(fu.getRow(4), 1, 9)

  const srcCols = ["A", "D", "G", "H", "I", "K", "Q", "M", "N"]
  flagged.forEach((src, i) => {
    const row = fu.getRow(5 + i)
    const srcRow = enq.getRow(src)
    srcCols.forEach((col, j) => {
      const cell = srcRow.getCell(col)
      const v = cell.value
      const cached =
        v && typeof v === "object" && "result" in v ? (v as ExcelJS.CellFormulaValue).result : (v as ExcelJS.CellValue)
      row.getCell(j + 1).value = {
        formula: `IF(Enquiries!${col}${src}="","—",Enquiries!${col}${src})`,
        result: (cached === null || cached === undefined || cached === "" ? "—" : cached) as string | number,
      }
      row.getCell(j + 1).border = BORDER
    })
    row.getCell(9).alignment = { wrapText: true, vertical: "top" }
  })
  if (flagged.length === 0) fu.getCell("A5").value = "No priority follow-ups this week."

  // ── Prospecting ───────────────────────────────────────────────
  const pr = wb.addWorksheet("Prospecting")
  pr.columns = [12, 16, 12, 12, 16, 16, 18, 16, 40].map((width) => ({ width }))
  styleTitle(pr, "A1:I1", "Prospecting & Outreach — Weekly Tracker")
  pr.mergeCells("A2:I2")
  pr.getCell("A2").value =
    "Outbound calling and prospecting logged in Sales Bridge (Calls & Visits, Sales Leads) for the report period."
  pr.getCell("A2").font = { italic: true, color: { argb: "FF64748B" } }
  pr.getRow(4).values = [
    "Week Of", "Salesperson", "Calls Made", "Visits", "Prospects Reached",
    "Lead Emails Sent", "Follow-up Emails Sent", "Enquiries Logged", "Notes",
  ]
  pr.getRow(4).height = 30
  styleHeaderRow(pr.getRow(4), 1, 9)

  const names = Array.from(prospecting.keys()).sort()
  names.forEach((name, i) => {
    const p = prospecting.get(name)!
    const row = pr.getRow(5 + i)
    row.values = [toDate(dateFrom), name, p.calls, p.visits, p.reached, p.leadsSent, p.followUps, p.enquiries, null]
    row.getCell(1).numFmt = "dd-mmm-yy"
    for (let c = 1; c <= 9; c++) row.getCell(c).border = BORDER
  })
  if (names.length > 0) {
    const n = 5 + names.length
    const row = pr.getRow(n)
    row.getCell(2).value = "TEAM TOTAL"
    for (let c = 3; c <= 8; c++) {
      const col = colLetter(c)
      const key = (["calls", "visits", "reached", "leadsSent", "followUps", "enquiries"] as const)[c - 3]
      row.getCell(c).value = {
        formula: `SUM(${col}5:${col}${n - 1})`,
        result: names.reduce((s, k) => s + prospecting.get(k)![key], 0),
      }
    }
    for (let c = 1; c <= 9; c++) {
      row.getCell(c).font = { bold: true }
      row.getCell(c).fill = SUBTLE_FILL
      row.getCell(c).border = BORDER
    }
  } else {
    pr.getCell("A5").value = "No calls, visits or leads logged in Sales Bridge for this period."
  }

  return wb
}
