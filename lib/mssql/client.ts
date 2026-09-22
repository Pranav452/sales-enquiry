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
    // The production server is remote and often slow (single queries have
    // been measured at 5-10s under load), so a page that fires several API
    // calls at once can hold every pooled connection for a while. Give
    // queued requests time to get a slot before tarn gives up with
    // "operation timed out for an unknown reason".
    connectionTimeout: 30000,
    requestTimeout: 60000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
    },
  }
}

// Singleton pools — survive Next.js hot-reload in dev via global
declare global {
  // eslint-disable-next-line no-var
  var __mssqlPools: Partial<Record<CompanyKey, Promise<sql.ConnectionPool>>> | undefined
}
if (!global.__mssqlPools) global.__mssqlPools = {}

// The in-flight connect promise is what gets cached, so concurrent callers
// during a (slow) connect share one pool instead of each opening their own.
// A failed connect or a pool-level error drops the entry so the next call
// reconnects.
export function getPool(company: string): Promise<sql.ConnectionPool> {
  const key: CompanyKey = company === "links" ? "links" : "manilal"
  const pools = global.__mssqlPools!

  let p = pools[key]
  if (!p) {
    const pool = new sql.ConnectionPool(makeConfig(key))
    pool.on("error", () => {
      if (pools[key] === p) delete pools[key]
    })
    p = pool.connect().catch((err) => {
      if (pools[key] === p) delete pools[key]
      throw err
    })
    pools[key] = p
  }

  return p.then((pool) => {
    if (pool.connected) return pool
    if (pools[key] === p) delete pools[key]
    return getPool(company)
  })
}

/** Turn pool/driver timeouts into something a user can act on. */
export function friendlyDbError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/timed out|ETIMEOUT|Timeout/i.test(msg)) {
    return "The database server is responding slowly right now. Please wait a moment and try again."
  }
  return msg
}

export { sql }
