-- Adds DUE_DATE to enquiries (target date by which quotation must be given). Idempotent.
-- Run: npx tsx scripts/run-sql-file.ts --company=manilal --file=scripts/add-enquiry-due-date.sql
--      npx tsx scripts/run-sql-file.ts --company=links   --file=scripts/add-enquiry-due-date.sql
IF COL_LENGTH('dbo.TBL_ADMIN_SALESENQUIRY', 'DUE_DATE') IS NULL
  ALTER TABLE [dbo].[TBL_ADMIN_SALESENQUIRY] ADD DUE_DATE DATETIME NULL;
GO
