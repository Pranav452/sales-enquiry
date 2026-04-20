import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"

/**
 * GET /api/activities/dashboard?type=stats|daily|leaderboard|status|typechart|branch
 * Admin-only for full data; non-admins get their own stats only.
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const type   = req.nextUrl.searchParams.get("type")   ?? "stats"
  const period = req.nextUrl.searchParams.get("period") ?? "30"  // days

  // Leaderboard endpoint — all roles can call it (response is scoped server-side)
  // All other dashboard endpoints — admin only
  if (type !== "leaderboard" && auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const pool = await getPool(auth.company)

    // ── stats ────────────────────────────────────────────────
    if (type === "stats") {
      const r = await pool.request().query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN ACTIVITY_TYPE IN ('COLD_CALL','WARM_CALL') THEN 1 ELSE 0 END)  AS total_calls,
          SUM(CASE WHEN ACTIVITY_TYPE IN ('CLIENT_VISIT','VISIT_SECURED') THEN 1 ELSE 0 END) AS total_visits,
          SUM(CASE WHEN ACTIVITY_TYPE = 'VISIT_SECURED' THEN 1 ELSE 0 END) AS total_secured,
          SUM(CASE WHEN STATUS = 'INTERESTED' THEN 1 ELSE 0 END)           AS total_interested,
          SUM(POINTS) AS total_xp
        FROM [dbo].[TBL_CALLS_VISITS]
      `)
      return NextResponse.json(r.recordset[0] ?? {})
    }

    // ── daily (last N days) ──────────────────────────────────
    if (type === "daily") {
      const days = Math.min(Math.max(parseInt(period), 7), 365)
      const req2 = pool.request()
      req2.input("days", days)
      const r = await req2.query(`
        SELECT
          ACTIVITY_DATE AS date,
          COUNT(*) AS total,
          SUM(CASE WHEN ACTIVITY_TYPE IN ('COLD_CALL','WARM_CALL') THEN 1 ELSE 0 END)  AS calls,
          SUM(CASE WHEN ACTIVITY_TYPE IN ('CLIENT_VISIT','VISIT_SECURED') THEN 1 ELSE 0 END) AS visits,
          SUM(POINTS) AS xp
        FROM [dbo].[TBL_CALLS_VISITS]
        WHERE ACTIVITY_DATE >= CONVERT(varchar(10), DATEADD(day, -@days, GETDATE()), 120)
        GROUP BY ACTIVITY_DATE
        ORDER BY ACTIVITY_DATE ASC
      `)
      return NextResponse.json(r.recordset)
    }

    // ── leaderboard ──────────────────────────────────────────
    // Admins get full breakdown; sales role gets blinded (own full, others totals only)
    if (type === "leaderboard") {
      const r = await pool.request().query(`
        SELECT
          SALES_PERSON AS sales_person,
          SUM(POINTS) AS total_xp,
          COUNT(*) AS total_activities,
          SUM(CASE WHEN ACTIVITY_TYPE = 'COLD_CALL'     THEN 1 ELSE 0 END) AS cold_calls,
          SUM(CASE WHEN ACTIVITY_TYPE = 'WARM_CALL'     THEN 1 ELSE 0 END) AS warm_calls,
          SUM(CASE WHEN ACTIVITY_TYPE = 'CLIENT_VISIT'  THEN 1 ELSE 0 END) AS visits,
          SUM(CASE WHEN ACTIVITY_TYPE = 'VISIT_SECURED' THEN 1 ELSE 0 END) AS secured,
          SUM(CASE WHEN STATUS = 'INTERESTED'           THEN 1 ELSE 0 END) AS interested,
          SUM(CASE WHEN STATUS = 'SECURED'              THEN 1 ELSE 0 END) AS status_secured
        FROM [dbo].[TBL_CALLS_VISITS]
        WHERE SALES_PERSON IS NOT NULL AND SALES_PERSON != ''
        GROUP BY SALES_PERSON
        ORDER BY total_xp DESC
      `)

      if (auth.role === "admin") {
        return NextResponse.json(r.recordset)
      }

      // Non-admin: return everyone's XP + totals, but only their own breakdown
      const mySP = auth.salesperson ?? ""
      const blinded = r.recordset.map((row: LeaderboardRow) => {
        if (row.sales_person === mySP) return row
        // Blind the detail columns
        return {
          sales_person:     row.sales_person,
          total_xp:         row.total_xp,
          total_activities: row.total_activities,
          cold_calls:    null,
          warm_calls:    null,
          visits:        null,
          secured:       null,
          interested:    null,
          status_secured:null,
        }
      })
      return NextResponse.json(blinded)
    }

    // ── status breakdown ─────────────────────────────────────
    if (type === "status") {
      const r = await pool.request().query(`
        SELECT STATUS AS status, COUNT(*) AS count
        FROM [dbo].[TBL_CALLS_VISITS]
        WHERE STATUS IS NOT NULL AND STATUS != ''
        GROUP BY STATUS
        ORDER BY count DESC
      `)
      return NextResponse.json(r.recordset)
    }

    // ── type breakdown ───────────────────────────────────────
    if (type === "typechart") {
      const r = await pool.request().query(`
        SELECT ACTIVITY_TYPE AS activity_type, COUNT(*) AS count, SUM(POINTS) AS xp
        FROM [dbo].[TBL_CALLS_VISITS]
        GROUP BY ACTIVITY_TYPE
        ORDER BY count DESC
      `)
      return NextResponse.json(r.recordset)
    }

    // ── branch performance ───────────────────────────────────
    if (type === "branch") {
      const r = await pool.request().query(`
        SELECT
          ISNULL(BRANCH, 'Unknown') AS branch,
          COUNT(*) AS total,
          SUM(POINTS) AS xp,
          SUM(CASE WHEN ACTIVITY_TYPE = 'VISIT_SECURED' THEN 1 ELSE 0 END) AS secured
        FROM [dbo].[TBL_CALLS_VISITS]
        WHERE BRANCH IS NOT NULL AND BRANCH != ''
        GROUP BY BRANCH
        ORDER BY total DESC
      `)
      return NextResponse.json(r.recordset)
    }

    // ── personal stats (for scorecard — any role, own data) ──
    if (type === "personal") {
      const req3 = pool.request()
      req3.input("created_by", auth.userId)
      const r = await req3.query(`
        SELECT
          SUM(POINTS) AS total_xp,
          COUNT(*) AS total_activities,
          SUM(CASE WHEN ACTIVITY_TYPE IN ('COLD_CALL','WARM_CALL') THEN 1 ELSE 0 END)  AS total_calls,
          SUM(CASE WHEN ACTIVITY_TYPE IN ('CLIENT_VISIT','VISIT_SECURED') THEN 1 ELSE 0 END) AS total_visits,
          SUM(CASE WHEN ACTIVITY_TYPE = 'VISIT_SECURED' THEN 1 ELSE 0 END) AS total_secured,
          SUM(CASE WHEN STATUS = 'INTERESTED' THEN 1 ELSE 0 END) AS total_interested,
          -- This week
          SUM(CASE WHEN ACTIVITY_DATE >= CONVERT(varchar(10), DATEADD(day, -7,  GETDATE()), 120) THEN POINTS ELSE 0 END) AS week_xp,
          SUM(CASE WHEN ACTIVITY_DATE >= CONVERT(varchar(10), DATEADD(day, -7,  GETDATE()), 120) AND ACTIVITY_TYPE IN ('COLD_CALL','WARM_CALL') THEN 1 ELSE 0 END) AS week_calls,
          SUM(CASE WHEN ACTIVITY_DATE >= CONVERT(varchar(10), DATEADD(day, -7,  GETDATE()), 120) AND ACTIVITY_TYPE IN ('CLIENT_VISIT','VISIT_SECURED') THEN 1 ELSE 0 END) AS week_visits,
          -- This month
          SUM(CASE WHEN ACTIVITY_DATE >= CONVERT(varchar(10), DATEADD(day, -30, GETDATE()), 120) THEN POINTS ELSE 0 END) AS month_xp,
          SUM(CASE WHEN ACTIVITY_DATE >= CONVERT(varchar(10), DATEADD(day, -30, GETDATE()), 120) AND ACTIVITY_TYPE IN ('COLD_CALL','WARM_CALL') THEN 1 ELSE 0 END) AS month_calls,
          SUM(CASE WHEN ACTIVITY_DATE >= CONVERT(varchar(10), DATEADD(day, -30, GETDATE()), 120) AND ACTIVITY_TYPE IN ('CLIENT_VISIT','VISIT_SECURED') THEN 1 ELSE 0 END) AS month_visits
        FROM [dbo].[TBL_CALLS_VISITS]
        WHERE CREATED_BY = @created_by
      `)
      return NextResponse.json(r.recordset[0] ?? {})
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface LeaderboardRow {
  sales_person:     string
  total_xp:         number
  total_activities: number
  cold_calls:       number | null
  warm_calls:       number | null
  visits:           number | null
  secured:          number | null
  interested:       number | null
  status_secured:   number | null
}
