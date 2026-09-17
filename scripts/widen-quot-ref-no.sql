-- Widen TBL_QUOTATIONS.QUOT_REF_NO for enquiry-linked quotation numbers.
--
-- Quotations raised against an enquiry are now numbered `<ENQREFNO>-Q<n>`.
-- A generated enquiry ref is 10 chars (e.g. BOM2609001), so the linked ref
-- is ~13-14 chars and fits the original NVARCHAR(20) — but legacy/imported
-- ENQREFNO values can be longer, which would overflow it. Widen to 50.
--
-- Idempotent: only alters when the column is still narrower than 50.
-- Run on BOTH databases: manilal and LinksDB20.

IF EXISTS (
  SELECT 1
  FROM sys.columns c
  JOIN sys.objects o ON o.object_id = c.object_id
  WHERE o.name = 'TBL_QUOTATIONS'
    AND c.name = 'QUOT_REF_NO'
    AND c.max_length <> -1          -- not NVARCHAR(MAX)
    AND c.max_length < 100          -- max_length is bytes; NVARCHAR(50) = 100
)
BEGIN
  ALTER TABLE [dbo].[TBL_QUOTATIONS]
    ALTER COLUMN QUOT_REF_NO NVARCHAR(50) NOT NULL;
  PRINT 'QUOT_REF_NO widened to NVARCHAR(50)';
END
ELSE
BEGIN
  PRINT 'QUOT_REF_NO already wide enough - no change';
END
