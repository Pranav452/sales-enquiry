-- ============================================================
-- TBL_SALES_LEADS — Sales Lead Tracker
-- Run on BOTH manilal and LinksDB20 databases
-- Compatible with SQL Server 2008 R2
-- ============================================================

IF NOT EXISTS (
  SELECT * FROM sysobjects WHERE name = 'TBL_SALES_LEADS' AND xtype = 'U'
)
BEGIN
  CREATE TABLE [dbo].[TBL_SALES_LEADS] (
    ID              INT            IDENTITY(1,1) NOT NULL,
    REF_CODE        VARCHAR(30)    NOT NULL,            -- MPC-SL-2026-100
    SENT_BY         VARCHAR(50)    NULL,                -- sales person name
    DATE_SENT       VARCHAR(10)    NULL,                -- YYYY-MM-DD
    SHIPPER         VARCHAR(255)   NULL,
    SHIPPER_WEBSITE VARCHAR(500)   NULL,
    CITY            VARCHAR(255)   NULL,
    CONSIGNEE       VARCHAR(255)   NULL,
    DEST_COUNTRY    VARCHAR(150)   NULL,
    AGENT_NAME      VARCHAR(255)   NULL,
    AGENT_EMAIL     VARCHAR(500)   NULL,                -- may hold multiple addresses
    STATUS          VARCHAR(30)    NULL,                -- LEAD_SENT | RESPONSE_RECEIVED | FOLLOW_UP_SENT | MEETING_SCHEDULED | QUOTED | WON | NOT_INTERESTED | NO_RESPONSE | DEAD
    REMARKS         VARCHAR(2000)  NULL,
    REMARKS_2       VARCHAR(2000)  NULL,
    LAST_FOLLOW_UP  VARCHAR(10)    NULL,                -- YYYY-MM-DD
    NOTES           VARCHAR(2000)  NULL,
    CREATED_BY      VARCHAR(100)   NULL,                -- Supabase user ID or 'EXCEL_IMPORT'
    CREATED_AT      DATETIME       NULL,
    UPDATED_AT      DATETIME       NULL,
    CONSTRAINT PK_TBL_SALES_LEADS PRIMARY KEY CLUSTERED (ID ASC)
  )

  CREATE UNIQUE INDEX UX_SL_REF    ON [dbo].[TBL_SALES_LEADS] (REF_CODE)
  CREATE INDEX IX_SL_SENT_BY       ON [dbo].[TBL_SALES_LEADS] (SENT_BY)
  CREATE INDEX IX_SL_DATE_SENT     ON [dbo].[TBL_SALES_LEADS] (DATE_SENT)
  CREATE INDEX IX_SL_STATUS        ON [dbo].[TBL_SALES_LEADS] (STATUS)
  CREATE INDEX IX_SL_CREATED_BY    ON [dbo].[TBL_SALES_LEADS] (CREATED_BY)

  PRINT 'TBL_SALES_LEADS created successfully.'
END
ELSE
BEGIN
  PRINT 'TBL_SALES_LEADS already exists — skipping.'
END
