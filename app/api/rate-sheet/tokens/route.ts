import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"
import { randomBytes } from "crypto"

function generateToken(company: string): string {
  const prefix = company === "links" ? "lk" : "mp"
  const random = randomBytes(10).toString("hex") // 20 hex chars
  return `${prefix}_${random}`
}

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const pool = await getPool(auth.company)
  const result = await pool.request().query(`
    SELECT t.TOKEN_ID, t.TOKEN, t.COMPANY, t.DEST_ID, t.CLIENT_NAME, t.CLIENT_EMAIL,
           t.CREATED_BY, t.CREATED_AT, t.LAST_VIEWED, t.ACTIVE,
           d.DEST_NAME, d.PORT_NAME
    FROM [dbo].[TBL_RATE_SHEET_TOKENS] t
    JOIN [dbo].[TBL_RATE_SHEET_DESTINATIONS] d ON d.DEST_ID = t.DEST_ID
    ORDER BY t.CREATED_AT DESC
  `)
  return NextResponse.json(result.recordset)
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { dest_id, client_name, client_email } = body
  if (!dest_id) return NextResponse.json({ error: "dest_id required" }, { status: 400 })

  const token = generateToken(auth.company)
  const pool = await getPool(auth.company)

  const result = await pool.request()
    .input("token",        sql.NVarChar(100), token)
    .input("company",      sql.NVarChar(20),  auth.company)
    .input("dest_id",      sql.Int,           dest_id)
    .input("client_name",  sql.NVarChar(200), client_name?.trim() ?? null)
    .input("client_email", sql.NVarChar(200), client_email?.trim() ?? null)
    .input("created_by",   sql.NVarChar(200), auth.email)
    .query(`
      INSERT INTO [dbo].[TBL_RATE_SHEET_TOKENS]
        (TOKEN, COMPANY, DEST_ID, CLIENT_NAME, CLIENT_EMAIL, CREATED_BY)
      OUTPUT INSERTED.TOKEN_ID
      VALUES (@token, @company, @dest_id, @client_name, @client_email, @created_by)
    `)
  return NextResponse.json({ token_id: result.recordset[0].TOKEN_ID, token }, { status: 201 })
}
