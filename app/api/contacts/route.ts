import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import sql from "mssql"

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

// Auto-create TBL_CONTACTS — split into separate queries for MSSQL 2008 compatibility
async function ensureTable(pool: sql.ConnectionPool) {
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'TBL_CONTACTS'
    )
    BEGIN
      CREATE TABLE [dbo].[TBL_CONTACTS] (
        [ID]              int           IDENTITY(1,1) PRIMARY KEY,
        [SHIPPER_NAME]    varchar(200)  NULL,
        [CONSIGNEE_NAME]  varchar(200)  NULL,
        [MODE]            varchar(20)   NULL,
        [POL]             varchar(100)  NULL,
        [POD]             varchar(100)  NULL,
        [CONTACT_PERSON]  varchar(100)  NULL,
        [CONTACT_NUMBER]  varchar(50)   NULL,
        [EMAIL]           varchar(200)  NULL,
        [CREATED_BY]      varchar(200)  NULL,
        [CREATED_AT]      datetime      NOT NULL DEFAULT GETUTCDATE(),
        [UPDATED_AT]      datetime      NOT NULL DEFAULT GETUTCDATE()
      )
    END
  `)

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'TBL_CONTACT_FLAGS'
    )
    BEGIN
      CREATE TABLE [dbo].[TBL_CONTACT_FLAGS] (
        [CLIENT_NAME_LOWER]  varchar(400)  NOT NULL PRIMARY KEY,
        [IS_DEAD_LEAD]       bit           NOT NULL DEFAULT 0,
        [FLAGGED_BY]         varchar(200)  NULL,
        [UPDATED_AT]         datetime      NOT NULL DEFAULT GETUTCDATE()
      )
    END
  `)
}

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = auth.role === "admin"

  try {
    const pool = await getPool(auth.company)
    await ensureTable(pool)

    const request = pool.request()

    let contactsWhere    = ""
    let activitiesWhere  = "WHERE cv.CLIENT_NAME IS NOT NULL AND cv.CLIENT_NAME != ''"
    let activitiesNotIn  = `
      SELECT LOWER(RTRIM(LTRIM(ISNULL(SHIPPER_NAME, ''))))
      FROM [dbo].[TBL_CONTACTS]
      WHERE SHIPPER_NAME IS NOT NULL AND SHIPPER_NAME != ''
    `

    if (!isAdmin) {
      // TBL_CONTACTS.CREATED_BY was historically stored as email.
      // Match on BOTH email and userId to cover any format variation.
      request.input("userEmail", auth.email)
      request.input("userId",    auth.userId)

      contactsWhere = `
        WHERE (c.CREATED_BY = @userEmail OR c.CREATED_BY = @userId)
      `
      activitiesWhere = `
        WHERE cv.CLIENT_NAME IS NOT NULL AND cv.CLIENT_NAME != ''
          AND cv.CREATED_BY = @userId
      `
      activitiesNotIn = `
        SELECT LOWER(RTRIM(LTRIM(ISNULL(SHIPPER_NAME, ''))))
        FROM [dbo].[TBL_CONTACTS]
        WHERE SHIPPER_NAME IS NOT NULL AND SHIPPER_NAME != ''
          AND (CREATED_BY = @userEmail OR CREATED_BY = @userId)
      `
    }

    const result = await request.query(`
      SELECT *
      FROM (

        -- ── Part 1: contacts saved via Excel import ──────────────
        -- Deduplicate via ROW_NUMBER: if the same shipper was uploaded more than
        -- once (e.g. same sheet re-imported), only keep the latest row.
        SELECT
          'c_' + CAST(c.ID AS varchar(20))            AS id,
          ISNULL(c.SHIPPER_NAME,   '')                 AS shipper_name,
          ISNULL(c.CONSIGNEE_NAME, '')                 AS consignee_name,
          ISNULL(c.[MODE],         '')                 AS mode,
          ISNULL(c.POL,            '')                 AS pol,
          ISNULL(c.POD,            '')                 AS pod,
          ISNULL(c.CONTACT_PERSON, '')                 AS contact_person,
          ISNULL(c.CONTACT_NUMBER, '')                 AS contact_number,
          ISNULL(c.EMAIL,          '')                 AS email,
          'contact'                                    AS source,
          ISNULL(a.cnt, 0)                             AS activity_count,
          a.last_date                                  AS last_activity_date,
          ISNULL(c.CREATED_BY, '')                     AS created_by,
          CONVERT(varchar(10), c.CREATED_AT, 120)      AS created_at,
          ISNULL(f.IS_DEAD_LEAD, 0)                    AS is_dead_lead,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(RTRIM(LTRIM(ISNULL(c.SHIPPER_NAME,'')))),
                         ISNULL(c.CREATED_BY,'')
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
        ) a ON LOWER(RTRIM(LTRIM(c.SHIPPER_NAME))) = a.cname
        LEFT JOIN [dbo].[TBL_CONTACT_FLAGS] f
          ON LOWER(RTRIM(LTRIM(c.SHIPPER_NAME))) = f.CLIENT_NAME_LOWER
        ${contactsWhere}

        UNION ALL

        -- ── Part 2: activity-tracker clients not yet in contacts ──
        SELECT
          'a_' + CAST(
            ROW_NUMBER() OVER (ORDER BY MAX(cv.CREATED_AT) DESC)
          AS varchar(20))                                  AS id,
          MAX(cv.CLIENT_NAME)                              AS shipper_name,
          ''                                               AS consignee_name,
          ISNULL(MAX(cv.[MODE]), '')                       AS mode,
          ISNULL(MAX(cv.POL),    '')                       AS pol,
          ISNULL(MAX(cv.POD),    '')                       AS pod,
          ISNULL(MAX(cv.CONTACT_PERSON), '')               AS contact_person,
          ISNULL(MAX(cv.CONTACT_NUMBER), '')               AS contact_number,
          ISNULL(MAX(cv.EMAIL),          '')               AS email,
          'activity'                                       AS source,
          COUNT(*)                                         AS activity_count,
          CONVERT(varchar(10), MAX(cv.ACTIVITY_DATE), 120) AS last_activity_date,
          ISNULL(MAX(cv.CREATED_BY), '')                   AS created_by,
          CONVERT(varchar(10), MIN(cv.CREATED_AT), 120)    AS created_at,
          ISNULL(MAX(f2.IS_DEAD_LEAD), 0)                  AS is_dead_lead,
          NULL                                             AS rn
        FROM [dbo].[TBL_CALLS_VISITS] cv
        LEFT JOIN [dbo].[TBL_CONTACT_FLAGS] f2
          ON LOWER(RTRIM(LTRIM(cv.CLIENT_NAME))) = f2.CLIENT_NAME_LOWER
        ${activitiesWhere}
          AND LOWER(RTRIM(LTRIM(cv.CLIENT_NAME))) NOT IN (
            ${activitiesNotIn}
          )
        GROUP BY LOWER(RTRIM(LTRIM(cv.CLIENT_NAME)))

      ) combined
      WHERE combined.rn IS NULL OR combined.rn = 1
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
    await ensureTable(pool)

    let inserted = 0
    let skipped  = 0

    for (const row of rows) {
      const shipperNorm = (row.shipper_name ?? "").trim().toLowerCase()
      if (!shipperNorm) { skipped++; continue }

      // ── Dedup: skip if same shipper name already exists for this user ──
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

      // ── Insert ────────────────────────────────────────────────────────
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
