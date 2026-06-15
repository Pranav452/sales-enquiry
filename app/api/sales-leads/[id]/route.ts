import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { LEAD_STATUS_VALUES } from "@/lib/constants/sales-leads"

const SELECT_COLS = `
  CAST(ID AS varchar(20)) AS id,
  REF_CODE                AS ref_code,
  SENT_BY                 AS sent_by,
  DATE_SENT               AS date_sent,
  SHIPPER                 AS shipper,
  SHIPPER_WEBSITE         AS shipper_website,
  CITY                    AS city,
  CONSIGNEE               AS consignee,
  DEST_COUNTRY            AS dest_country,
  AGENT_NAME              AS agent_name,
  AGENT_EMAIL             AS agent_email,
  STATUS                  AS status,
  REMARKS                 AS remarks,
  REMARKS_2               AS remarks_2,
  LAST_FOLLOW_UP          AS last_follow_up,
  NOTES                   AS notes,
  CAST(CONTACT_ID AS varchar(20)) AS contact_id,
  CREATED_BY              AS created_by,
  CONVERT(varchar(10), CREATED_AT, 120) AS created_at,
  SHIPPER_ADDRESS         AS shipper_address,
  CONSIGNEE_ADDRESS       AS consignee_address,
  CONSIGNEE_WEBSITE       AS consignee_website,
  MODE_OF_TRANSPORT       AS mode_of_transport,
  ORIGIN_PORT             AS origin_port,
  DEST_PORT               AS dest_port,
  COMMODITY               AS commodity,
  HS_CODE                 AS hs_code,
  SPECIAL_REQUIREMENTS    AS special_requirements,
  RATE_FCL                AS rate_fcl,
  RATE_LCL                AS rate_lcl,
  RATE_VALIDITY           AS rate_validity
`

// Non-admins may only touch rows they created or rows under their salesperson name
function ownerClause(role: string): string {
  return role !== "admin"
    ? " AND (CREATED_BY = @owner_id OR UPPER(SENT_BY) = @owner_sp)"
    : ""
}

// ─── GET /api/sales-leads/[id] ────────────────────────────────
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
    if (auth.role !== "admin") {
      req.input("owner_id", auth.userId)
      req.input("owner_sp", (auth.salesperson ?? "").toUpperCase())
    }

    const result = await req.query(`
      SELECT ${SELECT_COLS}
      FROM [dbo].[TBL_SALES_LEADS]
      WHERE ID = @id${ownerClause(auth.role)}
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

// ─── PATCH /api/sales-leads/[id] ──────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  let body: Partial<LeadPayload>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (body.status && !LEAD_STATUS_VALUES.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  try {
    const pool = await getPool(auth.company)
    const request = pool.request()
    request.input("id", id)
    request.input("updated_at", new Date())
    if (auth.role !== "admin") {
      request.input("owner_id", auth.userId)
      request.input("owner_sp", (auth.salesperson ?? "").toUpperCase())
    }

    const sets: string[] = ["UPDATED_AT = @updated_at"]

    if (body.sent_by              !== undefined) { request.input("sent_by",             trunc(body.sent_by, 50));              sets.push("SENT_BY = @sent_by") }
    if (body.date_sent            !== undefined) { request.input("date_sent",           trunc(body.date_sent, 10));            sets.push("DATE_SENT = @date_sent") }
    if (body.shipper              !== undefined) { request.input("shipper",             trunc(body.shipper, 255));             sets.push("SHIPPER = @shipper") }
    if (body.shipper_website      !== undefined) { request.input("website",             trunc(body.shipper_website, 500));     sets.push("SHIPPER_WEBSITE = @website") }
    if (body.city                 !== undefined) { request.input("city",                trunc(body.city, 255));                sets.push("CITY = @city") }
    if (body.consignee            !== undefined) { request.input("consignee",           trunc(body.consignee, 255));           sets.push("CONSIGNEE = @consignee") }
    if (body.dest_country         !== undefined) { request.input("country",             trunc(body.dest_country, 150));        sets.push("DEST_COUNTRY = @country") }
    if (body.agent_name           !== undefined) { request.input("agent_name",          trunc(body.agent_name, 255));          sets.push("AGENT_NAME = @agent_name") }
    if (body.agent_email          !== undefined) { request.input("agent_email",         trunc(body.agent_email, 500));         sets.push("AGENT_EMAIL = @agent_email") }
    if (body.status               !== undefined) { request.input("status",              body.status || null);                  sets.push("STATUS = @status") }
    if (body.remarks              !== undefined) { request.input("remarks",             trunc(body.remarks, 2000));            sets.push("REMARKS = @remarks") }
    if (body.remarks_2            !== undefined) { request.input("remarks_2",           trunc(body.remarks_2, 2000));          sets.push("REMARKS_2 = @remarks_2") }
    if (body.last_follow_up       !== undefined) { request.input("last_follow_up",      trunc(body.last_follow_up, 10));       sets.push("LAST_FOLLOW_UP = @last_follow_up") }
    if (body.notes                !== undefined) { request.input("notes",               trunc(body.notes, 2000));              sets.push("NOTES = @notes") }
    if (body.shipper_address      !== undefined) { request.input("shipper_address",     trunc(body.shipper_address, 1000));    sets.push("SHIPPER_ADDRESS = @shipper_address") }
    if (body.consignee_address    !== undefined) { request.input("consignee_address",   trunc(body.consignee_address, 1000));  sets.push("CONSIGNEE_ADDRESS = @consignee_address") }
    if (body.consignee_website    !== undefined) { request.input("consignee_website",   trunc(body.consignee_website, 500));   sets.push("CONSIGNEE_WEBSITE = @consignee_website") }
    if (body.mode_of_transport    !== undefined) { request.input("mode_of_transport",   trunc(body.mode_of_transport, 100));   sets.push("MODE_OF_TRANSPORT = @mode_of_transport") }
    if (body.origin_port          !== undefined) { request.input("origin_port",         trunc(body.origin_port, 255));         sets.push("ORIGIN_PORT = @origin_port") }
    if (body.dest_port            !== undefined) { request.input("dest_port",           trunc(body.dest_port, 255));           sets.push("DEST_PORT = @dest_port") }
    if (body.commodity            !== undefined) { request.input("commodity",           trunc(body.commodity, 2000));          sets.push("COMMODITY = @commodity") }
    if (body.hs_code              !== undefined) { request.input("hs_code",             trunc(body.hs_code, 100));             sets.push("HS_CODE = @hs_code") }
    if (body.special_requirements !== undefined) { request.input("special_requirements",trunc(body.special_requirements, 2000)); sets.push("SPECIAL_REQUIREMENTS = @special_requirements") }
    if (body.rate_fcl             !== undefined) { request.input("rate_fcl",            trunc(body.rate_fcl, 500));            sets.push("RATE_FCL = @rate_fcl") }
    if (body.rate_lcl             !== undefined) { request.input("rate_lcl",            trunc(body.rate_lcl, 500));            sets.push("RATE_LCL = @rate_lcl") }
    if (body.rate_validity        !== undefined) { request.input("rate_validity",       trunc(body.rate_validity, 255));       sets.push("RATE_VALIDITY = @rate_validity") }

    const result = await request.query(`
      UPDATE [dbo].[TBL_SALES_LEADS]
      SET ${sets.join(", ")}
      WHERE ID = @id${ownerClause(auth.role)}
    `)

    if (!result.rowsAffected[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true, id: String(id) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function trunc(val: string | null | undefined, max: number): string | null {
  if (!val) return null
  const t = val.trim()
  if (!t) return null
  return t.length > max ? t.substring(0, max) : t
}

interface LeadPayload {
  sent_by?:              string | null
  date_sent?:            string | null
  shipper?:              string | null
  shipper_website?:      string | null
  city?:                 string | null
  consignee?:            string | null
  dest_country?:         string | null
  agent_name?:           string | null
  agent_email?:          string | null
  status?:               string | null
  remarks?:              string | null
  remarks_2?:            string | null
  last_follow_up?:       string | null
  notes?:                string | null
  shipper_address?:      string | null
  consignee_address?:    string | null
  consignee_website?:    string | null
  mode_of_transport?:    string | null
  origin_port?:          string | null
  dest_port?:            string | null
  commodity?:            string | null
  hs_code?:              string | null
  special_requirements?: string | null
  rate_fcl?:             string | null
  rate_lcl?:             string | null
  rate_validity?:        string | null
}
