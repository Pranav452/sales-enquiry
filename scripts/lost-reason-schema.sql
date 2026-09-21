-- Lost Reason on enquiries (feeds the Weekly Sales Report "Lost Reason" column).
-- Run on BOTH manilal and LinksDB20. The app also adds this column on first use
-- (lib/mssql/lost-reason.ts); this script is for DBAs / restricted logins.
IF COL_LENGTH('dbo.TBL_ADMIN_SALESENQUIRY', 'LOST_REASON') IS NULL
  ALTER TABLE [dbo].[TBL_ADMIN_SALESENQUIRY] ADD [LOST_REASON] varchar(200) NULL;
