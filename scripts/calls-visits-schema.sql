-- ============================================================
-- TBL_CALLS_VISITS — Calls & Client Visits Tracker
-- Run on BOTH manilal and LinksDB20 databases
-- ============================================================

IF NOT EXISTS (
  SELECT * FROM sysobjects WHERE name = 'TBL_CALLS_VISITS' AND xtype = 'U'
)
BEGIN
  CREATE TABLE [dbo].[TBL_CALLS_VISITS] (
    ID             INT           IDENTITY(1,1) NOT NULL,
    ACTIVITY_DATE  VARCHAR(10)   NOT NULL,            -- YYYY-MM-DD
    ACTIVITY_TYPE  VARCHAR(20)   NOT NULL,            -- COLD_CALL | WARM_CALL | CLIENT_VISIT | VISIT_SECURED
    SALES_PERSON   VARCHAR(15)   NULL,
    BRANCH         VARCHAR(10)   NULL,
    CLIENT_NAME    VARCHAR(200)  NULL,
    CONTACT_PERSON VARCHAR(100)  NULL,
    CONTACT_NUMBER VARCHAR(50)   NULL,
    EMAIL          VARCHAR(100)  NULL,
    MODE           VARCHAR(10)   NULL,                -- SEA | AIR
    POL            VARCHAR(100)  NULL,
    POD            VARCHAR(100)  NULL,
    COMMODITY      VARCHAR(100)  NULL,
    STATUS         VARCHAR(25)   NULL,                -- INTERESTED | NOT_INTERESTED | CALLBACK | NO_ANSWER | SECURED | FOLLOW_UP | INVALID_NUMBER | BUSY
    NOTES          VARCHAR(500)  NULL,
    POINTS         INT           NOT NULL DEFAULT 1,  -- 1 = call, 2 = visit, 3 = visit+secured
    CREATED_BY     VARCHAR(100)  NULL,                -- Supabase user ID
    CREATED_AT     DATETIME      NULL,
    UPDATED_AT     DATETIME      NULL,
    CONSTRAINT PK_TBL_CALLS_VISITS PRIMARY KEY CLUSTERED (ID ASC)
  )

  CREATE INDEX IX_CV_DATE       ON [dbo].[TBL_CALLS_VISITS] (ACTIVITY_DATE)
  CREATE INDEX IX_CV_PERSON     ON [dbo].[TBL_CALLS_VISITS] (SALES_PERSON)
  CREATE INDEX IX_CV_CREATED_BY ON [dbo].[TBL_CALLS_VISITS] (CREATED_BY)
  CREATE INDEX IX_CV_TYPE       ON [dbo].[TBL_CALLS_VISITS] (ACTIVITY_TYPE)

  PRINT 'TBL_CALLS_VISITS created successfully.'
END
ELSE
BEGIN
  PRINT 'TBL_CALLS_VISITS already exists — skipping.'
END
