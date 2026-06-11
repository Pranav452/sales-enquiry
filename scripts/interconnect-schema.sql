-- ============================================================
-- Module interconnect: Lead → Contact → Enquiry → Quotation → Client
-- Run on BOTH manilal and LinksDB20 databases
-- Compatible with SQL Server 2008 R2
-- ============================================================

-- TBL_SALES_LEADS.CONTACT_ID — set by "Convert to Contact"
IF NOT EXISTS (
  SELECT * FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.TBL_SALES_LEADS') AND name = 'CONTACT_ID'
)
BEGIN
  ALTER TABLE [dbo].[TBL_SALES_LEADS] ADD CONTACT_ID INT NULL
  PRINT 'TBL_SALES_LEADS.CONTACT_ID added.'
END
ELSE
  PRINT 'TBL_SALES_LEADS.CONTACT_ID already exists — skipping.'
GO

-- TBL_ADMIN_SALESENQUIRY.CONTACT_ID — which contact this enquiry belongs to
IF NOT EXISTS (
  SELECT * FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.TBL_ADMIN_SALESENQUIRY') AND name = 'CONTACT_ID'
)
BEGIN
  ALTER TABLE [dbo].[TBL_ADMIN_SALESENQUIRY] ADD CONTACT_ID INT NULL
  PRINT 'TBL_ADMIN_SALESENQUIRY.CONTACT_ID added.'
END
ELSE
  PRINT 'TBL_ADMIN_SALESENQUIRY.CONTACT_ID already exists — skipping.'
GO

-- TBL_ADMIN_SALESENQUIRY.LEAD_ID — provenance: which sales lead spawned this enquiry
IF NOT EXISTS (
  SELECT * FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.TBL_ADMIN_SALESENQUIRY') AND name = 'LEAD_ID'
)
BEGIN
  ALTER TABLE [dbo].[TBL_ADMIN_SALESENQUIRY] ADD LEAD_ID INT NULL
  PRINT 'TBL_ADMIN_SALESENQUIRY.LEAD_ID added.'
END
ELSE
  PRINT 'TBL_ADMIN_SALESENQUIRY.LEAD_ID already exists — skipping.'
GO

-- TBL_CONTACTS.STAGE — funnel stage: LEAD | CONTACT | CLIENT
-- (table is created lazily by the app; guard on existence)
IF OBJECT_ID('dbo.TBL_CONTACTS', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT * FROM sys.columns
     WHERE object_id = OBJECT_ID('dbo.TBL_CONTACTS') AND name = 'STAGE'
   )
BEGIN
  ALTER TABLE [dbo].[TBL_CONTACTS] ADD STAGE VARCHAR(20) NULL
  PRINT 'TBL_CONTACTS.STAGE added.'
END
ELSE
  PRINT 'TBL_CONTACTS.STAGE already exists or table missing — skipping.'
GO

-- TBL_QUOTATIONS.STATUS — DRAFT | APPROVED (approval promotes contact to CLIENT)
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
  PRINT 'TBL_QUOTATIONS.STATUS already exists or table missing — skipping.'
GO

-- Indexes for the new linkage columns
IF NOT EXISTS (
  SELECT * FROM sys.indexes
  WHERE name = 'IX_ENQ_CONTACT_ID' AND object_id = OBJECT_ID('dbo.TBL_ADMIN_SALESENQUIRY')
)
BEGIN
  CREATE INDEX IX_ENQ_CONTACT_ID ON [dbo].[TBL_ADMIN_SALESENQUIRY] (CONTACT_ID)
  PRINT 'IX_ENQ_CONTACT_ID created.'
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.indexes
  WHERE name = 'IX_SL_CONTACT_ID' AND object_id = OBJECT_ID('dbo.TBL_SALES_LEADS')
)
BEGIN
  CREATE INDEX IX_SL_CONTACT_ID ON [dbo].[TBL_SALES_LEADS] (CONTACT_ID)
  PRINT 'IX_SL_CONTACT_ID created.'
END
GO
