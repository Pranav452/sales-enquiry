-- Total INSERT rows: 54

-- ================================================================
-- PIL (India) Pvt. Ltd. — NHAVA SHEVA Multi-Trade June 2026
-- Trades: East Africa | South Africa | Indian Ocean | West Africa
--         ECSA | WCSA | MELL Ports | South Pacific Islands
-- Valid 01-14 Jun: EA/SA/IO/WA/ECSA/WCSA
-- Valid 01-30 Jun: MELL / South Pacific Islands
-- Surcharge details noted per section in CLAUSES
-- ================================================================

USE [manilal];
GO

-- ======== EAST AFRICA (01-14 Jun 2026 | EBS $160/teu extra) ========

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Kenya','MOMBASA','USD',3050,4300,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Africa rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Tanzania','DAR ES SALAAM','USD',2850,3900,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Africa rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Tanzania','ZANZIBAR','USD',4050,6500,'2026-06-01','2026-06-14','MOMBASA','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore/Mombasa','PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Africa rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Mozambique','BEIRA / MAPUTO','USD',3250,4600,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Africa rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Mozambique','NACALA','USD',3250,4600,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Africa rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== SOUTH AFRICA (01-14 Jun 2026 | EBS $160/teu extra) ========

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','South Africa','DURBAN','USD',2050,2400,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Africa rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','South Africa','CAPE TOWN','USD',2150,2600,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Africa rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== INDIAN OCEAN (01-14 Jun 2026 | EBS $160/teu extra) ========

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Mauritius','PORT LOUIS','USD',2400,2900,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | Indian Ocean rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','France','REUNION (POINTE DES GALETS)','USD',2400,2900,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | Indian Ocean rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Madagascar','TAMATAVE','USD',2650,3700,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | Indian Ocean rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== WEST AFRICA (01-14 Jun 2026 | EBS inclusive) ========

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Nigeria','ONNE','USD',3400,4900,'2026-06-01','2026-06-14','SINGAPORE','EBS:incl;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Africa rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Nigeria','APAPA (LAGOS)','USD',3400,4900,'2026-06-01','2026-06-14','SINGAPORE','EBS:incl;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Africa rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Togo','LOME','USD',3000,4500,'2026-06-01','2026-06-14','SINGAPORE','EBS:incl;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Africa rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Ghana','TEMA','USD',3000,4500,'2026-06-01','2026-06-14','SINGAPORE','EBS:incl;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Africa rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Ivory Coast','ABIDJAN','USD',3050,4600,'2026-06-01','2026-06-14','SINGAPORE','EBS:incl;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Africa rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Benin','COTONOU','USD',3100,4700,'2026-06-01','2026-06-14','LOME','EBS:incl;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Lome','PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Africa rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Cameroon','DOUALA','USD',3500,5100,'2026-06-01','2026-06-14','LOME','EBS:incl;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Lome','PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Africa rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== ECSA (01-14 Jun 2026 | EBS $160/teu extra) ========

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Brazil','SANTOS','USD',6000,6300,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Coast South America rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Brazil','PARANAGUA','USD',6000,6300,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Coast South America rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Uruguay','MONTEVIDEO','USD',6000,6300,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Coast South America rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Argentina','BUENOS AIRES','USD',6000,6300,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Coast South America rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Brazil','NAVEGANTES','USD',6000,6300,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Coast South America rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Brazil','RIO DE JANEIRO','USD',6000,6300,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Coast South America rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Brazil','ITAPOA','USD',6000,6300,'2026-06-01','2026-06-14','SINGAPORE','EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Coast South America rates|Validity: 01-14 Jun 2026|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL|THC + local charges both ends | Space and equipment subject to availability','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== WCSA (01-14 Jun 2026 | EBS incl | LSR $160/teu extra) ========
-- Rows 1-8 via Shanghai | Rows 9-12 via Ningbo

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Mexico','MANZANILLO','USD',4100,4400,'2026-06-01','2026-06-14','SHANGHAI','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Mexico','LAZARO CARDENAS','USD',4100,4400,'2026-06-01','2026-06-14','SHANGHAI','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Ecuador','GUAYAQUIL','USD',4100,4400,'2026-06-01','2026-06-14','SHANGHAI','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Colombia','BUENAVENTURA','USD',4100,4400,'2026-06-01','2026-06-14','SHANGHAI','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Peru','CALLAO','USD',4100,4400,'2026-06-01','2026-06-14','SHANGHAI','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Chile','VALPARAISO','USD',4100,4400,'2026-06-01','2026-06-14','SHANGHAI','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Chile','SAN ANTONIO','USD',4100,4400,'2026-06-01','2026-06-14','SHANGHAI','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Mexico','ENSENADA','USD',4100,4400,'2026-06-01','2026-06-14','SHANGHAI','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Guatemala','PUERTO QUETZAL','USD',5100,5400,'2026-06-01','2026-06-14','NINGBO','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Costa Rica','PUERTO CALDERA','USD',5100,5400,'2026-06-01','2026-06-14','NINGBO','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','El Salvador','ACAJUTLA','USD',5100,5400,'2026-06-01','2026-06-14','NINGBO','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Nicaragua','CORINTO','USD',5100,5400,'2026-06-01','2026-06-14','NINGBO','EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates|Validity: 01-14 Jun 2026|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== MELL PORTS (01-30 Jun 2026 | RRS $750/20 $1500/40 extra) ========

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Papua New Guinea','PORT LAE','USD',1500,3000,'2026-06-01','2026-06-30','SINGAPORE','RRS:750/20-1500/40;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | MELL Ports (PNG/Pacific/AUS) rates|Validity: 01-30 Jun 2026|Subject to: Rate Restoration Surcharge (RRS) USD 750/20'' USD 1500/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Papua New Guinea','PORT MORESBY','USD',1500,3000,'2026-06-01','2026-06-30','SINGAPORE','RRS:750/20-1500/40;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | MELL Ports (PNG/Pacific/AUS) rates|Validity: 01-30 Jun 2026|Subject to: Rate Restoration Surcharge (RRS) USD 750/20'' USD 1500/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Papua New Guinea','RABAUL','USD',3400,6800,'2026-06-01','2026-06-30','SINGAPORE','RRS:750/20-1500/40;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | MELL Ports (PNG/Pacific/AUS) rates|Validity: 01-30 Jun 2026|Subject to: Rate Restoration Surcharge (RRS) USD 750/20'' USD 1500/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Australia','DARWIN','USD',1600,3200,'2026-06-01','2026-06-30','SINGAPORE','RRS:750/20-1500/40;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | MELL Ports (PNG/Pacific/AUS) rates|Validity: 01-30 Jun 2026|Subject to: Rate Restoration Surcharge (RRS) USD 750/20'' USD 1500/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Australia','TOWNSVILLE','USD',1600,3200,'2026-06-01','2026-06-30','SINGAPORE','RRS:750/20-1500/40;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | MELL Ports (PNG/Pacific/AUS) rates|Validity: 01-30 Jun 2026|Subject to: Rate Restoration Surcharge (RRS) USD 750/20'' USD 1500/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Timor-Leste','DILI','USD',1500,3000,'2026-06-01','2026-06-30','SINGAPORE','RRS:750/20-1500/40;Seal:10/ctr;SFF:15/BL;THC:collect',NULL,'PIL (India) Pvt. Ltd. | Nhava Sheva origin | MELL Ports (PNG/Pacific/AUS) rates|Validity: 01-30 Jun 2026|Subject to: Rate Restoration Surcharge (RRS) USD 750/20'' USD 1500/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Marshall Islands','MAJURO','USD',3300,6600,'2026-06-01','2026-06-30','HONG KONG','RRS:750/20-1500/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Hong Kong','PIL (India) Pvt. Ltd. | Nhava Sheva origin | MELL Ports (PNG/Pacific/AUS) rates|Validity: 01-30 Jun 2026|Subject to: Rate Restoration Surcharge (RRS) USD 750/20'' USD 1500/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== SOUTH PACIFIC ISLANDS (01-30 Jun 2026) ========
-- LSR $292/20 $584/40 | EIS $150/20 $300/40 | all via Singapore & Auckland

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Tonga','NUKUALOFA','USD',3600,7200,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland; same rate as Apia','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Samoa','APIA','USD',3600,7200,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland; same rate as Nukualofa','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','New Caledonia','NOUMEA','USD',2450,4900,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','French Polynesia','PAPEETE','USD',3700,7400,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Vanuatu','SANTO','USD',3450,6900,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Vanuatu','PORT VILA','USD',3150,6300,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Cook Islands','RAROTONGA','USD',7400,14800,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Kiribati','TARAWA','USD',3750,7500,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Tuvalu','FUNAFUTI','USD',6900,13800,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','France','WALLIS AND FUTUNA','USD',6250,12500,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('PIL','India','NHAVA SHEVA','Fiji','SUVA / LAUTOKA','USD',2500,5000,'2026-06-01','2026-06-30','AUCKLAND','LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect','via Singapore & Auckland','PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates|Validity: 01-30 Jun 2026|Subject to: LSR USD 292/20'' USD 584/40'' | EIS USD 150/20'' USD 300/40''|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends','https://www.pilship.com/en/index.html',1,'SYSTEM',GETDATE(),GETDATE());
GO

