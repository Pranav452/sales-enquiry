-- Multi-line rate notes / terms & conditions on sales leads.
-- Run once on EACH database (manilal and LinksDB20). Safe to re-run.
IF COL_LENGTH('dbo.TBL_SALES_LEADS', 'RATE_NOTES') IS NULL
  ALTER TABLE [dbo].[TBL_SALES_LEADS] ADD RATE_NOTES NVARCHAR(MAX) NULL;
