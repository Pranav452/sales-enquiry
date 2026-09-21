import sql from "mssql"

// LOST_REASON was added after go-live. The column is created on first use so a
// deploy never depends on someone running scripts/lost-reason-schema.sql first,
// and every caller degrades to "no lost reason" if the ALTER is not permitted —
// the core enquiry insert/update never references the column directly.

const ready = new WeakMap<sql.ConnectionPool, Promise<boolean>>()

export function ensureLostReasonColumn(pool: sql.ConnectionPool): Promise<boolean> {
  let p = ready.get(pool)
  if (!p) {
    p = pool
      .request()
      .query(`
        IF COL_LENGTH('dbo.TBL_ADMIN_SALESENQUIRY', 'LOST_REASON') IS NULL
          ALTER TABLE [dbo].[TBL_ADMIN_SALESENQUIRY] ADD [LOST_REASON] varchar(200) NULL
      `)
      .then(() => true)
      .catch(() => {
        ready.delete(pool)
        return false
      })
    ready.set(pool, p)
  }
  return p
}

/** SELECT fragment for the enquiry table — NULL when the column is unavailable. */
export async function lostReasonSelect(pool: sql.ConnectionPool, prefix = ""): Promise<string> {
  return (await ensureLostReasonColumn(pool)) ? `${prefix}LOST_REASON` : "CAST(NULL AS varchar(200))"
}

/** Persist the reason; cleared automatically whenever the status is not LOSE. */
export async function saveLostReason(
  pool: sql.ConnectionPool,
  pkId: number,
  status: string | null | undefined,
  reason: string | null | undefined
): Promise<void> {
  if (!(await ensureLostReasonColumn(pool))) return
  const isLost = (status ?? "").trim().toUpperCase() === "LOSE"
  const value = isLost ? (reason ?? "").trim().slice(0, 200) || null : null
  await pool
    .request()
    .input("pk_id", sql.Int, pkId)
    .input("lost_reason", value)
    .query(`UPDATE [dbo].[TBL_ADMIN_SALESENQUIRY] SET LOST_REASON = @lost_reason WHERE PK_ID = @pk_id`)
}
