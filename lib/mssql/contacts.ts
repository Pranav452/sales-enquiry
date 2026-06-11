import sql from "mssql"

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
