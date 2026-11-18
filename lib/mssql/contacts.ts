import sql from "mssql"

// Per-process cache: the DDL/existence checks only need to run once per
// company pool. Keyed by company; a failed attempt is evicted so the next
// request retries.
const ensured = new Map<string, Promise<void>>()

export function ensureContactsTableOnce(pool: sql.ConnectionPool, company: string): Promise<void> {
  let p = ensured.get(company)
  if (!p) {
    p = ensureContactsTable(pool).catch((err) => {
      ensured.delete(company)
      throw err
    })
    ensured.set(company, p)
  }
  return p
}

// Split into separate .query() calls — MSSQL 2008 R2 can fail on multiple
// IF NOT EXISTS blocks in a single statement.
export async function ensureContactsTable(pool: sql.ConnectionPool) {
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
        [STAGE]           varchar(20)   NULL,
        [CREATED_BY]      varchar(200)  NULL,
        [CREATED_AT]      datetime      NOT NULL DEFAULT GETUTCDATE(),
        [UPDATED_AT]      datetime      NOT NULL DEFAULT GETUTCDATE()
      )
    END
  `)

  // STAGE added after initial rollout — migrate existing tables
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.TBL_CONTACTS') AND name = 'STAGE'
    )
    ALTER TABLE [dbo].[TBL_CONTACTS] ADD STAGE varchar(20) NULL
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

/**
 * The combined contacts list as a SELECT with no ORDER BY, usable as a
 * derived table. Columns: id, shipper_name, consignee_name, mode, pol, pod,
 * contact_person, contact_number, email, source, activity_count,
 * last_activity_date, created_by, created_at, is_dead_lead, stage.
 *
 * Part 1: TBL_CONTACTS deduplicated per (shipper name, owner), ids "c_<ID>".
 * Part 2: activity-tracker clients not in TBL_CONTACTS, ids "a_<lower trimmed
 * client name>" (stable across requests and filters — the same key the dead
 * lead flags and history lookups use).
 *
 * Non-admin callers must bind @userEmail and @userId.
 */
export function contactsCombinedSql(isAdmin: boolean): string {
  // TBL_CONTACTS.CREATED_BY was stored as email; match BOTH email + userId
  // to cover any format variation in older rows.
  // TBL_CALLS_VISITS.CREATED_BY stores the Supabase UUID.
  const part1Where      = isAdmin ? "" : "AND (c.CREATED_BY = @userEmail OR c.CREATED_BY = @userId)"
  const part2WhereExtra = isAdmin ? "" : "AND cv.CREATED_BY = @userId"
  const part2NotInExtra = isAdmin ? "" : "AND (CREATED_BY = @userEmail OR CREATED_BY = @userId)"

  // Part 1 is wrapped in a subquery so ROW_NUMBER can be filtered before
  // the UNION — avoids MSSQL 2008 issues with windowed cols in outer WHERE.
  return `
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

      SELECT
        'a_' + LOWER(RTRIM(LTRIM(cv.CLIENT_NAME)))        AS id,
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
        ISNULL(MAX(CAST(f2.IS_DEAD_LEAD AS tinyint)), 0)  AS is_dead_lead,
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
  `
}

/** Escape LIKE wildcards so user search text matches literally. */
export function escapeLike(s: string): string {
  return s.replace(/[[%_]/g, (ch) => `[${ch}]`)
}

export type DeadFilter = "active" | "dead" | "all"

export function readDeadFilter(v: string | null): DeadFilter {
  return v === "dead" || v === "all" ? v : "active"
}

/**
 * Paged-mode FROM: the combined list plus whole-set counts computed BEFORE the
 * search/dead filter, so header counts come back in the same statement.
 */
export function contactsPagedFrom(isAdmin: boolean): string {
  return `(
    SELECT combined.*,
           SUM(CASE WHEN combined.source = 'contact'  THEN 1 ELSE 0 END) OVER () AS __imported,
           SUM(CASE WHEN combined.source = 'activity' THEN 1 ELSE 0 END) OVER () AS __activity,
           SUM(CASE WHEN combined.is_dead_lead = 1    THEN 1 ELSE 0 END) OVER () AS __dead
    FROM (${contactsCombinedSql(isAdmin)}) combined
  ) x`
}

/** Fallback when the page has no rows: same counts, one query. */
export function contactsCountsSql(isAdmin: boolean): string {
  return `
    SELECT
      ISNULL(SUM(CASE WHEN source = 'contact'  THEN 1 ELSE 0 END), 0) AS imported,
      ISNULL(SUM(CASE WHEN source = 'activity' THEN 1 ELSE 0 END), 0) AS activity,
      ISNULL(SUM(CASE WHEN is_dead_lead = 1    THEN 1 ELSE 0 END), 0) AS dead,
      COUNT(*) AS all_rows
    FROM (${contactsCombinedSql(isAdmin)}) combined
  `
}

/** WHERE (without the keyword) for paged mode over alias x. Binds @q if given. */
export function contactsFilterWhere(dead: DeadFilter, hasQuery: boolean): string | undefined {
  const parts: string[] = []
  if (dead === "active") parts.push("x.is_dead_lead = 0")
  else if (dead === "dead") parts.push("x.is_dead_lead = 1")
  if (hasQuery) {
    parts.push(`(
      LOWER(x.shipper_name)   LIKE @q OR LOWER(x.consignee_name) LIKE @q OR
      LOWER(x.mode)           LIKE @q OR LOWER(x.pol)            LIKE @q OR
      LOWER(x.pod)            LIKE @q OR LOWER(x.contact_person) LIKE @q OR
      LOWER(x.contact_number) LIKE @q OR LOWER(x.email)          LIKE @q
    )`)
  }
  return parts.length ? parts.join(" AND ") : undefined
}
