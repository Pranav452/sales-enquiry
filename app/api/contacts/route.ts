import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import sql from "mssql"
import {
  ensureContactsTable, ensureContactsTableOnce, contactsCombinedSql, contactsPagedFrom,
  contactsCountsSql, contactsFilterWhere, escapeLike, readDeadFilter,
} from "@/lib/mssql/contacts"
import { pagedQuery, readPaging, readSearch } from "@/lib/mssql/paginate"

type ContactRow = {
  shipper_name:   string
  consignee_name: string
  mode:           string
  pol:            string
  pod:            string
  contact_person: string
  contact_number: string
  email:          string
}

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = auth.role === "admin"
  const params  = req.nextUrl.searchParams

  try {
    const pool = await getPool(auth.company)
    // DDL/existence checks run once per company per process (not per request).
    await ensureContactsTableOnce(pool, auth.company)

    const bindRole = (r: sql.Request) => {
      if (!isAdmin) {
        r.input("userEmail", auth.email)
        r.input("userId",    auth.userId)
      }
      return r
    }

    // ── Legacy mode (no `page`): full list as a bare array ──────────────────
    if (!params.has("page")) {
      const result = await bindRole(pool.request()).query(`
        SELECT * FROM (${contactsCombinedSql(isAdmin)}) combined
        ORDER BY is_dead_lead ASC, created_at DESC, id ASC
      `)
      return NextResponse.json(result.recordset)
    }

    // ── Paged mode: one statement returns the page, the filtered total and
    //    the whole-set header counts (computed before the filter). ──────────
    const { page, limit } = readPaging(params)
    const q    = readSearch(params)
    const dead = readDeadFilter(params.get("dead"))

    const request = bindRole(pool.request())
    if (q) request.input("q", `%${escapeLike(q.toLowerCase())}%`)

    const { rows, total } = await pagedQuery<Record<string, unknown>>(request, {
      select:  "x.*",
      from:    contactsPagedFrom(isAdmin),
      where:   contactsFilterWhere(dead, !!q),
      orderBy: "x.is_dead_lead ASC, x.created_at DESC, x.id ASC",
      page, limit,
    })

    let counts: { imported: number; activity: number; dead: number; active: number }
    if (rows.length) {
      const r0       = rows[0]
      const imported = Number(r0.__imported ?? 0)
      const activity = Number(r0.__activity ?? 0)
      const deadN    = Number(r0.__dead ?? 0)
      counts = { imported, activity, dead: deadN, active: imported + activity - deadN }
    } else {
      // Empty page (no match / past the end): counts need their own query.
      const c  = await bindRole(pool.request()).query(contactsCountsSql(isAdmin))
      const r0 = c.recordset[0] ?? {}
      const imported = Number(r0.imported ?? 0)
      const activity = Number(r0.activity ?? 0)
      const deadN    = Number(r0.dead ?? 0)
      counts = { imported, activity, dead: deadN, active: imported + activity - deadN }
    }

    const data = rows.map((r) => {
      const { __imported, __activity, __dead, ...rest } = r
      void __imported; void __activity; void __dead
      return rest
    })

    return NextResponse.json({ data, total, page, limit, counts })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[contacts GET]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const rows: ContactRow[] = Array.isArray(body) ? body : [body]

    if (!rows.length) {
      return NextResponse.json({ error: "No contacts provided" }, { status: 400 })
    }

    const pool = await getPool(auth.company)
    await ensureContactsTable(pool)

    let inserted = 0
    let skipped  = 0

    for (const row of rows) {
      const shipperNorm = (row.shipper_name ?? "").trim().toLowerCase()
      if (!shipperNorm) { skipped++; continue }

      // Skip if same shipper name already exists for this user (dedup on import)
      const existing = await pool.request()
        .input("sname",  shipperNorm)
        .input("owner1", auth.email)
        .input("owner2", auth.userId)
        .query(`
          SELECT TOP 1 ID FROM [dbo].[TBL_CONTACTS]
          WHERE LOWER(RTRIM(LTRIM(ISNULL(SHIPPER_NAME, '')))) = @sname
            AND (CREATED_BY = @owner1 OR CREATED_BY = @owner2)
        `)

      if (existing.recordset.length > 0) { skipped++; continue }

      await pool.request()
        .input("shipper_name",   (row.shipper_name   ?? "").slice(0, 200) || null)
        .input("consignee_name", (row.consignee_name ?? "").slice(0, 200) || null)
        .input("mode",           (row.mode           ?? "").slice(0, 20)  || null)
        .input("pol",            (row.pol            ?? "").slice(0, 100) || null)
        .input("pod",            (row.pod            ?? "").slice(0, 100) || null)
        .input("contact_person", (row.contact_person ?? "").slice(0, 100) || null)
        .input("contact_number", (row.contact_number ?? "").slice(0, 50)  || null)
        .input("email",          (row.email          ?? "").slice(0, 200) || null)
        .input("created_by",     auth.email)
        .query(`
          INSERT INTO [dbo].[TBL_CONTACTS]
            (SHIPPER_NAME, CONSIGNEE_NAME, [MODE], POL, POD,
             CONTACT_PERSON, CONTACT_NUMBER, EMAIL,
             CREATED_BY, CREATED_AT, UPDATED_AT)
          VALUES
            (@shipper_name, @consignee_name, @mode, @pol, @pod,
             @contact_person, @contact_number, @email,
             @created_by, GETUTCDATE(), GETUTCDATE())
        `)

      inserted++
    }

    return NextResponse.json({ inserted, skipped }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[contacts POST]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
