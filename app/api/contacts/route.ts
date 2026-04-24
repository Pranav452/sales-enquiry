import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"

type ContactRow = {
  shipper_name: string
  consignee_name: string
  mode: string
  pol: string
  pod: string
  contact_person: string
  contact_number: string
  email: string
}

const SELECT_COLS = `
  CAST(ID AS varchar(20))  AS id,
  SHIPPER_NAME             AS shipper_name,
  CONSIGNEE_NAME           AS consignee_name,
  MODE                     AS mode,
  POL                      AS pol,
  POD                      AS pod,
  CONTACT_PERSON           AS contact_person,
  CONTACT_NUMBER           AS contact_number,
  EMAIL                    AS email,
  CREATED_BY               AS created_by,
  CONVERT(varchar(10), CREATED_AT, 120) AS created_at
`

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pool = await getPool(auth.company)
  const result = await pool.request().query(`
    SELECT ${SELECT_COLS}
    FROM [dbo].[TBL_CONTACTS]
    ORDER BY CREATED_AT DESC
  `)

  return NextResponse.json(result.recordset)
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  // Accept either a single contact or an array (bulk from Excel import)
  const rows: ContactRow[] = Array.isArray(body) ? body : [body]

  if (!rows.length) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 })
  }

  const pool = await getPool(auth.company)
  const inserted: string[] = []

  for (const row of rows) {
    const r = pool.request()
      .input("shipper_name",   row.shipper_name?.slice(0, 200)   ?? null)
      .input("consignee_name", row.consignee_name?.slice(0, 200) ?? null)
      .input("mode",           row.mode?.slice(0, 20)            ?? null)
      .input("pol",            row.pol?.slice(0, 100)            ?? null)
      .input("pod",            row.pod?.slice(0, 100)            ?? null)
      .input("contact_person", row.contact_person?.slice(0, 100) ?? null)
      .input("contact_number", row.contact_number?.slice(0, 50)  ?? null)
      .input("email",          row.email?.slice(0, 200)          ?? null)
      .input("created_by",     auth.email)

    const res = await r.query(`
      INSERT INTO [dbo].[TBL_CONTACTS]
        (SHIPPER_NAME, CONSIGNEE_NAME, MODE, POL, POD,
         CONTACT_PERSON, CONTACT_NUMBER, EMAIL, CREATED_BY, CREATED_AT, UPDATED_AT)
      OUTPUT CAST(INSERTED.ID AS varchar(20)) AS id
      VALUES
        (@shipper_name, @consignee_name, @mode, @pol, @pod,
         @contact_person, @contact_number, @email, @created_by, GETUTCDATE(), GETUTCDATE())
    `)
    inserted.push(res.recordset[0].id)
  }

  return NextResponse.json({ inserted: inserted.length, ids: inserted }, { status: 201 })
}
