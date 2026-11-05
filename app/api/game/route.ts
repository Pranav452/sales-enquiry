import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import {
  computeProfile, toBoardEntry, groupRows, todayIST,
  type RawDayRow, type RawPersonExtras,
} from "@/lib/game/engine"
import type { GameApiResponse, GameProfile } from "@/lib/game/types"

/**
 * GET /api/game
 * The Grand Voyage — the viewer's game profile + the crew leaderboard.
 * Everything is derived from TBL_CALLS_VISITS; nothing is stored.
 * Non-admins see other players' level/XP/streak but not their activity breakdown.
 */

const DAY_COLS = `
  CONVERT(varchar(10), CREATED_AT, 120) AS c,
  ACTIVITY_DATE AS d,
  COUNT(*) AS n,
  SUM(POINTS) AS xp,
  SUM(CASE WHEN ACTIVITY_TYPE = 'COLD_CALL'           THEN 1 ELSE 0 END) AS cold,
  SUM(CASE WHEN ACTIVITY_TYPE = 'WARM_CALL'           THEN 1 ELSE 0 END) AS warm,
  SUM(CASE WHEN ACTIVITY_TYPE = 'CALL_SECURED'        THEN 1 ELSE 0 END) AS call_secured,
  SUM(CASE WHEN ACTIVITY_TYPE = 'CLIENT_VISIT'        THEN 1 ELSE 0 END) AS client_visit,
  SUM(CASE WHEN ACTIVITY_TYPE = 'VISIT_SECURED'       THEN 1 ELSE 0 END) AS visit_secured,
  SUM(CASE WHEN ACTIVITY_TYPE = 'SHIPPING_LINE_VISIT' THEN 1 ELSE 0 END) AS line_visit,
  SUM(CASE WHEN STATUS = 'INTERESTED' THEN 1 ELSE 0 END) AS interested,
  SUM(CASE WHEN ACTIVITY_TYPE IN ('VISIT_SECURED','CALL_SECURED') OR STATUS = 'SECURED' THEN 1 ELSE 0 END) AS secured,
  COUNT(DISTINCT CLIENT_NAME) AS clients,
  COUNT(DISTINCT ACTIVITY_TYPE) AS types
`

const EXTRA_COLS = `
  COUNT(DISTINCT UPPER(LTRIM(RTRIM(CLIENT_NAME)))) AS clients,
  COUNT(DISTINCT UPPER(LTRIM(RTRIM(POD))))         AS pods
`

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const today = todayIST()
  const isAdmin = auth.role === "admin"
  const mySP = (auth.salesperson ?? "").trim()

  try {
    const pool = await getPool(auth.company)

    const [dayRes, extraRes] = await Promise.all([
      pool.request().input("today", today).query<RawDayRow>(`
        SELECT SALES_PERSON AS person, ${DAY_COLS}
        FROM [dbo].[TBL_CALLS_VISITS]
        WHERE SALES_PERSON IS NOT NULL AND SALES_PERSON <> '' AND ACTIVITY_DATE <= @today
        GROUP BY SALES_PERSON, ACTIVITY_DATE, CONVERT(varchar(10), CREATED_AT, 120)
      `),
      pool.request().input("today", today).query<RawPersonExtras>(`
        SELECT SALES_PERSON AS person, ${EXTRA_COLS}
        FROM [dbo].[TBL_CALLS_VISITS]
        WHERE SALES_PERSON IS NOT NULL AND SALES_PERSON <> '' AND ACTIVITY_DATE <= @today
        GROUP BY SALES_PERSON
      `),
    ])

    const byPerson = groupRows(dayRes.recordset)
    const extras = new Map(extraRes.recordset.map((e) => [(e.person ?? "").trim(), e]))

    const profiles = new Map<string, GameProfile>()
    for (const [person, rows] of byPerson) {
      const ex = extras.get(person)
      profiles.set(person, computeProfile(person, rows, ex ? { clients: ex.clients, pods: ex.pods } : undefined, today))
    }

    // ── The viewer's own profile ──
    let me: GameProfile | null = mySP ? profiles.get(mySP) ?? null : null
    if (!me) {
      // No salesperson mapped (or no rows under it) — fall back to rows the user created
      const [mineRes, mineExtra] = await Promise.all([
        pool.request().input("today", today).input("uid", auth.userId).query<RawDayRow>(`
          SELECT '__me__' AS person, ${DAY_COLS}
          FROM [dbo].[TBL_CALLS_VISITS]
          WHERE CREATED_BY = @uid AND ACTIVITY_DATE <= @today
          GROUP BY ACTIVITY_DATE, CONVERT(varchar(10), CREATED_AT, 120)
        `),
        pool.request().input("today", today).input("uid", auth.userId).query<RawPersonExtras>(`
          SELECT '__me__' AS person, ${EXTRA_COLS}
          FROM [dbo].[TBL_CALLS_VISITS]
          WHERE CREATED_BY = @uid AND ACTIVITY_DATE <= @today
        `),
      ])
      const ex = mineExtra.recordset[0]
      me = computeProfile(
        mySP || "You",
        mineRes.recordset,
        ex ? { clients: ex.clients, pods: ex.pods } : undefined,
        today,
      )
    }

    const board = [...profiles.values()]
      .map((p) => toBoardEntry(p, p.person === mySP, isAdmin || p.person === mySP))
      .sort((a, b) => b.totalXp - a.totalXp)

    const body: GameApiResponse = { today, isAdmin, me, board }
    return NextResponse.json(body)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
