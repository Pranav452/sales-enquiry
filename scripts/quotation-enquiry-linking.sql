-- ============================================================
-- Enquiry <-> Quotation linking
-- Run on BOTH manilal and LinksDB20 databases
-- Compatible with SQL Server 2008 R2 — safe to re-run
-- ============================================================
--
-- Adds to TBL_QUOTATIONS:
--   SHIPPING_LINE  — the carrier / shipping line the rate is quoted on.
--                    VESSEL_NAME already exists but that is the vessel,
--                    not the carrier, so this is genuinely a new concept.
--   QUOTED_RATE    — the headline freight rate actually quoted to the
--                    customer. TOTAL_INR / TOTAL_DISPLAY are computed
--                    grand totals (freight + locals + CC + transport),
--                    so neither is queryable as "the quoted rate".
--
-- STATUS is already present (added by interconnect-schema.sql). Its
-- vocabulary is widened here to: DRAFT | SUBMITTED | APPROVED |
-- CLOSED_NOT_QUOTED. "Not Prepared" is NOT stored — it is the
-- enquiry-side derived state meaning no quotation row exists yet, and
-- is computed by the enquiry APIs.
-- ============================================================

-- TBL_QUOTATIONS.SHIPPING_LINE
IF OBJECT_ID('dbo.TBL_QUOTATIONS', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT * FROM sys.columns
     WHERE object_id = OBJECT_ID('dbo.TBL_QUOTATIONS') AND name = 'SHIPPING_LINE'
   )
BEGIN
  ALTER TABLE [dbo].[TBL_QUOTATIONS] ADD SHIPPING_LINE NVARCHAR(100) NULL
  PRINT 'TBL_QUOTATIONS.SHIPPING_LINE added.'
END
ELSE
  PRINT 'TBL_QUOTATIONS.SHIPPING_LINE already exists or table missing - skipping.'
GO

-- TBL_QUOTATIONS.QUOTED_RATE
IF OBJECT_ID('dbo.TBL_QUOTATIONS', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT * FROM sys.columns
     WHERE object_id = OBJECT_ID('dbo.TBL_QUOTATIONS') AND name = 'QUOTED_RATE'
   )
BEGIN
  ALTER TABLE [dbo].[TBL_QUOTATIONS] ADD QUOTED_RATE DECIMAL(18,2) NULL
  PRINT 'TBL_QUOTATIONS.QUOTED_RATE added.'
END
ELSE
  PRINT 'TBL_QUOTATIONS.QUOTED_RATE already exists or table missing - skipping.'
GO

-- TBL_QUOTATIONS.STATUS — created by interconnect-schema.sql; guard anyway
IF OBJECT_ID('dbo.TBL_QUOTATIONS', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT * FROM sys.columns
     WHERE object_id = OBJECT_ID('dbo.TBL_QUOTATIONS') AND name = 'STATUS'
   )
BEGIN
  ALTER TABLE [dbo].[TBL_QUOTATIONS] ADD STATUS NVARCHAR(20) NULL
  PRINT 'TBL_QUOTATIONS.STATUS added.'
END
ELSE
  PRINT 'TBL_QUOTATIONS.STATUS already exists or table missing - skipping.'
GO

-- Backfill legacy rows with no status so the 4-state model is complete
IF OBJECT_ID('dbo.TBL_QUOTATIONS', 'U') IS NOT NULL
BEGIN
  UPDATE [dbo].[TBL_QUOTATIONS] SET STATUS = 'DRAFT' WHERE STATUS IS NULL OR LTRIM(RTRIM(STATUS)) = ''
  PRINT 'TBL_QUOTATIONS.STATUS backfilled to DRAFT where empty.'
END
GO

-- Index on the enquiry link — every enquiry list row now resolves its
-- latest quotation through this column.
IF OBJECT_ID('dbo.TBL_QUOTATIONS', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT * FROM sys.indexes
     WHERE name = 'IX_QUOT_ENQ_ID' AND object_id = OBJECT_ID('dbo.TBL_QUOTATIONS')
   )
BEGIN
  CREATE INDEX IX_QUOT_ENQ_ID ON [dbo].[TBL_QUOTATIONS] (ENQ_ID)
  PRINT 'IX_QUOT_ENQ_ID created.'
END
ELSE
  PRINT 'IX_QUOT_ENQ_ID already exists or table missing - skipping.'
GO
