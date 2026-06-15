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

// ─── GET /api/sales-leads ─────────────────────────────────────
export async function GET(_req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const pool = await getPool(auth.company)
    const req  = pool.request()

    let where = ""
    if (auth.role !== "admin") {
      // Non-admins see leads they created or leads sent under their salesperson name
      req.input("created_by", auth.userId)
      req.input("sp", (auth.salesperson ?? "").toUpperCase())
      where = "WHERE (CREATED_BY = @created_by OR UPPER(SENT_BY) = @sp)"
    }

    const result = await req.query(`
      SELECT ${SELECT_COLS}
      FROM [dbo].[TBL_SALES_LEADS]
      ${where}
      ORDER BY ID DESC
    `)

    return NextResponse.json(result.recordset)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST /api/sales-leads ────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: LeadPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.shipper?.trim()) {
    return NextResponse.json({ error: "shipper is required" }, { status: 400 })
  }
  if (body.status && !LEAD_STATUS_VALUES.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const year   = new Date().getFullYear()
  const prefix = auth.company === "links" ? `LNK-SL-${year}-` : `MPC-SL-${year}-`
  const now    = new Date()

  try {
    const pool = await getPool(auth.company)

    // Retry on rare ref collision (unique index UX_SL_REF)
    for (let attempt = 0; attempt < 3; attempt++) {
      const seqReq = pool.request()
      seqReq.input("prefix", prefix)
      const seq = await seqReq.query<{ next_seq: number }>(`
        SELECT ISNULL(MAX(CAST(SUBSTRING(REF_CODE, LEN(@prefix) + 1, 10) AS INT)), 99) + 1 AS next_seq
        FROM [dbo].[TBL_SALES_LEADS]
        WHERE REF_CODE LIKE @prefix + '%'
          AND ISNUMERIC(SUBSTRING(REF_CODE, LEN(@prefix) + 1, 10)) = 1
      `)
      const refCode = `${prefix}${seq.recordset[0].next_seq}`

      try {
        const result = await pool.request()
          .input("ref",                 refCode)
          .input("sent_by",             trunc(body.sent_by, 50))
          .input("date_sent",           trunc(body.date_sent, 10))
          .input("shipper",             trunc(body.shipper, 255))
          .input("website",             trunc(body.shipper_website, 500))
          .input("city",                trunc(body.city, 255))
          .input("consignee",           trunc(body.consignee, 255))
          .input("country",             trunc(body.dest_country, 150))
          .input("agent_name",          trunc(body.agent_name, 255))
          .input("agent_email",         trunc(body.agent_email, 500))
          .input("status",              body.status || null)
          .input("remarks",             trunc(body.remarks, 2000))
          .input("remarks_2",           trunc(body.remarks_2, 2000))
          .input("last_follow_up",      trunc(body.last_follow_up, 10))
          .input("notes",               trunc(body.notes, 2000))
          .input("shipper_address",     trunc(body.shipper_address, 1000))
          .input("consignee_address",   trunc(body.consignee_address, 1000))
          .input("consignee_website",   trunc(body.consignee_website, 500))
          .input("mode_of_transport",   trunc(body.mode_of_transport, 100))
          .input("origin_port",         trunc(body.origin_port, 255))
          .input("dest_port",           trunc(body.dest_port, 255))
          .input("commodity",           trunc(body.commodity, 2000))
          .input("hs_code",             trunc(body.hs_code, 100))
          .input("special_requirements",trunc(body.special_requirements, 2000))
          .input("rate_fcl",            trunc(body.rate_fcl, 500))
          .input("rate_lcl",            trunc(body.rate_lcl, 500))
          .input("rate_validity",       trunc(body.rate_validity, 255))
          .input("created_by",          auth.userId)
          .input("now",                 now)
          .query<{ ID: number }>(`
            INSERT INTO [dbo].[TBL_SALES_LEADS] (
              REF_CODE, SENT_BY, DATE_SENT, SHIPPER, SHIPPER_WEBSITE, CITY,
              CONSIGNEE, DEST_COUNTRY, AGENT_NAME, AGENT_EMAIL, STATUS,
              REMARKS, REMARKS_2, LAST_FOLLOW_UP, NOTES,
              SHIPPER_ADDRESS, CONSIGNEE_ADDRESS, CONSIGNEE_WEBSITE,
              MODE_OF_TRANSPORT, ORIGIN_PORT, DEST_PORT,
              COMMODITY, HS_CODE, SPECIAL_REQUIREMENTS,
              RATE_FCL, RATE_LCL, RATE_VALIDITY,
              CREATED_BY, CREATED_AT, UPDATED_AT
            )
            OUTPUT inserted.ID
            VALUES (
              @ref, @sent_by, @date_sent, @shipper, @website, @city,
              @consignee, @country, @agent_name, @agent_email, @status,
              @remarks, @remarks_2, @last_follow_up, @notes,
              @shipper_address, @consignee_address, @consignee_website,
              @mode_of_transport, @origin_port, @dest_port,
              @commodity, @hs_code, @special_requirements,
              @rate_fcl, @rate_lcl, @rate_validity,
              @created_by, @now, @now
            )
          `)

        return NextResponse.json(
          { id: String(result.recordset[0].ID), ref_code: refCode },
          { status: 201 }
        )
      } catch (insertErr: unknown) {
        const msg = insertErr instanceof Error ? insertErr.message : ""
        const isDup = msg.includes("UX_SL_REF") || msg.includes("duplicate")
        if (!isDup || attempt === 2) throw insertErr
        // else loop: recompute next seq and retry
      }
    }

    return NextResponse.json({ error: "Could not allocate ref code" }, { status: 500 })
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
