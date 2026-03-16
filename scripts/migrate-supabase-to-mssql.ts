/**
 * One-time migration script: Supabase enquiries → MSSQL TBL_ADMIN_SALESENQUIRY
 *
 * Usage:
 *   npx tsx scripts/migrate-supabase-to-mssql.ts --company=links
 *   npx tsx scripts/migrate-supabase-to-mssql.ts --company=manilal
 */

import * as dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
import sql from "mssql"
import * as readline from "readline"

dotenv.config({ path: ".env.local" })

// ─── Config ──────────────────────────────────────────────────

const company = process.argv.find((a) => a.startsWith("--company="))?.split("=")[1] ?? "manilal"
if (!["manilal", "links"].includes(company)) {
  console.error("--company must be 'manilal' or 'links'")
  process.exit(1)
}

const prefix = company === "links" ? "LINKS" : "MANILAL"

const mssqlConfig: sql.config = {
  server:   process.env[`MSSQL_${prefix}_HOST`]!,
  port:     parseInt(process.env[`MSSQL_${prefix}_PORT`] ?? "1433"),
  user:     process.env[`MSSQL_${prefix}_USER`]!,
  password: process.env[`MSSQL_${prefix}_PASSWORD`]!,
  database: process.env[`MSSQL_${prefix}_DATABASE`]!,
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  connectionTimeout: 30000,
  requestTimeout: 60000,
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Helpers ─────────────────────────────────────────────────

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => { rl.question(question, (a) => { rl.close(); resolve(a) }) })
}

function trunc(val: string | null | undefined, max: number): string | null {
  if (!val) return null
  return val.length > max ? val.substring(0, max) : val
}

function toDate(val: string | null | undefined): Date | null {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function toDateStr(val: string | null | undefined): string | null {
  if (!val) return null
  // ENQRECPTDT is varchar(10) — store as YYYY-MM-DD
  return val.split("T")[0]
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`\nMigration target: ${company.toUpperCase()} (${process.env[`MSSQL_${prefix}_DATABASE`]})`)
  console.log("Fetching all enquiries from Supabase...\n")

  const { data: rows, error: fetchErr } = await supabase
    .from("enquiries")
    .select("*")
    .order("created_at", { ascending: true })

  if (fetchErr) { console.error("Supabase fetch failed:", fetchErr.message); process.exit(1) }
  console.log(`Found ${rows?.length ?? 0} enquiries in Supabase.`)
  if (!rows?.length) { console.log("Nothing to migrate."); return }

  const answer = await ask(
    `\nAbout to INSERT ${rows.length} rows into ${process.env[`MSSQL_${prefix}_DATABASE`]}.dbo.TBL_ADMIN_SALESENQUIRY.\n` +
    `Rows where ENQREFNO already exists will be skipped.\nProceed? (yes/no): `
  )
  if (answer.trim().toLowerCase() !== "yes") { console.log("Aborted."); return }

  console.log("\nConnecting to MSSQL...")
  const pool = await new sql.ConnectionPool(mssqlConfig).connect()
  console.log("Connected.\n")

  // Fetch existing ref nos to skip duplicates
  const existingResult = await pool.request().query<{ ENQREFNO: string }>(
    "SELECT ENQREFNO FROM [dbo].[TBL_ADMIN_SALESENQUIRY] WHERE ENQREFNO IS NOT NULL"
  )
  const existingRefNos = new Set(existingResult.recordset.map((r) => r.ENQREFNO))
  console.log(`${existingRefNos.size} existing ref nos in MSSQL — these will be skipped.\n`)

  let inserted = 0, skipped = 0, failed = 0

  for (const row of rows) {
    const refNo = row.enq_ref_no as string | null

    if (refNo && existingRefNos.has(refNo)) { skipped++; continue }

    try {
      await pool
        .request()
        // ENQREFNO varchar(15)
        .input("enqrefno",       sql.VarChar(15),  trunc(refNo, 15))
        // ENQRECPTDT varchar(10) — store as YYYY-MM-DD string
        .input("enqrecptdt",     sql.VarChar(10),  toDateStr(row.enq_receipt_date))
        .input("mode",           sql.VarChar(10),  trunc(row.mode, 10))
        .input("enqtype",        sql.VarChar(10),  trunc(row.enq_type, 10))
        .input("exim",           sql.VarChar(10),  trunc(row.exim, 10))
        .input("fn",             sql.VarChar(20),  trunc(row.fn, 20))
        // SALESPERSON varchar(15)
        .input("salesperson",    sql.VarChar(15),  trunc(row.sales_person, 15))
        .input("agent_name",     sql.VarChar(100), trunc(row.agent_name, 100))
        // COUNTRY_CODE varchar(15)
        .input("country_code",   sql.VarChar(15),  trunc(row.country, 15))
        .input("branch",         sql.VarChar(10),  trunc(row.branch, 10))
        .input("network",        sql.VarChar(25),  trunc(row.network, 25))
        // POL/POD varchar(3) — IATA codes
        .input("pol",            sql.VarChar(3),   trunc(row.pol, 3))
        .input("pod",            sql.VarChar(3),   trunc(row.pod, 3))
        // INCOTERM varchar(10)
        .input("incoterm",       sql.VarChar(10),  trunc(row.incoterms, 10))
        // DIMENSION varchar(20) = container_type
        .input("dimension",      sql.VarChar(20),  trunc(row.container_type, 20))
        .input("status",         sql.VarChar(25),  trunc(row.status, 25))
        // EMAIL_SUBJECT varchar(200) = email_subject_line
        .input("email_subject",  sql.VarChar(200), trunc(row.email_subject_line, 200))
        .input("shipper",        sql.VarChar(100), trunc(row.shipper, 100))
        .input("consignee",      sql.VarChar(100), trunc(row.consignee, 100))
        // REMARK varchar(200)
        .input("remark",         sql.VarChar(200), trunc(row.remarks, 200))
        .input("mbl_awb_no",     sql.VarChar(50),  trunc(row.mbl_awb_no, 50))
        .input("job_invoice_no", sql.VarChar(50),  trunc(row.job_invoice_no, 50))
        .input("gop",            sql.VarChar(50),  trunc(row.gop, 50))
        .input("assigned_user",  sql.VarChar(100), trunc(row.assigned_user, 100))
        .input("assigned_date",  sql.DateTime,     toDate(row.assigned_date))
        .input("buy_rate_file",  sql.VarChar(500), trunc(row.buy_rate_file, 500))
        .input("sell_rate_file", sql.VarChar(500), trunc(row.sell_rate_file, 500))
        .input("created_by",     sql.VarChar(100), trunc(row.created_by, 100))
        // MAKERDT = created_at
        .input("makerdt",        sql.DateTime,     toDate(row.created_at) ?? new Date())
        .input("updated_at",     sql.DateTime,     toDate(row.updated_at) ?? new Date())
        .query(`
          INSERT INTO [dbo].[TBL_ADMIN_SALESENQUIRY] (
            ENQREFNO, ENQRECPTDT, MODE, ENQTYPE, EXIM, FN,
            SALESPERSON, AGENT_NAME, COUNTRY_CODE, BRANCH, NETWORK,
            POL, POD, INCOTERM, DIMENSION, STATUS, EMAIL_SUBJECT,
            SHIPPER, CONSIGNEE, REMARK, MBL_AWB_NO, JOB_INVOICE_NO, GOP,
            ASSIGNED_USER, ASSIGNED_DATE, BUY_RATE_FILE, SELL_RATE_FILE,
            CREATED_BY, MAKERDT, UPDATED_AT
          )
          VALUES (
            @enqrefno, @enqrecptdt, @mode, @enqtype, @exim, @fn,
            @salesperson, @agent_name, @country_code, @branch, @network,
            @pol, @pod, @incoterm, @dimension, @status, @email_subject,
            @shipper, @consignee, @remark, @mbl_awb_no, @job_invoice_no, @gop,
            @assigned_user, @assigned_date, @buy_rate_file, @sell_rate_file,
            @created_by, @makerdt, @updated_at
          )
        `)

      inserted++
      if (inserted % 50 === 0) process.stdout.write(`\r  Inserted ${inserted}...`)
    } catch (err: unknown) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`\n  FAILED row (ref: ${refNo ?? "null"}): ${msg}`)
    }
  }

  await pool.close()

  console.log("\n\n─── Migration complete ───────────────────────────────")
  console.log(`  Inserted : ${inserted}`)
  console.log(`  Skipped  : ${skipped} (already existed)`)
  console.log(`  Failed   : ${failed}`)
  console.log("─────────────────────────────────────────────────────\n")
}

main().catch((err) => { console.error("Unhandled error:", err); process.exit(1) })
