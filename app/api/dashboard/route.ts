import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

/**
 * GET /api/dashboard?type=<type>&mode=&branch=&enq_type=&period=
 *
 * type: stats | monthly | salesperson | type | exim | slacking | leaderboard
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sp        = req.nextUrl.searchParams
  const type      = sp.get("type") ?? "stats"
  const mode      = sp.get("mode") ?? ""
  const branch    = sp.get("branch") ?? ""
  const enqType   = sp.get("enq_type") ?? ""
  const period    = sp.get("period") ?? "allTime"
  const threshold = parseInt(sp.get("threshold") ?? "3")

  const range = periodToRange(period)

  try {
    const pool = await getPool(auth.company)
    const r = pool.request()

    // Common filter inputs — ENQRECPTDT is varchar(10) stored as 'YYYY-MM-DD'
    r.input("mode",      sql.VarChar(10), mode || null)
    r.input("branch",    sql.VarChar(10), branch || null)
    r.input("enq_type",  sql.VarChar(10), enqType || null)
    r.input("from_date", sql.VarChar(10), range ? range.from : null)
    r.input("to_date",   sql.VarChar(10), range ? range.to : null)

    // ENQRECPTDT is varchar so we compare strings directly (YYYY-MM-DD sorts lexicographically)
    const where = `
      WHERE (@mode      IS NULL OR MODE    = @mode)
        AND (@branch    IS NULL OR BRANCH  = @branch)
        AND (@enq_type  IS NULL OR ENQTYPE = @enq_type)
        AND (@from_date IS NULL OR ENQRECPTDT >= @from_date)
        AND (@to_date   IS NULL OR ENQRECPTDT <= @to_date)
    `

    let rows: unknown[]

    switch (type) {
      case "stats": {
        const res = await r.query<{ status: string | null }>(
          `SELECT STATUS AS status FROM [dbo].[TBL_ADMIN_SALESENQUIRY] ${where}`
        )
        rows = res.recordset
        break
      }

      case "monthly": {
        const res = await r.query<{ enq_receipt_date: string | null; mode: string | null }>(
          `SELECT ENQRECPTDT AS enq_receipt_date, MODE AS mode
           FROM [dbo].[TBL_ADMIN_SALESENQUIRY] ${where}
           ORDER BY ENQRECPTDT ASC`
        )
        rows = res.recordset
        break
      }

      case "salesperson": {
        const res = await r.query<{ sales_person: string | null; status: string | null }>(
          `SELECT SALESPERSON AS sales_person, STATUS AS status
           FROM [dbo].[TBL_ADMIN_SALESENQUIRY] ${where}`
        )
        rows = res.recordset
        break
      }

      case "type": {
        const res = await r.query<{ enq_receipt_date: string | null; enq_type: string | null }>(
          `SELECT ENQRECPTDT AS enq_receipt_date, ENQTYPE AS enq_type
           FROM [dbo].[TBL_ADMIN_SALESENQUIRY] ${where}
           ORDER BY ENQRECPTDT ASC`
        )
        rows = res.recordset
        break
      }

      case "exim": {
        const res = await r.query<{ enq_receipt_date: string | null; exim: string | null }>(
          `SELECT ENQRECPTDT AS enq_receipt_date, EXIM AS exim
           FROM [dbo].[TBL_ADMIN_SALESENQUIRY] ${where}
           ORDER BY ENQRECPTDT ASC`
        )
        rows = res.recordset
        break
      }

      case "leaderboard": {
        const res = await r.query<{ sales_person: string | null; status: string | null }>(
          `SELECT SALESPERSON AS sales_person, STATUS AS status
           FROM [dbo].[TBL_ADMIN_SALESENQUIRY] ${where}`
        )
        rows = res.recordset
        break
      }

      case "slacking": {
        r.input("threshold", sql.Int, threshold)
        const res = await r.query<SlackingRow>(`
          SELECT
            CAST(PK_ID AS varchar(20)) AS id,
            ENQREFNO       AS enq_ref_no,
            ASSIGNED_USER  AS assigned_user,
            CONVERT(varchar(10), ASSIGNED_DATE, 120) AS assigned_date,
            STATUS         AS status,
            BRANCH         AS branch,
            POL            AS pol,
            POD            AS pod,
            SALESPERSON    AS sales_person
          FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
          WHERE ASSIGNED_USER IS NOT NULL
            AND ASSIGNED_DATE IS NOT NULL
          ORDER BY ASSIGNED_DATE ASC
        `)
        rows = res.recordset
        break
      }

      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 })
    }

    return NextResponse.json(rows)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── Date range helper ────────────────────────────────────────

interface DateRange { from: string; to: string }

function periodToRange(period: string): DateRange | null {
  if (!period || period === "allTime") return null
  const now = new Date()
  let from: Date, to: Date

  if (period === "thisMonth") {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
    to = now
  } else if (period === "lastMonth") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    to = new Date(now.getFullYear(), now.getMonth(), 0)
  } else if (period === "last3Months") {
    from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    to = now
  } else if (period === "last6Months") {
    from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    to = now
  } else if (period === "thisYear") {
    from = new Date(now.getFullYear(), 0, 1)
    to = now
  } else {
    return null
  }

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  }
}

interface SlackingRow {
  id: string
  enq_ref_no: string | null
  assigned_user: string | null
  assigned_date: string | null
  status: string | null
  branch: string | null
  pol: string | null
  pod: string | null
  sales_person: string | null
}
