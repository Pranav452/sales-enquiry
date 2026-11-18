import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { insertEnquiry, type EnquiryPayload } from "@/lib/mssql/insert-enquiry"
import { enquiryVisibilityCondition } from "@/lib/mssql/enquiry-access"
import { pagedQuery, readPaging, readSearch } from "@/lib/mssql/paginate"
import { SALESPERSON_CODE_MAP } from "@/lib/constants/dropdowns"

// ─── Column map (app field → MSSQL column) ───────────────────
// ENQRECPTDT is varchar(10) — store as 'YYYY-MM-DD' string
// POL / POD   are varchar(3) — IATA codes (3 chars max)
// SALESPERSON is varchar(15)
// REMARK      is varchar(200)

const SELECT_COLS = `
  CAST(PK_ID AS varchar(20))  AS id,
  ENQREFNO                    AS enq_ref_no,
  ENQRECPTDT                  AS enq_receipt_date,
  ENQTYPE                     AS enq_type,
  MODE                        AS mode,
  EXIM                        AS exim,
  FN                          AS fn,
  SALESPERSON                 AS sales_person,
  AGENT_NAME                  AS agent_name,
  COUNTRY_CODE                AS country,
  BRANCH                      AS branch,
  NETWORK                     AS network,
  POL                         AS pol,
  POD                         AS pod,
  INCOTERM                    AS incoterms,
  DIMENSION                   AS container_type,
  STATUS                      AS status,
  EMAIL_SUBJECT               AS email_subject_line,
  SHIPPER                     AS shipper,
  CONSIGNEE                   AS consignee,
  REMARK                      AS remarks,
  MBL_AWB_NO                  AS mbl_awb_no,
  JOB_INVOICE_NO              AS job_invoice_no,
  GOP                         AS gop,
  ASSIGNED_USER               AS assigned_user,
  CONVERT(varchar(10), ASSIGNED_DATE, 120) AS assigned_date,
  BUY_RATE_FILE               AS buy_rate_file,
  SELL_RATE_FILE              AS sell_rate_file,
  CAST(CONTACT_ID AS varchar(20)) AS contact_id,
  CAST(LEAD_ID AS varchar(20))    AS lead_id
`

// Derived quotation state for an enquiry row. Resolved in a single
// OUTER APPLY (latest quotation) plus one correlated count — no N+1.
// 'NOT_PREPARED' is not a stored status: it means no quotation row
// exists for this enquiry yet.
const QUOTATION_COLS = `
  ISNULL(q.QUOT_STATUS, 'NOT_PREPARED') AS quotation_status,
  q.quot_id                             AS quotation_id,
  q.QUOT_REF_NO                         AS quotation_ref_no,
  (SELECT COUNT(*) FROM [dbo].[TBL_QUOTATIONS] qc WHERE qc.ENQ_ID = e.PK_ID) AS quotation_count
`

// Output column named QUOT_STATUS (not STATUS) — the enquiry table has its
// own unqualified STATUS in SELECT_COLS, and an unqualified "STATUS" here
// would be ambiguous once both are in scope (SQL Server error 209).
const QUOTATION_APPLY = `
  OUTER APPLY (
    SELECT TOP 1
      CAST(qq.QUOT_ID AS varchar(20)) AS quot_id,
      qq.QUOT_REF_NO,
      ISNULL(qq.STATUS, 'DRAFT')      AS QUOT_STATUS
    FROM [dbo].[TBL_QUOTATIONS] qq
    WHERE qq.ENQ_ID = e.PK_ID
    ORDER BY qq.QUOT_ID DESC
  ) q
`

// ─── GET /api/enquiries ───────────────────────────────────────
export async function GET(_req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const pool = await getPool(auth.company)
    const req = pool.request()

    const sp = _req.nextUrl.searchParams
    const mine = sp.get("mine") === "true"
    const conds: string[] = []
    if (mine) {
      // Recent tab — only rows this user created in the new system
      req.input("created_by", auth.userId)
      conds.push("e.CREATED_BY = @created_by")
    } else {
      // Shared with the link-enquiry suggestion search — see lib/mssql/enquiry-access
      const cond = enquiryVisibilityCondition(req, auth, "e.")
      if (cond) conds.push(`(${cond})`)
    }

    const paged = sp.has("page")
    const q = paged ? readSearch(sp) : null
    if (q) {
      req.input("q", q.replace(/[\[%_]/g, "[$&]")) // escape LIKE wildcards
      const searchCols = [
        "e.ENQREFNO", "e.SHIPPER", "e.CONSIGNEE", "e.POL", "e.POD", "e.SALESPERSON",
        "e.BRANCH", "e.STATUS", "e.REMARK", "e.EMAIL_SUBJECT", "e.AGENT_NAME",
      ]
      const parts = searchCols.map((c) => `${c} LIKE '%' + @q + '%'`)
      // Sales person is displayed by name but stored as a legacy code for old rows.
      const ql = q.toLowerCase()
      const codes = Object.entries(SALESPERSON_CODE_MAP)
        .filter(([, name]) => name.toLowerCase().includes(ql))
        .map(([code]) => code)
      if (codes.length) {
        const names = codes.map((c, i) => {
          req.input(`sp${i}`, c)
          return `@sp${i}`
        })
        parts.push(`e.SALESPERSON IN (${names.join(", ")})`)
      }
      conds.push(`(${parts.join(" OR ")})`)
    }
    const where = conds.join(" AND ")

    if (paged) {
      const { page, limit } = readPaging(sp)
      const { rows, total } = await pagedQuery(req, {
        select: `${SELECT_COLS}, ${QUOTATION_COLS}`,
        from: `[dbo].[TBL_ADMIN_SALESENQUIRY] e ${QUOTATION_APPLY}`,
        where: where || undefined,
        orderBy: "e.PK_ID DESC",
        page,
        limit,
      })
      return NextResponse.json({ data: rows, total, page, limit })
    }

    const result = await req.query(`
      SELECT ${SELECT_COLS},
      ${QUOTATION_COLS}
      FROM [dbo].[TBL_ADMIN_SALESENQUIRY] e
      ${QUOTATION_APPLY}
      ${where ? `WHERE ${where}` : ""}
      ORDER BY e.PK_ID DESC
    `)

    return NextResponse.json(result.recordset)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST /api/enquiries ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: EnquiryPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    const created = await insertEnquiry(auth.company, body, auth.userId)
    return NextResponse.json(created, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
