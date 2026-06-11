import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { ensureContactsTable } from "@/lib/mssql/contacts"

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

  try {
    const pool = await getPool(auth.company)
    await ensureContactsTable(pool)

    const request = pool.request()

    // ── Role-based WHERE fragments ───────────────────────────────────────────
    // TBL_CONTACTS.CREATED_BY was stored as email; match BOTH email + userId
    // to cover any format variation in older rows.
    // TBL_CALLS_VISITS.CREATED_BY stores the Supabase UUID.
    let part1Where       = ""   // appended after the JOINs in Part 1
    let part2WhereExtra  = ""   // appended inside Part 2 WHERE
    let part2NotInExtra  = ""   // extra condition inside the NOT IN sub-SELECT

    if (!isAdmin) {
      request.input("userEmail", auth.email)
      request.input("userId",    auth.userId)

      part1Where      = "AND (c.CREATED_BY = @userEmail OR c.CREATED_BY = @userId)"
      part2WhereExtra = "AND cv.CREATED_BY = @userId"
      part2NotInExtra = "AND (CREATED_BY = @userEmail OR CREATED_BY = @userId)"
    }

    // ── Main query ───────────────────────────────────────────────────────────
    // Part 1 is wrapped in a subquery so ROW_NUMBER can be filtered before
    // the UNION — avoids MSSQL 2008 issues with windowed cols in outer WHERE.
    const result = await request.query(`

      SELECT
        id, shipper_name, consignee_name, mode, pol, pod,
        contact_person, contact_number, email,
        source, activity_count, last_activity_date,
        created_by, created_at, is_dead_lead, stage
      FROM (

        -- ── Part 1: deduplicated Excel-imported contacts ──────────────────
        SELECT
          id, shipper_name, consignee_name, mode, pol, pod,
          contact_person, contact_number, email,
          source, activity_count, last_activity_date,
          created_by, created_at, is_dead_lead, stage
        FROM (
          SELECT
            'c_' + CAST(c.ID AS varchar(20))             AS id,
            ISNULL(c.SHIPPER_NAME,   '')                  AS shipper_name,
            ISNULL(c.CONSIGNEE_NAME, '')                  AS consignee_name,
            ISNULL(c.[MODE],         '')                  AS mode,
            ISNULL(c.POL,            '')                  AS pol,
            ISNULL(c.POD,            '')                  AS pod,
            ISNULL(c.CONTACT_PERSON, '')                  AS contact_person,
            ISNULL(c.CONTACT_NUMBER, '')                  AS contact_number,
            ISNULL(c.EMAIL,          '')                  AS email,
            'contact'                                     AS source,
            ISNULL(act.cnt, 0)                            AS activity_count,
            act.last_date                                 AS last_activity_date,
            ISNULL(c.CREATED_BY, '')                      AS created_by,
            CONVERT(varchar(10), c.CREATED_AT, 120)       AS created_at,
            ISNULL(f.IS_DEAD_LEAD, 0)                     AS is_dead_lead,
            ISNULL(c.STAGE, 'CONTACT')                    AS stage,
            ROW_NUMBER() OVER (
              PARTITION BY LOWER(RTRIM(LTRIM(ISNULL(c.SHIPPER_NAME, '')))),
                           ISNULL(c.CREATED_BY, '')
              ORDER BY c.ID DESC
            ) AS rn
          FROM [dbo].[TBL_CONTACTS] c
          LEFT JOIN (
            SELECT
              LOWER(RTRIM(LTRIM(CLIENT_NAME)))               AS cname,
              COUNT(*)                                       AS cnt,
              CONVERT(varchar(10), MAX(ACTIVITY_DATE), 120)  AS last_date
            FROM [dbo].[TBL_CALLS_VISITS]
            WHERE CLIENT_NAME IS NOT NULL AND CLIENT_NAME != ''
            GROUP BY LOWER(RTRIM(LTRIM(CLIENT_NAME)))
          ) act ON LOWER(RTRIM(LTRIM(c.SHIPPER_NAME))) = act.cname
          LEFT JOIN [dbo].[TBL_CONTACT_FLAGS] f
            ON LOWER(RTRIM(LTRIM(c.SHIPPER_NAME))) = f.CLIENT_NAME_LOWER
          WHERE c.SHIPPER_NAME IS NOT NULL AND c.SHIPPER_NAME != ''
            ${part1Where}
        ) deduped
        WHERE rn = 1

        UNION ALL

        -- ── Part 2: activity-tracker clients not in TBL_CONTACTS ─────────
        SELECT
          'a_' + CAST(
            ROW_NUMBER() OVER (ORDER BY MAX(cv.CREATED_AT) DESC)
          AS varchar(20))                                   AS id,
          MAX(cv.CLIENT_NAME)                               AS shipper_name,
          ''                                                AS consignee_name,
          ISNULL(MAX(cv.[MODE]), '')                        AS mode,
          ISNULL(MAX(cv.POL),    '')                        AS pol,
          ISNULL(MAX(cv.POD),    '')                        AS pod,
          ISNULL(MAX(cv.CONTACT_PERSON), '')                AS contact_person,
          ISNULL(MAX(cv.CONTACT_NUMBER), '')                AS contact_number,
          ISNULL(MAX(cv.EMAIL),          '')                AS email,
          'activity'                                        AS source,
          COUNT(*)                                          AS activity_count,
          CONVERT(varchar(10), MAX(cv.ACTIVITY_DATE), 120)  AS last_activity_date,
          ISNULL(MAX(cv.CREATED_BY), '')                    AS created_by,
          CONVERT(varchar(10), MIN(cv.CREATED_AT), 120)     AS created_at,
          ISNULL(MAX(CAST(f2.IS_DEAD_LEAD AS tinyint)), 0)    AS is_dead_lead,
          'CONTACT'                                         AS stage
        FROM [dbo].[TBL_CALLS_VISITS] cv
        LEFT JOIN [dbo].[TBL_CONTACT_FLAGS] f2
          ON LOWER(RTRIM(LTRIM(cv.CLIENT_NAME))) = f2.CLIENT_NAME_LOWER
        WHERE cv.CLIENT_NAME IS NOT NULL AND cv.CLIENT_NAME != ''
          ${part2WhereExtra}
          AND LOWER(RTRIM(LTRIM(cv.CLIENT_NAME))) NOT IN (
            SELECT LOWER(RTRIM(LTRIM(ISNULL(SHIPPER_NAME, ''))))
            FROM [dbo].[TBL_CONTACTS]
            WHERE SHIPPER_NAME IS NOT NULL AND SHIPPER_NAME != ''
              ${part2NotInExtra}
          )
        GROUP BY LOWER(RTRIM(LTRIM(cv.CLIENT_NAME)))

      ) combined
      ORDER BY is_dead_lead ASC, created_at DESC
    `)

    return NextResponse.json(result.recordset)
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
