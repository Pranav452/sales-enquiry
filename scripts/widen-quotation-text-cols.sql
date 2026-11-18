-- Widen the free-text quotation columns that users fill with short sentences
-- ("14 days free at destination ..."), which overflowed nvarchar(50) and made
-- saves fail with "String or binary data would be truncated."
-- Idempotent: only alters a column that is still narrower than 255.
-- Keep lib/quotation-limits.ts in step with these widths.
--
--   npx tsx scripts/run-sql-file.ts --company=manilal --file=scripts/widen-quotation-text-cols.sql
--   npx tsx scripts/run-sql-file.ts --company=links   --file=scripts/widen-quotation-text-cols.sql

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TBL_QUOTATIONS') AND name = 'TRANSIT_TIME' AND max_length < 510)
  ALTER TABLE [dbo].[TBL_QUOTATIONS] ALTER COLUMN TRANSIT_TIME NVARCHAR(255) NULL
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TBL_QUOTATIONS') AND name = 'FREE_TIME' AND max_length < 510)
  ALTER TABLE [dbo].[TBL_QUOTATIONS] ALTER COLUMN FREE_TIME NVARCHAR(255) NULL
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TBL_QUOTATIONS') AND name = 'VESSEL_NAME' AND max_length < 510)
  ALTER TABLE [dbo].[TBL_QUOTATIONS] ALTER COLUMN VESSEL_NAME NVARCHAR(255) NULL
GO
