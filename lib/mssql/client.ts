import sql from "mssql"

type CompanyKey = "manilal" | "links"

function makeConfig(company: CompanyKey): sql.config {
  const prefix = company === "links" ? "LINKS" : "MANILAL"
  return {
    server: process.env[`MSSQL_${prefix}_HOST`]!,
    port: parseInt(process.env[`MSSQL_${prefix}_PORT`] ?? "1433"),
    user: process.env[`MSSQL_${prefix}_USER`]!,
    password: process.env[`MSSQL_${prefix}_PASSWORD`]!,
    database: process.env[`MSSQL_${prefix}_DATABASE`]!,
    options: {
      encrypt: false, // MSSQL 2008 R2 — TLS not required
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  }
}

// Singleton pools — survive Next.js hot-reload in dev via global
declare global {
  // eslint-disable-next-line no-var
  var __mssqlPools: Partial<Record<CompanyKey, sql.ConnectionPool>> | undefined
}
if (!global.__mssqlPools) global.__mssqlPools = {}

// Idempotent, additive-only schema patches so a deploy never races a manual migration.
// Mirrors scripts/add-enquiry-due-date.sql.
const SCHEMA_PATCHES = [
  `IF COL_LENGTH('dbo.TBL_ADMIN_SALESENQUIRY', 'DUE_DATE') IS NULL
     ALTER TABLE [dbo].[TBL_ADMIN_SALESENQUIRY] ADD DUE_DATE DATETIME NULL`,
]

async function ensureSchema(pool: sql.ConnectionPool) {
  for (const patch of SCHEMA_PATCHES) {
    try {
      await pool.request().batch(patch)
    } catch (err) {
      console.warn("[mssql] schema patch skipped:", err instanceof Error ? err.message : err)
    }
  }
}

export async function getPool(company: string): Promise<sql.ConnectionPool> {
  const key: CompanyKey = company === "links" ? "links" : "manilal"
  const pools = global.__mssqlPools!

  if (!pools[key] || !pools[key]!.connected) {
    const pool = new sql.ConnectionPool(makeConfig(key))
    await pool.connect()
    await ensureSchema(pool)
    pools[key] = pool
  }

  return pools[key]!
}

export { sql }
