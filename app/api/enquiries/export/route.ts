import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"
import { SALESPERSON_CODE_MAP } from "@/lib/constants/dropdowns"

const SELECT_COLS = `
  CAST(PK_ID AS varchar(20))       AS id,
  ENQREFNO                         AS enq_ref_no,
  ENQRECPTDT                       AS enq_receipt_date,
  ENQTYPE                          AS enq_type,
  MODE                             AS mode,
  EXIM                             AS exim,
  FN                               AS fn,
  SALESPERSON                      AS sales_person,
  AGENT_NAME                       AS agent_name,
  COUNTRY_CODE                     AS country,
  BRANCH                           AS branch,
  NETWORK                          AS network,
  POL                              AS pol,
  POD                              AS pod,
  INCOTERM                         AS incoterms,
  DIMENSION                        AS container_type,
  STATUS                           AS status,
  EMAIL_SUBJECT                    AS email_subject_line,
  SHIPPER                          AS shipper,
  CONSIGNEE                        AS consignee,
  REMARK                           AS remarks,
  MBL_AWB_NO                       AS mbl_awb_no,
  JOB_INVOICE_NO                   AS job_invoice_no,
  GOP                              AS gop,
  ASSIGNED_USER                    AS assigned_user,
  CONVERT(varchar(10), ASSIGNED_DATE, 120) AS assigned_date
`

// GET /api/enquiries/export
// Query params: date_from, date_to, sales_person, mode, exim, branch, status, enq_type
export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const dateFrom    = sp.get("date_from")   // YYYY-MM-DD
  const dateTo      = sp.get("date_to")     // YYYY-MM-DD
  const salesPerson = sp.get("sales_person")
  const mode        = sp.get("mode")
  const exim        = sp.get("exim")
  const branch      = sp.get("branch")
  const status      = sp.get("status")
  const enqType     = sp.get("enq_type")

  try {
    const pool = await getPool(auth.company)
    const request = pool.request()

    const conditions: string[] = []

    // Role-based scoping
    if (auth.role !== "admin") {
      request.input("created_by", sql.VarChar(100), auth.userId)
      request.input("salesperson_me", sql.VarChar(100), auth.salesperson ?? "")

      const oldCodes = Object.entries(SALESPERSON_CODE_MAP)
        .filter(([, name]) => name === auth.salesperson)
        .map(([code]) => code)

      if (oldCodes.length > 0) {
        oldCodes.forEach((code, i) => request.input(`sp_code${i}`, sql.VarChar(20), code))
        const placeholders = oldCodes.map((_, i) => `@sp_code${i}`).join(", ")
        conditions.push(
          `(CREATED_BY = @created_by OR SALESPERSON = @salesperson_me OR SALESPERSON IN (${placeholders}))`
        )
      } else {
        conditions.push("(CREATED_BY = @created_by OR SALESPERSON = @salesperson_me)")
      }
    }

    if (dateFrom) {
      request.input("date_from", dateFrom)
      conditions.push("ENQRECPTDT >= @date_from")
    }
    if (dateTo) {
      request.input("date_to", dateTo)
      conditions.push("ENQRECPTDT <= @date_to")
    }
    if (salesPerson) {
      request.input("sales_person", sql.VarChar(15), salesPerson)
      conditions.push("SALESPERSON = @sales_person")
    }
    if (mode) {
      request.input("mode", sql.VarChar(10), mode)
      conditions.push("MODE = @mode")
    }
    if (exim) {
      request.input("exim", sql.VarChar(10), exim)
      conditions.push("EXIM = @exim")
    }
    if (branch) {
      request.input("branch", sql.VarChar(10), branch)
      conditions.push("BRANCH = @branch")
    }
    if (status) {
      request.input("status", sql.VarChar(25), status)
      conditions.push("STATUS = @status")
    }
    if (enqType) {
      request.input("enq_type", sql.VarChar(10), enqType)
      conditions.push("ENQTYPE = @enq_type")
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

    const result = await request.query(`
      SELECT ${SELECT_COLS}
      FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
      ${where}
      ORDER BY PK_ID DESC
    `)

    // Resolve salesperson codes → display names
    const rows = result.recordset.map((r) => ({
      ...r,
      sales_person: SALESPERSON_CODE_MAP[r.sales_person] ?? r.sales_person,
    }))

    return NextResponse.json(rows)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
