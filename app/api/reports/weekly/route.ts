import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { enquiryVisibilityCondition } from "@/lib/mssql/enquiry-access"
import { lostReasonSelect } from "@/lib/mssql/lost-reason"
import { buildWorkbook, personName, type EnqRow, type ProspectRow } from "@/lib/reports/weekly-workbook"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Default window: the past 7 days. Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD.
  const qFrom = req.nextUrl.searchParams.get("from")
  const qTo = req.nextUrl.searchParams.get("to")
  const now = new Date()
  const dateTo = qTo && ISO_DATE.test(qTo) ? qTo : now.toISOString().split("T")[0]
  const fromDefault = new Date(`${dateTo}T00:00:00Z`)
  fromDefault.setUTCDate(fromDefault.getUTCDate() - 7)
  const dateFrom = qFrom && ISO_DATE.test(qFrom) ? qFrom : fromDefault.toISOString().split("T")[0]

  try {
    const pool = await getPool(auth.company)
    const request = pool.request()
    request.input("date_from", dateFrom)
    request.input("date_to", dateTo)

    const conditions = ["e.ENQRECPTDT >= @date_from", "e.ENQRECPTDT <= @date_to"]
    const visibility = enquiryVisibilityCondition(request, auth, "e.")
    if (visibility) conditions.push(`(${visibility})`)

    const result = await request.query(`
      SELECT
        e.ENQREFNO        AS enq_ref_no,
        e.ENQRECPTDT      AS enq_receipt_date,
        e.MODE            AS mode,
        e.EXIM            AS exim,
        e.SALESPERSON     AS sales_person,
        e.SHIPPER         AS shipper,
        e.POL             AS pol,
        e.POD             AS pod,
        e.STATUS          AS status,
        e.REMARK          AS remarks,
        ${await lostReasonSelect(pool, "e.")} AS lost_reason,
        c.CONTACT_PERSON  AS contact_person,
        q.QUOT_REF_NO     AS quot_ref_no,
        q.QUOT_STATUS     AS quot_status,
        q.QUOTED_RATE     AS quoted_rate,
        q.DISPLAY_CURRENCY AS quot_currency
      FROM [dbo].[TBL_ADMIN_SALESENQUIRY] e
      LEFT JOIN [dbo].[TBL_CONTACTS] c ON c.ID = e.CONTACT_ID
      OUTER APPLY (
        SELECT TOP 1
          qq.QUOT_REF_NO,
          ISNULL(qq.STATUS, 'DRAFT') AS QUOT_STATUS,
          qq.QUOTED_RATE,
          qq.DISPLAY_CURRENCY
        FROM [dbo].[TBL_QUOTATIONS] qq
        WHERE qq.ENQ_ID = e.PK_ID
        ORDER BY qq.QUOT_ID DESC
      ) q
      WHERE ${conditions.join(" AND ")}
      ORDER BY e.SALESPERSON, e.ENQRECPTDT DESC, e.PK_ID DESC
    `)
    const rows: EnqRow[] = result.recordset

    // Prospecting is supplementary — a missing table must not fail the report
    const prospecting = new Map<string, ProspectRow>()
    const slot = (raw: string | null) => {
      const name = personName(raw)
      if (!prospecting.has(name)) {
        prospecting.set(name, { calls: 0, visits: 0, reached: 0, leadsSent: 0, followUps: 0, enquiries: 0 })
      }
      return prospecting.get(name)!
    }
    const mine = auth.role !== "admin"

    try {
      const r = pool.request()
      r.input("date_from", dateFrom)
      r.input("date_to", dateTo)
      if (mine) r.input("created_by", auth.userId)
      const res = await r.query(`
        SELECT
          SALES_PERSON AS sales_person,
          SUM(CASE WHEN ACTIVITY_TYPE IN ('COLD_CALL','WARM_CALL') THEN 1 ELSE 0 END) AS calls,
          SUM(CASE WHEN ACTIVITY_TYPE IN ('CLIENT_VISIT','VISIT_SECURED') THEN 1 ELSE 0 END) AS visits,
          SUM(CASE WHEN ISNULL(STATUS,'') NOT IN ('NO_ANSWER','INVALID_NUMBER','BUSY','') THEN 1 ELSE 0 END) AS reached
        FROM [dbo].[TBL_CALLS_VISITS]
        WHERE ACTIVITY_DATE >= @date_from AND ACTIVITY_DATE <= @date_to
          ${mine ? "AND CREATED_BY = @created_by" : ""}
        GROUP BY SALES_PERSON
      `)
      for (const a of res.recordset) {
        const p = slot(a.sales_person)
        p.calls += a.calls
        p.visits += a.visits
        p.reached += a.reached
      }
    } catch {}

    try {
      const r = pool.request()
      r.input("date_from", dateFrom)
      r.input("date_to", dateTo)
      if (mine) r.input("created_by", auth.userId)
      const res = await r.query(`
        SELECT
          SENT_BY AS sales_person,
          SUM(CASE WHEN DATE_SENT >= @date_from AND DATE_SENT <= @date_to THEN 1 ELSE 0 END) AS leads_sent,
          SUM(CASE WHEN LAST_FOLLOW_UP >= @date_from AND LAST_FOLLOW_UP <= @date_to THEN 1 ELSE 0 END) AS follow_ups
        FROM [dbo].[TBL_SALES_LEADS]
        WHERE ((DATE_SENT >= @date_from AND DATE_SENT <= @date_to)
            OR (LAST_FOLLOW_UP >= @date_from AND LAST_FOLLOW_UP <= @date_to))
          ${mine ? "AND CREATED_BY = @created_by" : ""}
        GROUP BY SENT_BY
      `)
      for (const l of res.recordset) {
        const p = slot(l.sales_person)
        p.leadsSent += l.leads_sent
        p.followUps += l.follow_ups
      }
    } catch {}

    for (const row of rows) slot(row.sales_person).enquiries += 1

    const wb = buildWorkbook(rows, prospecting, dateFrom, dateTo, auth.company)
    const buffer = await wb.xlsx.writeBuffer()
    const filename = `Weekly Sales Report - ${auth.company.toUpperCase()} - ${dateTo}.xlsx`

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
