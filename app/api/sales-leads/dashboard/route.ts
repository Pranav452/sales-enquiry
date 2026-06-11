import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"

/**
 * GET /api/sales-leads/dashboard?type=stats|monthly|person|status|country
 * Admin-only — team-wide lead analytics.
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const type = req.nextUrl.searchParams.get("type") ?? "stats"

  try {
    const pool = await getPool(auth.company)

    // ── stats ────────────────────────────────────────────────
    if (type === "stats") {
      const r = await pool.request().query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN STATUS = 'LEAD_SENT'         THEN 1 ELSE 0 END) AS lead_sent,
          SUM(CASE WHEN STATUS = 'RESPONSE_RECEIVED' THEN 1 ELSE 0 END) AS response_received,
          SUM(CASE WHEN STATUS = 'FOLLOW_UP_SENT'    THEN 1 ELSE 0 END) AS follow_up_sent,
          SUM(CASE WHEN STATUS = 'MEETING_SCHEDULED' THEN 1 ELSE 0 END) AS meeting_scheduled,
          SUM(CASE WHEN STATUS = 'QUOTED'            THEN 1 ELSE 0 END) AS quoted,
          SUM(CASE WHEN STATUS = 'WON'               THEN 1 ELSE 0 END) AS won,
          SUM(CASE WHEN DATE_SENT >= CONVERT(varchar(7), GETDATE(), 120) + '-01' THEN 1 ELSE 0 END) AS this_month,
          COUNT(DISTINCT SHIPPER) AS unique_shippers
        FROM [dbo].[TBL_SALES_LEADS]
      `)
      return NextResponse.json(r.recordset[0] ?? {})
    }

    // ── monthly volume ───────────────────────────────────────
    if (type === "monthly") {
      const r = await pool.request().query(`
        SELECT
          SUBSTRING(DATE_SENT, 1, 7) AS month,
          COUNT(*) AS total
        FROM [dbo].[TBL_SALES_LEADS]
        WHERE DATE_SENT IS NOT NULL AND DATE_SENT != ''
        GROUP BY SUBSTRING(DATE_SENT, 1, 7)
        ORDER BY month ASC
      `)
      return NextResponse.json(r.recordset)
    }

    // ── per-person breakdown ─────────────────────────────────
    if (type === "person") {
      const r = await pool.request().query(`
        SELECT
          SENT_BY AS sent_by,
          COUNT(*) AS total,
          SUM(CASE WHEN STATUS = 'RESPONSE_RECEIVED' THEN 1 ELSE 0 END) AS responses,
          SUM(CASE WHEN STATUS = 'MEETING_SCHEDULED' THEN 1 ELSE 0 END) AS meetings,
          SUM(CASE WHEN STATUS = 'QUOTED'            THEN 1 ELSE 0 END) AS quoted,
          SUM(CASE WHEN STATUS = 'WON'               THEN 1 ELSE 0 END) AS won,
          MAX(DATE_SENT) AS last_lead_date
        FROM [dbo].[TBL_SALES_LEADS]
        WHERE SENT_BY IS NOT NULL AND SENT_BY != ''
        GROUP BY SENT_BY
        ORDER BY total DESC
      `)
      return NextResponse.json(r.recordset)
    }

    // ── status breakdown ─────────────────────────────────────
    if (type === "status") {
      const r = await pool.request().query(`
        SELECT ISNULL(NULLIF(STATUS, ''), 'NONE') AS status, COUNT(*) AS count
        FROM [dbo].[TBL_SALES_LEADS]
        GROUP BY ISNULL(NULLIF(STATUS, ''), 'NONE')
        ORDER BY count DESC
      `)
      return NextResponse.json(r.recordset)
    }

    // ── top destination countries ────────────────────────────
    if (type === "country") {
      const r = await pool.request().query(`
        SELECT TOP 12
          DEST_COUNTRY AS country,
          COUNT(*) AS total
        FROM [dbo].[TBL_SALES_LEADS]
        WHERE DEST_COUNTRY IS NOT NULL AND DEST_COUNTRY != ''
        GROUP BY DEST_COUNTRY
        ORDER BY total DESC
      `)
      return NextResponse.json(r.recordset)
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
