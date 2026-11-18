import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { LEAD_STATUSES, LEAD_STATUS_VALUES } from "@/lib/constants/sales-leads"
import { pagedQuery, readPaging, readSearch } from "@/lib/mssql/paginate"

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
  RATE_VALIDITY           AS rate_validity,
  RATE_NOTES              AS rate_notes,
  AGENT_COMPANY           AS agent_company,
  ORIGIN_COUNTRY          AS origin_country,
  ORIGIN_PORT_CODE        AS origin_port_code,
  DEST_PORT_CODE          AS dest_port_code,
  RATE_CURRENCY           AS rate_currency,
  RATE_20GP               AS rate_20gp,
  RATE_40HC               AS rate_40hc,
  CONSIGNEE_CONTACT       AS consignee_contact,
  CONSIGNEE_EMAIL         AS consignee_email,
  CONSIGNEE_PHONE         AS consignee_phone,
  SENDER_DESIGNATION      AS sender_designation,
  SENDER_EMAIL            AS sender_email,
  SENDER_PHONE            AS sender_phone
`

// Free-text search columns (one bound @q, literal substring match)
const SEARCH_COLS = [
  "REF_CODE", "SENT_BY", "SHIPPER", "CITY", "CONSIGNEE", "DEST_COUNTRY",
  "AGENT_NAME", "AGENT_COMPANY", "AGENT_EMAIL", "REMARKS", "REMARKS_2", "NOTES",
  "COMMODITY", "HS_CODE", "MODE_OF_TRANSPORT", "ORIGIN_COUNTRY",
  "ORIGIN_PORT", "DEST_PORT", "ORIGIN_PORT_CODE", "DEST_PORT_CODE",
]

/** Escape LIKE wildcards so the search is a plain substring match. */
function likeLiteral(v: string): string {
  return v.replace(/\[/g, "[[]").replace(/%/g, "[%]").replace(/_/g, "[_]")
}

// ─── GET /api/sales-leads ─────────────────────────────────────
// Without `page`: bare array of every visible lead (legacy).
// With `page`:    { data, total, page, limit, won } — filtered by q / status / person / country.
export async function GET(request: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const pool = await getPool(auth.company)
    const req  = pool.request()
    const sp   = request.nextUrl.searchParams

    const conds: string[] = []
    if (auth.role !== "admin") {
      // Non-admins see leads they created or leads sent under their salesperson name
      req.input("created_by", auth.userId)
      req.input("sp", (auth.salesperson ?? "").toUpperCase())
      conds.push("(CREATED_BY = @created_by OR UPPER(SENT_BY) = @sp)")
    }

    if (!sp.has("page")) {
      const result = await req.query(`
        SELECT ${SELECT_COLS}
        FROM [dbo].[TBL_SALES_LEADS]
        ${conds.length ? `WHERE ${conds.join(" AND ")}` : ""}
        ORDER BY ID DESC
      `)
      return NextResponse.json(result.recordset)
    }

    const { page, limit } = readPaging(sp)

    const status = (sp.get("status") ?? "").trim()
    if (status) {
      if (!LEAD_STATUS_VALUES.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 })
      req.input("status", status)
      conds.push("STATUS = @status")
    }
    const person = readSearch(sp, "person", 50)
    if (person) {
      req.input("person", person)
      conds.push("SENT_BY = @person")
    }
    const country = readSearch(sp, "country", 150)
    if (country) {
      req.input("country", country)
      conds.push("DEST_COUNTRY = @country")
    }

    const q = readSearch(sp)
    if (q) {
      req.input("q", likeLiteral(q))
      const ors = SEARCH_COLS.map((c) => `${c} LIKE '%' + @q + '%'`)
      // Status is stored as a code; match its display label too ("won", "quoted"…)
      const ql = q.toLowerCase()
      const statusHits = LEAD_STATUSES.filter((s) => s.label.toLowerCase().includes(ql)).map((s) => s.value)
      statusHits.forEach((v, i) => req.input(`qs${i}`, v))
      if (statusHits.length) ors.push(`STATUS IN (${statusHits.map((_, i) => `@qs${i}`).join(", ")})`)
      conds.push(`(${ors.join(" OR ")})`)
    }

    const { rows, total } = await pagedQuery<SalesLeadRow>(req, {
      select: `SUM(CASE WHEN STATUS = 'WON' THEN 1 ELSE 0 END) OVER () AS __won, ${SELECT_COLS}`,
      from: "[dbo].[TBL_SALES_LEADS]",
      where: conds.join(" AND ") || undefined,
      orderBy: "ID DESC",
      page, limit,
    })

    const won = rows.length ? Number(rows[0].__won ?? 0) : 0
    const data = rows.map(({ __won, ...rest }) => { void __won; return rest })
    return NextResponse.json({ data, total, page, limit, won })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

type SalesLeadRow = Record<string, unknown> & { __won?: number }

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
          .input("rate_notes",          trunc(body.rate_notes, 8000))
          .input("agent_company",       trunc(body.agent_company, 255))
          .input("origin_country",      trunc(body.origin_country, 100))
          .input("origin_port_code",    trunc(body.origin_port_code, 10))
          .input("dest_port_code",      trunc(body.dest_port_code, 10))
          .input("rate_currency",       trunc(body.rate_currency, 10))
          .input("rate_20gp",           trunc(body.rate_20gp, 100))
          .input("rate_40hc",           trunc(body.rate_40hc, 100))
          .input("consignee_contact",   trunc(body.consignee_contact, 255))
          .input("consignee_email",     trunc(body.consignee_email, 255))
          .input("consignee_phone",     trunc(body.consignee_phone, 100))
          .input("sender_designation",  trunc(body.sender_designation, 100))
          .input("sender_email",        trunc(body.sender_email, 255))
          .input("sender_phone",        trunc(body.sender_phone, 100))
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
              RATE_FCL, RATE_LCL, RATE_VALIDITY, RATE_NOTES,
              AGENT_COMPANY, ORIGIN_COUNTRY, ORIGIN_PORT_CODE, DEST_PORT_CODE,
              RATE_CURRENCY, RATE_20GP, RATE_40HC,
              CONSIGNEE_CONTACT, CONSIGNEE_EMAIL, CONSIGNEE_PHONE,
              SENDER_DESIGNATION, SENDER_EMAIL, SENDER_PHONE,
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
              @rate_fcl, @rate_lcl, @rate_validity, @rate_notes,
              @agent_company, @origin_country, @origin_port_code, @dest_port_code,
              @rate_currency, @rate_20gp, @rate_40hc,
              @consignee_contact, @consignee_email, @consignee_phone,
              @sender_designation, @sender_email, @sender_phone,
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
  rate_notes?:           string | null
  agent_company?:        string | null
  origin_country?:       string | null
  origin_port_code?:     string | null
  dest_port_code?:       string | null
  rate_currency?:        string | null
  rate_20gp?:            string | null
  rate_40hc?:            string | null
  consignee_contact?:    string | null
  consignee_email?:      string | null
  consignee_phone?:      string | null
  sender_designation?:   string | null
  sender_email?:         string | null
  sender_phone?:         string | null
}
