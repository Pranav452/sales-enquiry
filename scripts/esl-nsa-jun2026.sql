-- Total INSERT rows: 46

-- ================================================================
-- Emirates Shipping Line (ESL) — NHAVA SHEVA Rates June 2026
-- Trades: East Africa | Red Sea | Intra Asia Pacific | N America | Gulf
-- EA / RS / NA : valid 01-15 Jun 2026
-- Intra AP / Gulf : valid 01-30 Jun 2026
-- All rates inclusive of EBS | Seal USD 8/ctr
-- ================================================================

USE [manilal];
GO

-- ======== EAST AFRICA (01-15 Jun 2026 | Direct | EBS incl) ========

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Kenya','MOMBASA','USD',1700,1900,'2026-06-01','2026-06-15',NULL,'EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | East Africa rates|Validity: 01-15 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|14 Days free time at Mombasa and Dar Es Salaam','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Tanzania','DAR ES SALAAM','USD',1800,2100,'2026-06-01','2026-06-15',NULL,'EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | East Africa rates|Validity: 01-15 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|14 Days free time at Mombasa and Dar Es Salaam','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== RED SEA (01-15 Jun 2026 | via Mundra | EBS incl) ========

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Saudi Arabia','JEDDAH','USD',2600,3600,'2026-06-01','2026-06-15','MUNDRA','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Red Sea rates|Validity: 01-15 Jun 2026 | Via Mundra|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Not accepting HAZ for Jeddah/Aqaba/Sokhna/Djibouti|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Egypt','AIN SOKHNA','USD',2600,3600,'2026-06-01','2026-06-15','MUNDRA','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Red Sea rates|Validity: 01-15 Jun 2026 | Via Mundra|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Not accepting HAZ for Jeddah/Aqaba/Sokhna/Djibouti|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Jordan','AQABA','USD',2600,3600,'2026-06-01','2026-06-15','MUNDRA','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Red Sea rates|Validity: 01-15 Jun 2026 | Via Mundra|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Not accepting HAZ for Jeddah/Aqaba/Sokhna/Djibouti|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Djibouti','DJIBOUTI','USD',2500,3500,'2026-06-01','2026-06-15','MUNDRA','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Red Sea rates|Validity: 01-15 Jun 2026 | Via Mundra|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Not accepting HAZ for Jeddah/Aqaba/Sokhna/Djibouti|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== INTRA ASIA PACIFIC (01-30 Jun 2026 | EBS incl) ========

-- Malaysia
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Malaysia','PORT KLANG','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Malaysia','PASIR GUDANG','USD',200,300,'2026-06-01','2026-06-30','PORT KLANG','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Malaysia','PENANG','USD',200,300,'2026-06-01','2026-06-30','PORT KLANG','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- Singapore
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Singapore','SINGAPORE','USD',150,350,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- Maldives
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Maldives','MALE','USD',1300,2450,'2026-06-01','2026-06-30','COLOMBO','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- Vietnam
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Vietnam','CAI MEP','USD',75,150,'2026-06-01','2026-06-30','PORT KLANG','EBS:incl;Seal:8/ctr;CIC:50/20-100/40','CIC USD 50/20 USD 100/40 collect','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Vietnam','HO CHI MINH (SP-ITC TERMINAL)','USD',75,150,'2026-06-01','2026-06-30','PORT KLANG / CAI MEP','EBS:incl;Seal:8/ctr;CIC:50/20-100/40','CIC USD 50/20 USD 100/40 collect','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Vietnam','HO CHI MINH (CAT LAI)','USD',75,150,'2026-06-01','2026-06-30','PORT KLANG / CAI MEP','EBS:incl;Seal:8/ctr;CIC:50/20-100/40','CIC USD 50/20 USD 100/40 collect','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Vietnam','HAIPHONG','USD',75,150,'2026-06-01','2026-06-30','HONG KONG','EBS:incl;Seal:8/ctr;CIC:100/20-200/40','CIC USD 100/20 USD 200/40 collect','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- China — direct
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','China','QINGDAO','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','China','SHANGHAI','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','China','NINGBO','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','China','DA CHAN BAY','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','China','NANSHA','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','China','XIAMEN','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','China','XINGANG','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- China — transhipment
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','China','HUANGPU','USD',75,150,'2026-06-01','2026-06-30','HONG KONG / DA CHAN BAY','EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','China','YUNFU','USD',75,150,'2026-06-01','2026-06-30','HONG KONG','EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','China','NANJING','USD',75,150,'2026-06-01','2026-06-30','SHANGHAI','EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- Hong Kong
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Hong Kong','HONG KONG','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr','China Manifest Charges incl','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- South Korea
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','South Korea','PUSAN','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','South Korea','KWANGYANG','USD',55,110,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','South Korea','INCHEON','USD',150,250,'2026-06-01','2026-06-30','NINGBO','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- Indonesia
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Indonesia','JAKARTA','USD',200,400,'2026-06-01','2026-06-30','PORT KLANG','EBS:incl;Seal:8/ctr;CIC:30/unit','CIC USD 30/unit collect','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Indonesia','SURABAYA','USD',250,450,'2026-06-01','2026-06-30','PORT KLANG','EBS:incl;Seal:8/ctr;CIC:30/unit','CIC USD 30/unit collect','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Indonesia','BELAWAN','USD',150,300,'2026-06-01','2026-06-30','PORT KLANG','EBS:incl;Seal:8/ctr;CIC:30/unit','CIC USD 30/unit collect','Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- Thailand
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Thailand','BANGKOK (PAT)','USD',200,350,'2026-06-01','2026-06-30','PORT KLANG / LAEM CHABANG','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Thailand','LAEM CHABANG','USD',75,150,'2026-06-01','2026-06-30','PORT KLANG','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Thailand','LAT KRABANG','USD',125,250,'2026-06-01','2026-06-30','PORT KLANG / LAEM CHABANG','EBS:incl;Seal:8/ctr',NULL,'Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Local charges both ends | CY/CY basis | Space and equipment subject to availability|CIC surcharge (where applicable) on collect basis','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== NORTH AMERICA / MEXICO (01-15 Jun 2026 | via Qingdao) ========

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Mexico','MANZANILLO','USD',4500,4600,'2026-06-01','2026-06-15','QINGDAO','EBS:incl;Seal:8/ctr;AMS:30/BL;SEC:17/box',NULL,'Emirates Shipping Line | Nhava Sheva origin | North America (Mexico) rates|Validity: 01-15 Jun 2026 | Via Qingdao|Rates inclusive of: EBS | Seal USD 8/container|Subject to: AMS USD 30/BL | Security Surcharge USD 17/box|Local charges both ends | CY/CY basis | 14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

-- ======== GULF (01-30 Jun 2026 | EDO $550/TEU collect | EBS incl) ========

INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','United Arab Emirates','KHOR FAKKAN','USD',2300,3000,'2026-06-01','2026-06-30',NULL,'EBS:incl;Seal:8/ctr;EDO:550/teu',NULL,'Emirates Shipping Line | Nhava Sheva origin | Gulf rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Empty Drop-Off Charge USD 550/TEU on collect basis|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','United Arab Emirates','JEBEL ALI','USD',3500,4200,'2026-06-01','2026-06-30','KHOR FAKKAN','EBS:incl;Seal:8/ctr;EDO:550/teu','Road via Khor Fakkan','Emirates Shipping Line | Nhava Sheva origin | Gulf rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Empty Drop-Off Charge USD 550/TEU on collect basis|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','United Arab Emirates','SHARJAH','USD',3600,4300,'2026-06-01','2026-06-30','KHOR FAKKAN','EBS:incl;Seal:8/ctr;EDO:550/teu','Road via Khor Fakkan','Emirates Shipping Line | Nhava Sheva origin | Gulf rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Empty Drop-Off Charge USD 550/TEU on collect basis|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','United Arab Emirates','UMM QASAR','USD',4500,6000,'2026-06-01','2026-06-30','KHOR FAKKAN','EBS:incl;Seal:8/ctr;EDO:550/teu','Road/Feeder via Khor Fakkan/Jebel Ali','Emirates Shipping Line | Nhava Sheva origin | Gulf rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Empty Drop-Off Charge USD 550/TEU on collect basis|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Oman','SOHAR','USD',2600,3200,'2026-06-01','2026-06-30','KHOR FAKKAN','EBS:incl;Seal:8/ctr;EDO:550/teu','Road/Feeder via Khor Fakkan/Jebel Ali','Emirates Shipping Line | Nhava Sheva origin | Gulf rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Empty Drop-Off Charge USD 550/TEU on collect basis|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Bahrain','BAHRAIN','USD',5500,7000,'2026-06-01','2026-06-30','KHOR FAKKAN','EBS:incl;Seal:8/ctr;EDO:550/teu','Road/Feeder via Khor Fakkan/Jebel Ali','Emirates Shipping Line | Nhava Sheva origin | Gulf rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Empty Drop-Off Charge USD 550/TEU on collect basis|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Kuwait','SHUWAIKH','USD',4500,6000,'2026-06-01','2026-06-30','KHOR FAKKAN','EBS:incl;Seal:8/ctr;EDO:550/teu','Road/Feeder via Khor Fakkan/Jebel Ali','Emirates Shipping Line | Nhava Sheva origin | Gulf rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Empty Drop-Off Charge USD 550/TEU on collect basis|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Qatar','HAMAD','USD',4500,6000,'2026-06-01','2026-06-30','KHOR FAKKAN','EBS:incl;Seal:8/ctr;EDO:550/teu','Road/Feeder via Khor Fakkan/Jebel Ali','Emirates Shipping Line | Nhava Sheva origin | Gulf rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Empty Drop-Off Charge USD 550/TEU on collect basis|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Saudi Arabia','DAMMAM','USD',4200,5500,'2026-06-01','2026-06-30','KHOR FAKKAN','EBS:incl;Seal:8/ctr;EDO:550/teu','Road/Feeder via Khor Fakkan/Jebel Ali','Emirates Shipping Line | Nhava Sheva origin | Gulf rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Empty Drop-Off Charge USD 550/TEU on collect basis|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO
INSERT INTO [dbo].[FREIGHT_RATES] (SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)
VALUES ('ESL','India','NHAVA SHEVA','Saudi Arabia','RIYADH','USD',4800,6200,'2026-06-01','2026-06-30','KHOR FAKKAN','EBS:incl;Seal:8/ctr;EDO:550/teu','20ft: SAR 700 collect if cargo+tare >25MT; 40HC: SAR 1600 collect if cargo+tare >30MT; Road/Feeder via Khor Fakkan/Jebel Ali','Emirates Shipping Line | Nhava Sheva origin | Gulf rates|Validity: 01-30 Jun 2026|Rates inclusive of: EBS | Seal USD 8/container|Empty Drop-Off Charge USD 550/TEU on collect basis|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports|14 Days free time at destination','https://www.emiratesline.com',1,'SYSTEM',GETDATE(),GETDATE());
GO

