// Shared Sales Lead PDF generator — used by both the edit form and the list view.

import { drawCompanyLogo } from "@/lib/pdf-logo"

export interface SalesLeadPdfData {
  ref_code?:             string | null
  date_sent?:            string | null
  sent_by?:              string | null
  status?:               string | null
  agent_name?:           string | null
  agent_email?:          string | null
  shipper?:              string | null
  shipper_website?:      string | null
  shipper_address?:      string | null
  city?:                 string | null
  consignee?:            string | null
  consignee_address?:    string | null
  consignee_website?:    string | null
  dest_country?:         string | null
  mode_of_transport?:    string | null
  origin_port?:          string | null
  dest_port?:            string | null
  commodity?:            string | null
  hs_code?:              string | null
  special_requirements?: string | null
  rate_fcl?:             string | null
  rate_lcl?:             string | null
  rate_validity?:        string | null
  remarks?:              string | null
  remarks_2?:            string | null
  notes?:                string | null
}

type WithAutoTable = { lastAutoTable: { finalY: number } }

export async function generateSalesLeadPdf(
  lead: SalesLeadPdfData,
  company?: string | null,
): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 14

  const drawnLogoW = await drawCompanyLogo(doc, company, margin, y)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("SALES LEAD", margin + drawnLogoW + 6, y + 8)
  if (lead.ref_code) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    doc.text(`Ref: ${lead.ref_code}`, pageW - margin, y, { align: "right" })
    doc.text(`Date: ${lead.date_sent || ""}`, pageW - margin, y + 5, { align: "right" })
    doc.setTextColor(0)
  }
  y += 22

  const basicRows: [string, string][] = [
    ["Sent By", lead.sent_by || "—"],
    ["Date Sent", lead.date_sent || "—"],
    ["Status", lead.status || "—"],
    ["Agent Name", lead.agent_name || "—"],
    ["Agent Email", lead.agent_email || "—"],
  ].filter((r): r is [string, string] => Boolean(r[1] && r[1] !== "—"))

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: basicRows,
    theme: "grid",
    headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
    margin: { left: margin, right: margin },
  })
  y = (doc as unknown as WithAutoTable).lastAutoTable.finalY + 6

  const shipperRows: [string, string][] = [
    ["Shipper", lead.shipper || "—"],
    ["Shipper Website", lead.shipper_website || ""],
    ["Shipper Address", lead.shipper_address || ""],
    ["City", lead.city || ""],
  ].filter((r): r is [string, string] => Boolean(r[1]))

  if (shipperRows.length) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Shipper", margin, y)
    y += 2
    autoTable(doc, {
      startY: y,
      body: shipperRows,
      theme: "grid",
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    })
    y = (doc as unknown as WithAutoTable).lastAutoTable.finalY + 6
  }

  const consigneeRows: [string, string][] = [
    ["Consignee", lead.consignee || ""],
    ["Consignee Address", lead.consignee_address || ""],
    ["Consignee Website", lead.consignee_website || ""],
    ["Destination Country", lead.dest_country || ""],
  ].filter((r): r is [string, string] => Boolean(r[1]))

  if (consigneeRows.length) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Consignee", margin, y)
    y += 2
    autoTable(doc, {
      startY: y,
      body: consigneeRows,
      theme: "grid",
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    })
    y = (doc as unknown as WithAutoTable).lastAutoTable.finalY + 6
  }

  const shipmentRows: [string, string][] = [
    ["Mode of Transport", lead.mode_of_transport || ""],
    ["Origin Port / Airport", lead.origin_port || ""],
    ["Destination Port / Airport", lead.dest_port || ""],
    ["Commodity", lead.commodity || ""],
    ["HS Code", lead.hs_code || ""],
    ["Special Requirements", lead.special_requirements || ""],
  ].filter((r): r is [string, string] => Boolean(r[1]))

  if (shipmentRows.length) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Shipment Details", margin, y)
    y += 2
    autoTable(doc, {
      startY: y,
      body: shipmentRows,
      theme: "grid",
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    })
    y = (doc as unknown as WithAutoTable).lastAutoTable.finalY + 6
  }

  const rateRows: [string, string][] = [
    ["FCL Rate", lead.rate_fcl || ""],
    ["LCL Rate", lead.rate_lcl || ""],
    ["Validity", lead.rate_validity || ""],
  ].filter((r): r is [string, string] => Boolean(r[1]))

  if (rateRows.length) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Rate", margin, y)
    y += 2
    autoTable(doc, {
      startY: y,
      body: rateRows,
      theme: "grid",
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    })
    y = (doc as unknown as WithAutoTable).lastAutoTable.finalY + 6
  }

  const remarksRows: [string, string][] = [
    ["Remarks", lead.remarks || ""],
    ["Remarks 2", lead.remarks_2 || ""],
    ["Notes", lead.notes || ""],
  ].filter((r): r is [string, string] => Boolean(r[1]))

  if (remarksRows.length) {
    autoTable(doc, {
      startY: y,
      body: remarksRows,
      theme: "grid",
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    })
    y = (doc as unknown as WithAutoTable).lastAutoTable.finalY + 6
  }

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(80)
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.line(margin, footerY - 2, pageW - margin, footerY - 2)
  const companyLine = company === "links"
    ? "Links Cargo"
    : "MP Cargo · www.manilal.com"
  doc.text(`${lead.sent_by || "Sales"} · ${companyLine}`, margin, footerY + 2)
  doc.setTextColor(0)

  const filename = `SalesLead_${lead.ref_code ?? "Draft"}_${lead.date_sent || "today"}.pdf`
  doc.save(filename)
}
