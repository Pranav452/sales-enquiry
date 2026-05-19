import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { getActivityPoints, ACTIVITY_TYPE_MAP } from "@/lib/constants/activities"

const SELECT_COLS = `
  CAST(ID AS varchar(20))  AS id,
  ACTIVITY_DATE            AS activity_date,
  ACTIVITY_TYPE            AS activity_type,
  SALES_PERSON             AS sales_person,
  BRANCH                   AS branch,
  CLIENT_NAME              AS client_name,
  CONTACT_PERSON           AS contact_person,
  CONTACT_NUMBER           AS contact_number,
  EMAIL                    AS email,
  MODE                     AS mode,
  POL                      AS pol,
  POD                      AS pod,
  COMMODITY                AS commodity,
  STATUS                   AS status,
  NOTES                    AS notes,
  POINTS                   AS points,
  REMINDER_DATE            AS reminder_date,
  REMINDER_DONE            AS reminder_done,
  CREATED_BY               AS created_by,
  CONVERT(varchar(10), CREATED_AT, 120) AS created_at
`

// ─── GET /api/activities ──────────────────────────────────────
export async function GET(_req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const pool = await getPool(auth.company)
    const req  = pool.request()

    let where = ""
    if (auth.role !== "admin") {
      // Non-admins only see their own activity rows
      req.input("created_by", auth.userId)
      where = "WHERE CREATED_BY = @created_by"
    }

    const result = await req.query(`
      SELECT ${SELECT_COLS}
      FROM [dbo].[TBL_CALLS_VISITS]
      ${where}
      ORDER BY ACTIVITY_DATE DESC, ID DESC
    `)

    return NextResponse.json(result.recordset)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST /api/activities ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: ActivityPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.activity_type || !ACTIVITY_TYPE_MAP[body.activity_type]) {
    return NextResponse.json({ error: "Invalid activity_type" }, { status: 400 })
  }
  if (!body.activity_date) {
    return NextResponse.json({ error: "activity_date is required" }, { status: 400 })
  }

  // Reminder date is mandatory for call types
  const isCall = body.activity_type === "COLD_CALL" || body.activity_type === "WARM_CALL"
  if (isCall && !body.reminder_date) {
    return NextResponse.json({ error: "reminder_date is required for call activities" }, { status: 400 })
  }

  const points = getActivityPoints(body.activity_type)
  const now    = new Date()

  try {
    const pool = await getPool(auth.company)
    const result = await pool
      .request()
      .input("activity_date",  body.activity_date)
      .input("activity_type",  body.activity_type)
      .input("sales_person",   trunc(body.sales_person,   15))
      .input("branch",         trunc(body.branch,         10))
      .input("client_name",    trunc(body.client_name,    200))
      .input("contact_person", trunc(body.contact_person, 100))
      .input("contact_number", trunc(body.contact_number, 50))
      .input("email",          trunc(body.email,          100))
      .input("mode",           trunc(body.mode,           10))
      .input("pol",            trunc(body.pol,            100))
      .input("pod",            trunc(body.pod,            100))
      .input("commodity",      trunc(body.commodity,      100))
      .input("status",         trunc(body.status,         25))
      .input("notes",          trunc(body.notes,          500))
      .input("points",         points)
      .input("reminder_date",  trunc(body.reminder_date,  10) ?? null)
      .input("created_by",     auth.userId)
      .input("now",            now)
      .query<{ ID: number }>(`
        INSERT INTO [dbo].[TBL_CALLS_VISITS] (
          ACTIVITY_DATE, ACTIVITY_TYPE, SALES_PERSON, BRANCH,
          CLIENT_NAME, CONTACT_PERSON, CONTACT_NUMBER, EMAIL,
          MODE, POL, POD, COMMODITY, STATUS, NOTES,
          POINTS, REMINDER_DATE, REMINDER_DONE,
          CREATED_BY, CREATED_AT, UPDATED_AT
        )
        OUTPUT inserted.ID
        VALUES (
          @activity_date, @activity_type, @sales_person, @branch,
          @client_name, @contact_person, @contact_number, @email,
          @mode, @pol, @pod, @commodity, @status, @notes,
          @points, @reminder_date, 0,
          @created_by, @now, @now
        )
      `)

    const newId = result.recordset[0].ID
    return NextResponse.json({ id: String(newId), points }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function trunc(val: string | null | undefined, max: number): string | null {
  if (!val) return null
  return val.length > max ? val.substring(0, max) : val
}

interface ActivityPayload {
  activity_date?:   string
  activity_type?:   string
  sales_person?:    string | null
  branch?:          string | null
  client_name?:     string | null
  contact_person?:  string | null
  contact_number?:  string | null
  email?:           string | null
  mode?:            string | null
  pol?:             string | null
  pod?:             string | null
  commodity?:       string | null
  status?:          string | null
  notes?:           string | null
  reminder_date?:   string | null
}
