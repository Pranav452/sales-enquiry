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

const SELECT_COLS = `
  CAST(ID AS varchar(20))               AS id,
  ISNULL(SHIPPER_NAME,   '')            AS shipper_name,
  ISNULL(CONSIGNEE_NAME, '')            AS consignee_name,
  ISNULL([MODE],         '')            AS mode,
  ISNULL(POL,            '')            AS pol,
  ISNULL(POD,            '')            AS pod,
  ISNULL(CONTACT_PERSON, '')            AS contact_person,
  ISNULL(CONTACT_NUMBER, '')            AS contact_number,
  ISNULL(EMAIL,          '')            AS email,
  ISNULL(CREATED_BY,     '')            AS created_by,
  CONVERT(varchar(10), CREATED_AT, 120) AS created_at
`

// Auto-create TBL_CONTACTS if it doesn't exist yet.
// This means no manual SQL migration is needed.
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
        [CREATED_BY]      varchar(100)  NULL,
        [CREATED_AT]      datetime      NOT NULL DEFAULT GETUTCDATE(),
        [UPDATED_AT]      datetime      NOT NULL DEFAULT GETUTCDATE()
      )
    END
  `)
}

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const pool = await getPool(auth.company)
    await ensureTable(pool)

    const result = await pool.request().query(`
      SELECT ${SELECT_COLS}
      FROM   [dbo].[TBL_CONTACTS]
      ORDER  BY CREATED_AT DESC
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

    const inserted: string[] = []

    for (const row of rows) {
      const r = pool.request()
        .input("shipper_name",   (row.shipper_name   ?? "").slice(0, 200) || null)
        .input("consignee_name", (row.consignee_name ?? "").slice(0, 200) || null)
        .input("mode",           (row.mode           ?? "").slice(0, 20)  || null)
        .input("pol",            (row.pol            ?? "").slice(0, 100) || null)
        .input("pod",            (row.pod            ?? "").slice(0, 100) || null)
        .input("contact_person", (row.contact_person ?? "").slice(0, 100) || null)
        .input("contact_number", (row.contact_number ?? "").slice(0, 50)  || null)
        .input("email",          (row.email          ?? "").slice(0, 200) || null)
        .input("created_by",     auth.email)

      const res = await r.query(`
        INSERT INTO [dbo].[TBL_CONTACTS]
          (SHIPPER_NAME, CONSIGNEE_NAME, [MODE], POL, POD,
           CONTACT_PERSON, CONTACT_NUMBER, EMAIL,
           CREATED_BY, CREATED_AT, UPDATED_AT)
        OUTPUT CAST(INSERTED.ID AS varchar(20)) AS id
        VALUES
          (@shipper_name, @consignee_name, @mode, @pol, @pod,
           @contact_person, @contact_number, @email,
           @created_by, GETUTCDATE(), GETUTCDATE())
      `)

      inserted.push(res.recordset[0]?.id ?? "")
    }

    return NextResponse.json({ inserted: inserted.length, ids: inserted }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[contacts POST]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
