/**
 * One-off runner for scripts/add-quotation-display-currency.sql
 * Runs the migration against BOTH the manilal and links MSSQL databases.
 *
 *   node scripts/run-display-currency-migration.cjs
 *
 * The mssql Node driver doesn't understand `GO`, so we split the .sql on
 * GO boundaries and run each batch separately.
 */
const fs = require("fs")
const path = require("path")
const sql = require("mssql")

// ── Load .env.local (no dotenv dependency) ──────────────────────
const envPath = path.join(__dirname, "..", ".env.local")
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!m) continue
  let val = m[2].trim()
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1)
  }
  if (process.env[m[1]] === undefined) process.env[m[1]] = val
}

const migrationPath = path.join(__dirname, "add-quotation-display-currency.sql")
const batches = fs
  .readFileSync(migrationPath, "utf8")
  .split(/^\s*GO\s*$/im)
  .map((b) => b.trim())
  .filter(Boolean)

function makeConfig(prefix) {
  return {
    server: process.env[`MSSQL_${prefix}_HOST`],
    port: parseInt(process.env[`MSSQL_${prefix}_PORT`] || "1433"),
    user: process.env[`MSSQL_${prefix}_USER`],
    password: process.env[`MSSQL_${prefix}_PASSWORD`],
    database: process.env[`MSSQL_${prefix}_DATABASE`],
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
    connectionTimeout: 30000,
    requestTimeout: 60000,
  }
}

async function runFor(label, prefix) {
  console.log(`\n=== ${label} (${process.env[`MSSQL_${prefix}_HOST`]}/${process.env[`MSSQL_${prefix}_DATABASE`]}) ===`)
  const pool = new sql.ConnectionPool(makeConfig(prefix))
  await pool.connect()
  try {
    for (let i = 0; i < batches.length; i++) {
      await pool.request().batch(batches[i])
      console.log(`  batch ${i + 1}/${batches.length} ok`)
    }

    // Verify columns exist
    const cols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TBL_QUOTATIONS'
        AND COLUMN_NAME IN ('DISPLAY_CURRENCY','TOTAL_DISPLAY')
      ORDER BY COLUMN_NAME
    `)
    console.log("  columns:", cols.recordset)

    const counts = await pool.request().query(`
      SELECT
        COUNT(*) AS total_rows,
        SUM(CASE WHEN DISPLAY_CURRENCY IS NOT NULL THEN 1 ELSE 0 END) AS with_currency,
        SUM(CASE WHEN TOTAL_DISPLAY  IS NOT NULL THEN 1 ELSE 0 END) AS with_total
      FROM [dbo].[TBL_QUOTATIONS]
    `)
    console.log("  backfill:", counts.recordset[0])
  } finally {
    await pool.close()
  }
}

;(async () => {
  try {
    console.log(`Loaded ${batches.length} SQL batches from add-quotation-display-currency.sql`)
    await runFor("MANILAL", "MANILAL")
    await runFor("LINKS", "LINKS")
    console.log("\n✅ Migration complete on both databases.")
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message)
    process.exitCode = 1
  }
})()
