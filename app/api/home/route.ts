import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"

/**
 * GET /api/home
 * Returns a combined payload for the personal home page:
 *   - reminders   (today + overdue, undismissed)
 *   - enquiries   (stats + last 5 recent)
 *   - activities  (personal stats + last 5 recent + last 7-day chart)
 *   - chat        (unread count — from Supabase, handled client-side)
 */
export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const pool  = await getPool(auth.company)
    const today = new Date().toISOString().split("T")[0]

    // ── Scope clauses ────────────────────────────────────────────
    // For activities: non-admins see only their own rows
    const actOwnerClause =
      auth.role !== "admin" ? "AND CREATED_BY = @created_by" : ""

    // For enquiries: non-admins see only their own rows
    const enqOwnerClause =
      auth.role !== "admin" ? "WHERE CREATED_BY = @created_by" : ""

    const firstOfMonth = today.slice(0, 8) + "01"
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 6)
    const weekStart  = weekAgo.toISOString().split("T")[0]
    const monthStart = firstOfMonth

    // Perf: all six reads go to the (remote, ~400 ms away) DB as ONE batch —
    // one round trip instead of six sequential ones. Result sets come back in order.
    const req = pool.request()
    req.input("today",          today)
    req.input("created_by",     auth.userId)
    req.input("first_of_month", firstOfMonth)
    req.input("week_start",     weekStart)
    req.input("month_start",    monthStart)

    const batch = await req.query(`
      -- 1. Reminders (today + overdue)

      SELECT TOP 20
        CAST(ID AS varchar(20)) AS id,
        CLIENT_NAME             AS client_name,
        ACTIVITY_TYPE           AS activity_type,
        REMINDER_DATE           AS reminder_date,
        NOTES                   AS notes,
        STATUS                  AS status
      FROM [dbo].[TBL_CALLS_VISITS]
      WHERE REMINDER_DONE = 0
        AND REMINDER_DATE IS NOT NULL
        AND REMINDER_DATE <= @today
        ${actOwnerClause}
      ORDER BY REMINDER_DATE ASC;

      -- 2a. Enquiry stats

      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN STATUS IN ('FOLLOW UP','NO FEEDBACK','PENDING','QUOTED') THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN STATUS = 'WIN' AND ENQRECPTDT >= @first_of_month         THEN 1 ELSE 0 END) AS won_month
      FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
      ${enqOwnerClause};

      -- 2b. Recent 5 enquiries

      SELECT TOP 5
        CAST(PK_ID AS varchar(20))  AS id,
        ENQREFNO                    AS enq_ref_no,
        ENQRECPTDT                  AS enq_receipt_date,
        SHIPPER                     AS shipper,
        CONSIGNEE                   AS consignee,
        SALESPERSON                 AS sales_person,
        MODE                        AS mode,
        STATUS                      AS status,
        CONVERT(varchar(19), MAKERDT, 120) AS created_at
      FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
      ${enqOwnerClause}
      ORDER BY MAKERDT DESC;

      -- 3. Activity personal stats

      SELECT
        SUM(POINTS)   AS total_xp,
        COUNT(*)      AS total_activities,
        SUM(CASE WHEN ACTIVITY_DATE >= @week_start  AND ACTIVITY_TYPE IN ('COLD_CALL','WARM_CALL','CALL_SECURED') THEN 1 ELSE 0 END) AS week_calls,
        SUM(CASE WHEN ACTIVITY_DATE >= @week_start  AND ACTIVITY_TYPE IN ('CLIENT_VISIT','VISIT_SECURED') THEN 1 ELSE 0 END) AS week_visits,
        SUM(CASE WHEN ACTIVITY_DATE >= @week_start  THEN POINTS ELSE 0 END) AS week_xp,
        SUM(CASE WHEN ACTIVITY_DATE >= @month_start AND ACTIVITY_TYPE IN ('COLD_CALL','WARM_CALL','CALL_SECURED') THEN 1 ELSE 0 END) AS month_calls,
        SUM(CASE WHEN ACTIVITY_DATE >= @month_start AND ACTIVITY_TYPE IN ('CLIENT_VISIT','VISIT_SECURED') THEN 1 ELSE 0 END) AS month_visits,
        SUM(CASE WHEN ACTIVITY_DATE >= @month_start THEN POINTS ELSE 0 END) AS month_xp
      FROM [dbo].[TBL_CALLS_VISITS]
      WHERE CREATED_BY = @created_by;

      -- 4. Recent activities (last 5)

      SELECT TOP 5
        CAST(ID AS varchar(20)) AS id,
        ACTIVITY_DATE           AS activity_date,
        ACTIVITY_TYPE           AS activity_type,
        CLIENT_NAME             AS client_name,
        SALES_PERSON            AS sales_person,
        STATUS                  AS status,
        POINTS                  AS points,
        NOTES                   AS notes
      FROM [dbo].[TBL_CALLS_VISITS]
      WHERE CREATED_BY = @created_by
      ORDER BY CREATED_AT DESC;

      -- 5. Weekly chart (last 7 days, calls + visits per day)

      SELECT
        ACTIVITY_DATE AS date,
        SUM(CASE WHEN ACTIVITY_TYPE IN ('COLD_CALL','WARM_CALL','CALL_SECURED') THEN 1 ELSE 0 END) AS calls,
        SUM(CASE WHEN ACTIVITY_TYPE IN ('CLIENT_VISIT','VISIT_SECURED') THEN 1 ELSE 0 END) AS visits,
        SUM(POINTS) AS xp
      FROM [dbo].[TBL_CALLS_VISITS]
      WHERE CREATED_BY = @created_by
        AND ACTIVITY_DATE >= @week_start
      GROUP BY ACTIVITY_DATE
      ORDER BY ACTIVITY_DATE ASC
    `)
    const sets = batch.recordsets as unknown as Record<string, unknown>[][]
    const [remRows, enqStatsRows, enqRecentRows, actStatsRows, actRecentRows, chartRows] = sets

    return NextResponse.json({
      reminders:     remRows,
      enquiry: {
        stats:  enqStatsRows[0] ?? { total: 0, in_progress: 0, won_month: 0 },
        recent: enqRecentRows,
      },
      activity: {
        stats:       actStatsRows[0] ?? {},
        recent:      actRecentRows,
        weekly_chart: chartRows,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
