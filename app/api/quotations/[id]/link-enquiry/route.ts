import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"
import { enquiryVisibilityCondition } from "@/lib/mssql/enquiry-access"

// ─── /api/quotations/[id]/link-enquiry ────────────────────────
// Attach an *existing* enquiry to a quotation that has none. Distinct from
// create-enquiry, which raises a brand-new enquiry — that one is wrong when
// the enquiry already exists (all 34 legacy quotations are in that boat).
// The quotation is never renumbered: its ref no is already with the customer.

// Candidate rows pulled from SQL (bounded), then scored in JS. ENQRECPTDT is
// varchar(10) 'YYYY-MM-DD', so plain string comparison is a date comparison.
interface CandidateRow {
  id: string
  enq_ref_no: string | null
  enq_receipt_date: string | null
  shipper: string | null
  pol: string | null
  pod: string | null
  sales_person: string | null
  mode: string | null
  status: string | null
  quotation_count: number
}

const CANDIDATE_COLS = `
  CAST(e.PK_ID AS varchar(20)) AS id,
  e.ENQREFNO    AS enq_ref_no,
  e.ENQRECPTDT  AS enq_receipt_date,
  e.SHIPPER     AS shipper,
  e.POL         AS pol,
  e.POD         AS pod,
  e.SALESPERSON AS sales_person,
  e.MODE        AS mode,
  e.STATUS      AS status,
  (SELECT COUNT(*) FROM [dbo].[TBL_QUOTATIONS] qc WHERE qc.ENQ_ID = e.PK_ID) AS quotation_count
`

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase()

/** Escape LIKE wildcards so user text is matched literally (used with ESCAPE '\'). */
function likeLiteral(v: string) {
  return v.replace(/[\\%_[\]]/g, (c) => `\\${c}`)
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function toIsoDate(v: unknown): string | null {
  if (!v) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

const DAYS_BEFORE = 30
const DAYS_AFTER = 7

interface Scored extends CandidateRow {
  score: number
  matched: string[]
}

/**
 * Scoring (max 100):
 *   shipper   exact 40 / substring either way 25
 *   POL       15
 *   POD       15
 *   sales person 10
 *   mode       5
 *   date       10 inside [-30d, +7d] of the quotation date,
 *              +5 tapering with closeness to the quotation date
 * Blank values on either side never match.
 */
function scoreCandidate(
  row: CandidateRow,
  quot: {
    shipper: string | null
    pol: string | null
    pod: string | null
    sales_person: string | null
    mode: string | null
    quot_date: string | null
  }
): Scored {
  let score = 0
  const matched: string[] = []

  const qShipper = norm(quot.shipper)
  const rShipper = norm(row.shipper)
  if (qShipper && rShipper) {
    if (qShipper === rShipper) {
      score += 40
      matched.push("shipper")
    } else if (qShipper.includes(rShipper) || rShipper.includes(qShipper)) {
      score += 25
      matched.push("shipper")
    }
  }

  const pairs: [keyof typeof quot, string | null, number, string][] = [
    ["pol", row.pol, 15, "pol"],
    ["pod", row.pod, 15, "pod"],
    ["sales_person", row.sales_person, 10, "sales_person"],
    ["mode", row.mode, 5, "mode"],
  ]
  for (const [key, rowVal, points, label] of pairs) {
    const a = norm(quot[key] as string | null)
    const b = norm(rowVal)
    if (a && b && a === b) {
      score += points
      matched.push(label)
    }
  }

  const qDate = quot.quot_date
  const rDate = row.enq_receipt_date
  if (qDate && rDate) {
    const diffDays = Math.round(
      (new Date(`${qDate}T00:00:00Z`).getTime() - new Date(`${rDate}T00:00:00Z`).getTime()) /
        86400000
    )
    // positive diff = enquiry received before the quotation (the normal case)
    if (diffDays >= -DAYS_AFTER && diffDays <= DAYS_BEFORE) {
      score += 10
      score += Math.round(5 * (1 - Math.min(Math.abs(diffDays), DAYS_BEFORE) / DAYS_BEFORE))
      matched.push("date")
    }
  }

  return { ...row, score, matched }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const quotId = parseInt(id, 10)
  if (isNaN(quotId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim()

  try {
    const pool = await getPool(auth.company)

    const quotResult = await pool.request()
      .input("quot_id", sql.Int, quotId)
      .query(`
        SELECT QUOT_ID, QUOT_REF_NO, QUOT_DATE, MODE, POL, POD, SHIPPER,
               SALES_PERSON, ENQ_ID, CREATED_BY
        FROM [dbo].[TBL_QUOTATIONS]
        WHERE QUOT_ID = @quot_id
      `)

    if (!quotResult.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const quot = quotResult.recordset[0]

    if (auth.role !== "admin" && quot.CREATED_BY !== (auth.salesperson ?? auth.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const quotDate = toIsoDate(quot.QUOT_DATE)

    const cand = pool.request()
    const visibility = enquiryVisibilityCondition(cand, auth, "e.")

    let rows: CandidateRow[]

    if (q) {
      // Manual lookup — free search on ref no / shipper.
      cand.input("q", sql.NVarChar, `%${likeLiteral(q)}%`)
      const where = [
        `(e.ENQREFNO LIKE @q ESCAPE '\\' OR e.SHIPPER LIKE @q ESCAPE '\\')`,
        visibility,
      ].filter(Boolean).join(" AND ")

      const res = await cand.query<CandidateRow>(`
        SELECT TOP 20 ${CANDIDATE_COLS}
        FROM [dbo].[TBL_ADMIN_SALESENQUIRY] e
        WHERE ${where}
        ORDER BY e.PK_ID DESC
      `)
      rows = res.recordset
    } else {
      // Suggestions — bounded candidate set: inside the date window, or a
      // shipper that looks like the quotation's.
      const filters: string[] = []

      if (quotDate) {
        cand.input("date_from", sql.NVarChar, addDays(quotDate, -DAYS_BEFORE))
        cand.input("date_to", sql.NVarChar, addDays(quotDate, DAYS_AFTER))
        filters.push(`(e.ENQRECPTDT BETWEEN @date_from AND @date_to)`)
      }

      const shipper = (quot.SHIPPER ?? "").trim()
      if (shipper) {
        cand.input("shipper", sql.NVarChar, `%${likeLiteral(shipper)}%`)
        filters.push(`(e.SHIPPER LIKE @shipper ESCAPE '\\')`)
      }

      const where = [
        filters.length ? `(${filters.join(" OR ")})` : null,
        visibility,
      ].filter(Boolean).join(" AND ")

      const res = await cand.query<CandidateRow>(`
        SELECT TOP 300 ${CANDIDATE_COLS}
        FROM [dbo].[TBL_ADMIN_SALESENQUIRY] e
        ${where ? `WHERE ${where}` : ""}
        ORDER BY e.PK_ID DESC
      `)
      rows = res.recordset
    }

    const scored = rows
      .map((r) =>
        scoreCandidate(
          { ...r, enq_receipt_date: toIsoDate(r.enq_receipt_date) },
          {
            shipper: quot.SHIPPER,
            pol: quot.POL,
            pod: quot.POD,
            sales_person: quot.SALES_PERSON,
            mode: quot.MODE,
            quot_date: quotDate,
          }
        )
      )
      .sort((a, b) => b.score - a.score || Number(b.id) - Number(a.id))

    return NextResponse.json({
      quot_ref_no: quot.QUOT_REF_NO ?? null,
      quot_date: quotDate,
      already_linked: quot.ENQ_ID != null,
      suggestions: q ? scored : scored.slice(0, 10),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const quotId = parseInt(id, 10)
  if (isNaN(quotId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  let body: { enq_id?: string | number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const enqId = parseInt(String(body.enq_id ?? ""), 10)
  if (isNaN(enqId)) return NextResponse.json({ error: "enq_id is required" }, { status: 400 })

  try {
    const pool = await getPool(auth.company)

    const quotResult = await pool.request()
      .input("quot_id", sql.Int, quotId)
      .query<{ QUOT_ID: number; QUOT_REF_NO: string | null; ENQ_ID: number | null; CREATED_BY: string | null }>(`
        SELECT QUOT_ID, QUOT_REF_NO, ENQ_ID, CREATED_BY
        FROM [dbo].[TBL_QUOTATIONS]
        WHERE QUOT_ID = @quot_id
      `)

    if (!quotResult.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const quot = quotResult.recordset[0]

    if (auth.role !== "admin" && quot.CREATED_BY !== (auth.salesperson ?? auth.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (quot.ENQ_ID) {
      return NextResponse.json(
        { error: "This quotation is already linked to an enquiry" },
        { status: 409 }
      )
    }

    // The enquiry must exist and be one this user is allowed to see.
    const enqReq = pool.request().input("enq_id", sql.Int, enqId)
    const visibility = enquiryVisibilityCondition(enqReq, auth, "e.")
    const enqResult = await enqReq.query<{ id: string; enq_ref_no: string | null }>(`
      SELECT CAST(e.PK_ID AS varchar(20)) AS id, e.ENQREFNO AS enq_ref_no
      FROM [dbo].[TBL_ADMIN_SALESENQUIRY] e
      WHERE e.PK_ID = @enq_id ${visibility ? `AND ${visibility}` : ""}
    `)

    if (!enqResult.recordset.length) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })
    }
    const enq = enqResult.recordset[0]

    // Guarded — never clobber a link another request just made.
    // The quotation keeps its existing ref no; no renumbering.
    const link = await pool.request()
      .input("quot_id", sql.Int, quotId)
      .input("enq", sql.Int, enqId)
      .query(`
        UPDATE [dbo].[TBL_QUOTATIONS]
        SET ENQ_ID = @enq, UPDATED_AT = GETDATE()
        WHERE QUOT_ID = @quot_id AND ENQ_ID IS NULL
      `)

    if (!link.rowsAffected[0]) {
      return NextResponse.json(
        { error: "This quotation is already linked to an enquiry" },
        { status: 409 }
      )
    }

    return NextResponse.json({
      ok: true,
      enq_id: enq.id,
      enq_ref_no: enq.enq_ref_no,
      quot_ref_no: quot.QUOT_REF_NO ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
