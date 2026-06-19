-- Run on BOTH manilal and LinksDB20 databases.
--
-- Adds the display-currency support for quotations:
--   DISPLAY_CURRENCY — the currency the user chose to present the total in
--   TOTAL_DISPLAY    — the total converted into that currency at save time
--
-- TOTAL_INR stays the canonical INR figure (used by dashboards/reporting).
-- These two columns are what the list view and the generated PDF render.
-- Existing rows are back-filled to INR / TOTAL_INR so they keep showing the
-- same number they always did.

IF COL_LENGTH('dbo.TBL_QUOTATIONS', 'DISPLAY_CURRENCY') IS NULL
  ALTER TABLE [dbo].[TBL_QUOTATIONS] ADD DISPLAY_CURRENCY NVARCHAR(10) NULL;
GO

IF COL_LENGTH('dbo.TBL_QUOTATIONS', 'TOTAL_DISPLAY') IS NULL
  ALTER TABLE [dbo].[TBL_QUOTATIONS] ADD TOTAL_DISPLAY DECIMAL(18,2) NULL;
GO

-- Back-fill existing quotations so the list keeps showing their INR total.
UPDATE [dbo].[TBL_QUOTATIONS]
   SET DISPLAY_CURRENCY = 'INR'
 WHERE DISPLAY_CURRENCY IS NULL;
GO

UPDATE [dbo].[TBL_QUOTATIONS]
   SET TOTAL_DISPLAY = TOTAL_INR
 WHERE TOTAL_DISPLAY IS NULL
   AND TOTAL_INR IS NOT NULL;
GO
