import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { getActivityPoints, ACTIVITY_TYPE_MAP } from "@/lib/constants/activities"

// ─── GET /api/activities/[id] ─────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const pool = await getPool(auth.company)
    const req  = pool.request()
    req.input("id", id)

    // Non-admins can only see their own rows
    if (auth.role !== "admin") {
      req.input("created_by", auth.userId)
    }

    const where = auth.role !== "admin"
      ? "WHERE ID = @id AND CREATED_BY = @created_by"
      : "WHERE ID = @id"

    const result = await req.query(`
      SELECT
        CAST(ID AS varchar(20))  AS id,
        ACTIVITY_DATE, ACTIVITY_TYPE, SALES_PERSON, BRANCH,
        CLIENT_NAME, CONTACT_PERSON, CONTACT_NUMBER, EMAIL,
        MODE, POL, POD, COMMODITY, STATUS, NOTES, POINTS,
        CREATED_BY,
        CONVERT(varchar(10), CREATED_AT, 120) AS created_at
      FROM [dbo].[TBL_CALLS_VISITS]
      ${where}
    `)

    if (!result.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json(result.recordset[0])
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── PATCH /api/activities/[id] ───────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  let body: Partial<ActivityPayload>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Recalculate points if type changed
  const points = body.activity_type
    ? getActivityPoints(body.activity_type)
    : undefined

  if (body.activity_type && !ACTIVITY_TYPE_MAP[body.activity_type]) {
    return NextResponse.json({ error: "Invalid activity_type" }, { status: 400 })
  }

  try {
    const pool = await getPool(auth.company)
    const request = pool.request()
    request.input("id", id)
    request.input("updated_at", new Date())

    // Non-admins can only edit their own
    if (auth.role !== "admin") {
      request.input("created_by", auth.userId)
    }

    const sets: string[] = ["UPDATED_AT = @updated_at"]

    if (body.activity_date)   { request.input("activity_date",  body.activity_date);                         sets.push("ACTIVITY_DATE = @activity_date") }
    if (body.activity_type)   { request.input("activity_type",  body.activity_type);                         sets.push("ACTIVITY_TYPE = @activity_type") }
    if (body.sales_person  !== undefined) { request.input("sales_person",   trunc(body.sales_person,   15)); sets.push("SALES_PERSON = @sales_person") }
    if (body.branch        !== undefined) { request.input("branch",         trunc(body.branch,         10)); sets.push("BRANCH = @branch") }
    if (body.client_name   !== undefined) { request.input("client_name",    trunc(body.client_name,    200));sets.push("CLIENT_NAME = @client_name") }
    if (body.contact_person !== undefined){ request.input("contact_person", trunc(body.contact_person, 100));sets.push("CONTACT_PERSON = @contact_person") }
    if (body.contact_number !== undefined){ request.input("contact_number", trunc(body.contact_number, 50)); sets.push("CONTACT_NUMBER = @contact_number") }
    if (body.email         !== undefined) { request.input("email",          trunc(body.email,          100));sets.push("EMAIL = @email") }
    if (body.mode          !== undefined) { request.input("mode",           trunc(body.mode,           10)); sets.push("MODE = @mode") }
    if (body.pol           !== undefined) { request.input("pol",            trunc(body.pol,            100));sets.push("POL = @pol") }
    if (body.pod           !== undefined) { request.input("pod",            trunc(body.pod,            100));sets.push("POD = @pod") }
    if (body.commodity     !== undefined) { request.input("commodity",      trunc(body.commodity,      100));sets.push("COMMODITY = @commodity") }
    if (body.status        !== undefined) { request.input("status",         trunc(body.status,         25)); sets.push("STATUS = @status") }
    if (body.notes         !== undefined) { request.input("notes",          trunc(body.notes,          500));sets.push("NOTES = @notes") }
    if (points !== undefined)             { request.input("points",         points);                         sets.push("POINTS = @points") }

    const ownerClause = auth.role !== "admin" ? " AND CREATED_BY = @created_by" : ""

    await request.query(`
      UPDATE [dbo].[TBL_CALLS_VISITS]
      SET ${sets.join(", ")}
      WHERE ID = @id${ownerClause}
    `)

    return NextResponse.json({ ok: true })
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
}
