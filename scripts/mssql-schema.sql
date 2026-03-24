-- ============================================================
-- MSSQL 2008 R2 Schema Migration
-- Run this on BOTH [manilal] and [LinksDB20] databases.
-- ============================================================

-- STEP 1: Add missing columns to TBL_ADMIN_SALESENQUIRY
-- Run each ALTER TABLE separately if any column already exists.

ALTER TABLE [dbo].[TBL_ADMIN_SALESENQUIRY] ADD
  [FN]             varchar(20)   NULL,
  [ASSIGNED_USER]  varchar(100)  NULL,
  [ASSIGNED_DATE]  datetime      NULL,
  [BUY_RATE_FILE]  varchar(500)  NULL,
  [SELL_RATE_FILE] varchar(500)  NULL,
  [MBL_AWB_NO]     varchar(50)   NULL,
  [JOB_INVOICE_NO] varchar(50)   NULL,
  [GOP]            varchar(50)   NULL,
  [EMAIL_SUBJECT]  varchar(200)  NULL,
  [CREATED_BY]     varchar(100)  NULL,
  [UPDATED_AT]     datetime      NULL
GO

-- STEP 2: Expand POL/POD columns to store full port city names (was varchar(3))
ALTER TABLE [dbo].[TBL_ADMIN_SALESENQUIRY]
  ALTER COLUMN [POL] varchar(100) NULL;
ALTER TABLE [dbo].[TBL_ADMIN_SALESENQUIRY]
  ALTER COLUMN [POD] varchar(100) NULL;
GO

-- STEP 3: Create ENQUIRY_AUDIT_LOG table for tracking all changes
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'ENQUIRY_AUDIT_LOG'
)
BEGIN
  CREATE TABLE [dbo].[ENQUIRY_AUDIT_LOG] (
    [PK_ID]         int           IDENTITY(1,1) PRIMARY KEY,
    [ENQUIRY_ID]    int           NOT NULL,
    [FIELD_NAME]    varchar(50)   NOT NULL,
    [OLD_VALUE]     varchar(max)  NULL,
    [NEW_VALUE]     varchar(max)  NULL,
    [CHANGED_BY]    varchar(100)  NOT NULL,
    [CHANGED_AT]    datetime      NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY ([ENQUIRY_ID]) REFERENCES [dbo].[TBL_ADMIN_SALESENQUIRY]([PK_ID]) ON DELETE CASCADE
  )
  CREATE INDEX IX_ENQUIRY_AUDIT_LOG_ENQUIRY_ID ON [dbo].[ENQUIRY_AUDIT_LOG]([ENQUIRY_ID] DESC, [CHANGED_AT] DESC)
END
GO

-- STEP 4: Create ENQ_REF_SEQUENCES table for atomic ref no generation

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'ENQ_REF_SEQUENCES'
)
BEGIN
  CREATE TABLE [dbo].[ENQ_REF_SEQUENCES] (
    BRANCH_CODE  varchar(5)   NOT NULL,
    DATE_STR     varchar(10)  NOT NULL,
    LAST_SEQ     int          NOT NULL DEFAULT 0,
    CONSTRAINT PK_ENQ_REF_SEQUENCES PRIMARY KEY (BRANCH_CODE, DATE_STR)
  )
END
GO

-- STEP 3: Pre-populate ENQ_REF_SEQUENCES from existing data
-- Run AFTER migrating data so the counters start from the right number.
-- This prevents duplicate ref nos if new enquiries are created after migration.

MERGE [dbo].[ENQ_REF_SEQUENCES] AS target
USING (
  SELECT
    LEFT(ENQREFNO, 3)                              AS BRANCH_CODE,
    SUBSTRING(ENQREFNO, 4, 4)                      AS DATE_STR,
    MAX(CAST(RIGHT(ENQREFNO, 3) AS int))           AS LAST_SEQ
  FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
  WHERE ENQREFNO IS NOT NULL
    AND LEN(ENQREFNO) >= 10
    AND ISNUMERIC(RIGHT(ENQREFNO, 3)) = 1
  GROUP BY LEFT(ENQREFNO, 3), SUBSTRING(ENQREFNO, 4, 4)
) AS src
  ON target.BRANCH_CODE = src.BRANCH_CODE
 AND target.DATE_STR    = src.DATE_STR
WHEN MATCHED AND src.LAST_SEQ > target.LAST_SEQ THEN
  UPDATE SET LAST_SEQ = src.LAST_SEQ
WHEN NOT MATCHED THEN
  INSERT (BRANCH_CODE, DATE_STR, LAST_SEQ)
  VALUES (src.BRANCH_CODE, src.DATE_STR, src.LAST_SEQ);
GO
