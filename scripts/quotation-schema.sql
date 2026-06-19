-- Run on both manilal and LinksDB20 databases

CREATE TABLE [dbo].[TBL_QUOTATIONS] (
  QUOT_ID           INT IDENTITY(1,1) PRIMARY KEY,
  QUOT_REF_NO       NVARCHAR(20)    NOT NULL,
  QUOT_DATE         DATE            NOT NULL,
  MODE              NVARCHAR(10),
  EXIM              NVARCHAR(30),
  FN                NVARCHAR(20),
  ENQ_TYPE          NVARCHAR(30),
  INCOTERMS         NVARCHAR(50),
  POL               NVARCHAR(100),
  POD               NVARCHAR(100),
  CONTAINER_TYPE    NVARCHAR(100),
  SHIPPER           NVARCHAR(200),
  SHIPMENT_TYPE     NVARCHAR(30),
  -- Vessel schedule (freight)
  VESSEL_NAME       NVARCHAR(100),
  ETD               DATE,
  ETA               DATE,
  TRANSIT_TIME      NVARCHAR(50),
  FREE_TIME         NVARCHAR(50),
  -- Charges stored as JSON strings
  LOCAL_CHARGES     NVARCHAR(MAX),
  STUFFING_TYPE     NVARCHAR(20),
  CC_CHARGES        NVARCHAR(MAX),
  TRANSPORT_ENABLED BIT             NOT NULL DEFAULT 0,
  TRANSPORT_COST    NVARCHAR(MAX),
  -- Totals
  TOTAL_INR         DECIMAL(18,2),
  EXCHANGE_RATE     DECIMAL(18,6),
  -- Display currency (what the list view and PDF show the total in)
  DISPLAY_CURRENCY  NVARCHAR(10),
  TOTAL_DISPLAY     DECIMAL(18,2),
  -- Clauses
  CLAUSES           NVARCHAR(MAX),
  -- Link to enquiry
  ENQ_ID            INT             NULL,
  SALES_PERSON      NVARCHAR(100),
  BRANCH            NVARCHAR(50),
  CREATED_BY        NVARCHAR(100),
  CREATED_AT        DATETIME        NOT NULL DEFAULT GETDATE(),
  UPDATED_AT        DATETIME        NOT NULL DEFAULT GETDATE()
);

CREATE TABLE [dbo].[QUOT_REF_SEQUENCES] (
  BRANCH_CODE NVARCHAR(10) NOT NULL,
  DATE_STR    NVARCHAR(6)  NOT NULL,
  LAST_SEQ    INT          NOT NULL DEFAULT 1,
  CONSTRAINT PK_QUOT_REF_SEQUENCES PRIMARY KEY (BRANCH_CODE, DATE_STR)
);
