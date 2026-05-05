import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL = 'ESL'
OC = 'India'
OP = 'NHAVA SHEVA'
CUR = 'USD'

# Common T&C across all ESL sections
ESL_BASE = (
    "Emirates Shipping Line (ESL) | Contact: sagar.devadiga@in.emiratesline.com / +91 9833665560 | www.emiratesline.com"
    "|Rates inclusive of Emergency Bunker Surcharge (EBS)"
    "|EBS circular WEF 1-Apr-2026: Far East/SEA $50/TEU; INSC (Colombo/Male) $75/TEU"
    "|Rates subject to local charges at both ends"
    "|Seal Fee USD 8 applicable per container"
    "|CY/CY basis only"
    "|Subject to changes in surcharges at time of shipment"
    "|Subject to equipment, space and service availability"
)

# Surcharge shorthand for Intra AP routes
SURCH_AP   = 'EBS:50/teu;SEAL:8/cntr'     # Far East / SEA
SURCH_INSC = 'EBS:75/teu;SEAL:8/cntr'     # INSC: Colombo / Male

def row(dc, dp, r20, r40, vf, vt, via='', surcharges='', notes='', clauses=''):
    v  = f"'{via}'" if via else 'NULL'
    s  = f"'{surcharges.replace(chr(39), chr(39)*2)}'" if surcharges else 'NULL'
    n  = f"'{notes.replace(chr(39), chr(39)*2)}'" if notes else 'NULL'
    cl = (clauses if clauses else ESL_BASE).replace("'", "''")
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{dc}','{dp}',"
        f"'{CUR}',{r20},{r40},'{vf}','{vt}',{v},{s},{n},'{cl}',1,'SYSTEM',GETDATE(),GETDATE());"
    )

lines = []
lines.append("-- ================================================================")
lines.append("-- ESL (Emirates Shipping Line) - May 2026 Rate Sheet")
lines.append("-- Origin: Nhava Sheva | Contact: sagar.devadiga@in.emiratesline.com")
lines.append("-- Sections: East Africa | Red Sea | Intra AP | Mexico")
lines.append("--           TBL via Mombasa (Nairobi ICD + Uganda)")
lines.append("--           TBL via Dar Es Salaam (Rwanda/Burundi/Zambia/Malawi/DRC)")
lines.append("-- All rates incl Emergency Bunker Surcharge (EBS)")
lines.append("-- EBS circular WEF 1-Apr-2026: Far East/SEA $50/TEU | INSC (Colombo/Male) $75/TEU")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# EAST AFRICA — GIA Direct (1-15 May 2026)
# ============================================================
EA_CL = (
    ESL_BASE
    + "|East Africa trade; Service: GIA (Direct)"
    + "|Freetime: 14 days free at Mombasa and Dar Es Salaam (local discharge only)"
    + "|DG Class 3/6/9: add $150/20 $300/40HC (subj DG partner acceptance)"
    + "|DG Class 8: add $150/20 $300/40HC (subj DG partner acceptance)"
    + "|DG Class 2/4: add $300/20 $600/40HC (subj DG partner acceptance)"
)

lines.append("-- ======== EAST AFRICA (GIA Direct, 1-15 May 2026) ========")
lines.append("")
lines.append(row('Kenya','MOMBASA',1900,2100,'2026-05-01','2026-05-15',
    surcharges='EBS:incl;SEAL:8/cntr',
    notes='GIA direct service; transit ~15 days; incl EBS; 14 days freetime at POD',
    clauses=EA_CL))
lines.append(row('Tanzania','DAR ES SALAAM',2000,2300,'2026-05-01','2026-05-15',
    surcharges='EBS:incl;SEAL:8/cntr',
    notes='GIA direct service; transit ~18 days; incl EBS; 14 days freetime at POD',
    clauses=EA_CL))
lines.append("")

# ============================================================
# RED SEA — GRC Transhipment via Mundra (1-20 May 2026)
# NOT accepting HAZ for Jeddah / Aqaba / Sokhna / Djibouti
# ============================================================
RS_CL = (
    ESL_BASE
    + "|Red Sea trade; Service: GRC (Transhipment via Mundra)"
    + "|NOT accepting HAZ for Jeddah/Aqaba/Sokhna/Djibouti"
    + "|14 days freetime at destination"
)

lines.append("-- ======== RED SEA (GRC T/S via Mundra, 1-20 May 2026) ========")
lines.append("")
lines.append(row('Saudi Arabia','JEDDAH',2600,3600,'2026-05-01','2026-05-20',
    via='MUNDRA',
    surcharges='EBS:incl;SEAL:8/cntr',
    notes='GRC transhipment via Mundra; transit ~12 days; incl EBS; HAZ NOT accepted; 14 days freetime',
    clauses=RS_CL))
lines.append(row('Egypt','AIN SOKHNA',2600,3600,'2026-05-01','2026-05-20',
    via='MUNDRA',
    surcharges='EBS:incl;SEAL:8/cntr',
    notes='GRC transhipment via Mundra; transit ~15 days; incl EBS; HAZ NOT accepted; 14 days freetime',
    clauses=RS_CL))
lines.append(row('Jordan','AQABA',2600,3600,'2026-05-01','2026-05-20',
    via='MUNDRA',
    surcharges='EBS:incl;SEAL:8/cntr',
    notes='GRC transhipment via Mundra; transit ~18 days; incl EBS; HAZ NOT accepted; 14 days freetime',
    clauses=RS_CL))
lines.append(row('Djibouti','DJIBOUTI',2500,3500,'2026-05-01','2026-05-20',
    via='MUNDRA',
    surcharges='EBS:incl;SEAL:8/cntr',
    notes='GRC transhipment via Mundra; transit ~25 days; incl EBS; HAZ NOT accepted; 14 days freetime',
    clauses=RS_CL))
lines.append("")

# ============================================================
# INTRA AP (1-31 May 2026)
# EBS: Far East/SEA $50/TEU | INSC (Male/Colombo) $75/TEU — INCLUDED in rates
# DG surcharges vary by port — captured in CLAUSES
# ============================================================
INTRA_CL_BASE = (
    ESL_BASE
    + "|Intra Asia Pacific (Intra AP) trade"
    + "|EBS incl: Far East/SEA $50/TEU; INSC (Colombo/Male) $75/TEU (WEF 1-Apr-2026)"
    + "|Freetime as per ESL Tariff or as agreed"
    + "|DG (direct ports) Class 3/6/8/9: $50/20 $100/40HC"
    + "|DG (direct ports) Class 2/4: $200/20 $400/40HC"
    + "|DG (direct ports) Class 5: $500/20 $1000/40HC"
    + "|DG (T/S via PK for HCM-ITC/Jakarta/Belawan/Surabaya/LatKrabang/LCB/Haiphong/Pasir Gudang/Penang/Huangpu/Incheon) Class 3/6/8/9: $150/20 $300/40HC"
    + "|DG (T/S as above) Class 2/4: $300/20 $600/40HC"
    + "|DG PKG Group II via Port Kelang: $300/20 $600/40HC"
    + "|HAZ NOT accepted for Bangkok and Nanjing"
)

VF_AP = '2026-05-01'; VT_AP = '2026-05-31'

lines.append("-- ======== INTRA AP (1-31 May 2026) ========")
lines.append("")

# Malaysia
lines.append("-- Malaysia")
lines.append(row('Malaysia','PORT KELANG',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='CIVS/KCIS/CIX2 direct; transit ~12 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))
lines.append(row('Malaysia','PASIR GUDANG',200,300,VF_AP,VT_AP,
    via='PORT KELANG',
    surcharges=SURCH_AP,
    notes='CIVS/KCIS/CIX2 T/S via Port Kelang; transit ~22 days; incl EBS $50/teu',
    clauses=INTRA_CL_BASE))
lines.append(row('Malaysia','PENANG',200,300,VF_AP,VT_AP,
    via='PORT KELANG',
    surcharges=SURCH_AP,
    notes='CIVS/KCIS/CIX2 T/S via Port Kelang; transit ~22 days; incl EBS $50/teu',
    clauses=INTRA_CL_BASE))

lines.append("")

# Singapore
lines.append("-- Singapore")
lines.append(row('Singapore','SINGAPORE',150,350,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='CIVS/CIX2 direct; transit ~13 days; incl EBS $50/teu',
    clauses=INTRA_CL_BASE))

lines.append("")

# Maldives (INSC — EBS $75/teu)
lines.append("-- Maldives (INSC route; EBS $75/teu)")
lines.append(row('Maldives','MALE',1300,2450,VF_AP,VT_AP,
    via='COLOMBO',
    surcharges=SURCH_INSC,
    notes='CIVS/CIX2 T/S via Colombo; transit 20-22 days; incl EBS $75/teu (INSC)',
    clauses=INTRA_CL_BASE))

lines.append("")

# Vietnam
lines.append("-- Vietnam")
lines.append(row('Vietnam','CAI MEP',75,150,VF_AP,VT_AP,
    surcharges='EBS:50/teu;CIC:50/20-100/40;SEAL:8/cntr',
    notes='VGI direct; transit ~15 days; incl EBS $50/teu; CIC $50/20 $100/40HC on collect',
    clauses=INTRA_CL_BASE))
lines.append(row('Vietnam','HOCHIMINH CITY (SP-ITC)',75,150,VF_AP,VT_AP,
    surcharges='EBS:50/teu;CIC:50/20-100/40;SEAL:8/cntr',
    notes='VGI direct; transit ~16 days; incl EBS $50/teu; CIC $50/20 $100/40HC on collect',
    clauses=INTRA_CL_BASE))
lines.append(row('Vietnam','HOCHIMINH CITY (CATLAI)',75,150,VF_AP,VT_AP,
    surcharges='EBS:50/teu;CIC:50/20-100/40;SEAL:8/cntr',
    notes='VGI direct; transit ~16 days; incl EBS $50/teu; CIC $50/20 $100/40HC on collect',
    clauses=INTRA_CL_BASE))
lines.append(row('Vietnam','HAIPHONG',75,150,VF_AP,VT_AP,
    surcharges='EBS:50/teu;CIC:100/20-200/40;SEAL:8/cntr',
    notes='KCIS T/S; transit 22-25 days; incl EBS $50/teu; CIC $100/20 $200/40HC on collect',
    clauses=INTRA_CL_BASE))

lines.append("")

# China
lines.append("-- China (direct ports incl China Manifest Charges)")
lines.append(row('China','QINGDAO',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='KCIS/CIVS direct; transit ~20 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))
lines.append(row('China','SHANGHAI',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='CIVS direct; transit ~27 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))
lines.append(row('China','NINGBO',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='CIVS direct; transit ~30 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))
lines.append(row('China','DA CHAN BAY',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='CSX direct; transit ~24 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))
lines.append(row('China','NANSHA',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='CSX direct; transit ~23 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))
lines.append(row('China','XIAMEN',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='CSX direct; transit ~21 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))
lines.append(row('China','XINGANG',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='CIX2 direct; transit ~25 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))
lines.append(row('China','HUANGPU',75,150,VF_AP,VT_AP,
    via='HONG KONG/DA CHAN BAY',
    surcharges=SURCH_AP,
    notes='KCIS/CSX T/S via HK/Da Chan Bay; transit ~25 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))
lines.append(row('China','YUNFU',75,150,VF_AP,VT_AP,
    via='HONG KONG',
    surcharges=SURCH_AP,
    notes='KCIS T/S via Hong Kong; transit ~25 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))
lines.append(row('China','NANJING',75,150,VF_AP,VT_AP,
    via='SHANGHAI',
    surcharges=SURCH_AP,
    notes='CIVS T/S via Shanghai; transit ~32 days; incl EBS $50/teu; incl China Manifest Charges; HAZ NOT accepted',
    clauses=INTRA_CL_BASE))

lines.append("")

# Hong Kong
lines.append("-- Hong Kong")
lines.append(row('Hong Kong','HONG KONG',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='KCIS direct; transit ~18 days; incl EBS $50/teu; incl China Manifest Charges',
    clauses=INTRA_CL_BASE))

lines.append("")

# South Korea
lines.append("-- South Korea")
lines.append(row('South Korea','BUSAN',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='KCIS direct; transit ~26 days; incl EBS $50/teu',
    clauses=INTRA_CL_BASE))
lines.append(row('South Korea','KWANGYANG',55,110,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='KCIS direct; transit ~25 days; incl EBS $50/teu',
    clauses=INTRA_CL_BASE))
lines.append(row('South Korea','INCHEON',150,250,VF_AP,VT_AP,
    via='NINGBO',
    surcharges=SURCH_AP,
    notes='CIVS T/S via Ningbo; transit ~35 days; incl EBS $50/teu',
    clauses=INTRA_CL_BASE))

lines.append("")

# Indonesia
lines.append("-- Indonesia")
lines.append(row('Indonesia','JAKARTA',200,400,VF_AP,VT_AP,
    via='PORT KELANG',
    surcharges='EBS:50/teu;CIC:30/unit;SEAL:8/cntr',
    notes='CIVS/KCIS/CIX2 T/S via Port Kelang; transit 22-25 days; incl EBS $50/teu; CIC $30/unit on collect',
    clauses=INTRA_CL_BASE))
lines.append(row('Indonesia','SURABAYA',250,450,VF_AP,VT_AP,
    via='PORT KELANG',
    surcharges='EBS:50/teu;CIC:30/unit;SEAL:8/cntr',
    notes='CIVS/KCIS/CIX2 T/S via Port Kelang; transit 22-25 days; incl EBS $50/teu; CIC $30/unit on collect',
    clauses=INTRA_CL_BASE))
lines.append(row('Indonesia','BELAWAN',150,300,VF_AP,VT_AP,
    via='PORT KELANG',
    surcharges='EBS:50/teu;CIC:30/unit;SEAL:8/cntr',
    notes='CIVS/KCIS/CIX2 T/S via Port Kelang; transit 22-25 days; incl EBS $50/teu; CIC $30/unit on collect',
    clauses=INTRA_CL_BASE))

lines.append("")

# Thailand
lines.append("-- Thailand")
lines.append(row('Thailand','BANGKOK (PAT)',200,350,VF_AP,VT_AP,
    via='PORT KELANG/LAEM CHABANG',
    surcharges=SURCH_AP,
    notes='CIVS/KCIS/CIX2 T/S via Port Kelang/Laem Chabang; transit 20-22 days; incl EBS $50/teu; HAZ NOT accepted',
    clauses=INTRA_CL_BASE))
lines.append(row('Thailand','LAEM CHABANG',75,150,VF_AP,VT_AP,
    surcharges=SURCH_AP,
    notes='CIVS/KCIS/CIX2 direct; transit 18-20 days; incl EBS $50/teu',
    clauses=INTRA_CL_BASE))
lines.append(row('Thailand','LAT KRABANG (ICD)',125,250,VF_AP,VT_AP,
    via='PORT KELANG/LAEM CHABANG',
    surcharges=SURCH_AP,
    notes='CIVS/KCIS/CIX2 T/S via Port Kelang/Laem Chabang; transit 20-22 days; incl EBS $50/teu',
    clauses=INTRA_CL_BASE))

lines.append("")

# ============================================================
# NORTH AMERICA — Mexico (1-15 May 2026)
# KCIS/CSX-MEX T/S via Qingdao
# ============================================================
NA_CL = (
    ESL_BASE
    + "|North America / Mexico trade; Service: KCIS/CSX-MEX (T/S via Qingdao)"
    + "|AMS $30 per B/L applicable; Security Surcharge $17 per box"
    + "|14 days freetime at destination"
    + "|DG Class 3/6/8/9: add $325/20 $650/40HC (subj DG partner acceptance)"
)

lines.append("-- ======== NORTH AMERICA - MEXICO (KCIS/CSX-MEX T/S via Qingdao, 1-15 May 2026) ========")
lines.append("")
lines.append(row('Mexico','MANZANILLO',2100,2400,'2026-05-01','2026-05-15',
    via='QINGDAO',
    surcharges='EBS:incl;AMS:30/bl;SEC:17/box;SEAL:8/cntr',
    notes='KCIS/CSX-MEX T/S via Qingdao; transit 60-70 days; incl EBS; AMS $30/BL; Security Sur $17/box; 14 days freetime; DG Class 3/6/8/9: add $325/20 $650/40HC',
    clauses=NA_CL))
lines.append("")

# ============================================================
# TBL VIA MOMBASA GATEWAY (Q2 2026: 1 Apr - 30 Jun 2026)
# ============================================================
TBL_MBA_CL = (
    ESL_BASE
    + "|TBL (Through Bill of Lading) via Mombasa (KEMBA) Gateway"
    + "|Valid Q2 2026: 1 Apr - 30 Jun 2026"
    + "|Rate incl: laden movement ex Mombasa to ICD and empty return ICD to Mombasa"
    + "|Movement by rail (SGR)"
    + "|Rates excl: THD/CCC/CHC (collect or prepaid separately)"
    + "|No OOG cargo accepted; DG only class 3/5/6/8/9 permissible on SGR"
    + "|Consignee arranges own C&F and duty at destination ICD"
    + "|Container freetime starts from arrival at ICD E (not Mombasa)"
    + "|Overweight: Admin fee ADM $300/unit prepaid + OWS $300/unit; max GWT per CSC plate"
    + "|Part lot or CY/CFS shipment PROHIBITED on TBL"
    + "|Delivery Order fee at Uganda $70/BL payable by consignee (Uganda ICDs)"
)

lines.append("-- ======== TBL VIA MOMBASA GATEWAY — NAIROBI ICD (Q2 2026: 1 Apr - 30 Jun 2026) ========")
lines.append("-- Note: Two rows per ICD — non-DG rate and DG rate; weight slab up to 30MT")
lines.append("")
# Nairobi (Embakasi) — non-DG
lines.append(row('Kenya','NAIROBI (ICD EMBAKASI)',655,850,'2026-04-01','2026-06-30',
    via='MOMBASA',
    surcharges='THD:collect;CCC:collect;CHC:collect',
    notes='TBL via Mombasa; ICD code KEEMB; NON-DG rate; 20DV up to 30MT $655; 40DV/HC40 up to 30MT $850; by rail; THD/CCC/CHC excl; DG rate: $755/20 $975/40HC',
    clauses=TBL_MBA_CL))
# Nairobi (Embakasi) — DG rate as second row
lines.append(row('Kenya','NAIROBI (ICD EMBAKASI) DG',755,975,'2026-04-01','2026-06-30',
    via='MOMBASA',
    surcharges='THD:collect;CCC:collect;CHC:collect',
    notes='TBL via Mombasa; ICD code KEEMB; DG RATE; 20DV up to 30MT $755; 40DV/HC40 up to 30MT $975; by rail; only DG class 3/5/6/8/9 permissible on SGR',
    clauses=TBL_MBA_CL))
lines.append("")

lines.append("-- ======== TBL VIA MOMBASA GATEWAY — UGANDA (Q2 2026: 1 Apr - 30 Jun 2026) ========")
lines.append("-- Weight slab up to 28MT; rate is all-inclusive through rate (ex Mombasa to ICD)")
lines.append("")
uganda = [
    ('Uganda','KAMPALA','UGKLA',3163,3245),
    ('Uganda','JINJA','UGJIN',3163,3245),
    ('Uganda','ENTEBBE','UGEBB',3273,3355),
]
for dc,dp,icd,r20,r40 in uganda:
    lines.append(row(dc,dp,r20,r40,'2026-04-01','2026-06-30',
        via='MOMBASA',
        surcharges='THD:collect;CCC:collect;CHC:collect',
        notes=f'TBL via Mombasa; ICD code {icd}; up to 28MT; rate incl transit customs/transport; THD/CCC/CHC excl; Delivery Order fee $70/BL payable by consignee at Uganda; DG haulage add: $450/20DV $550/40HC over tariff',
        clauses=TBL_MBA_CL))
lines.append("")

# ============================================================
# TBL VIA DAR ES SALAAM GATEWAY (Q2 revised 2026: 14 Apr - 30 Jun 2026)
# ============================================================
TBL_DSM_CL = (
    ESL_BASE
    + "|TBL (Through Bill of Lading) via Dar Es Salaam (TZDAR) Gateway"
    + "|Valid: 14 Apr - 30 Jun 2026 (based on Shipped on Board date)"
    + "|Rate incl: customs clearance in transit through DSM; port charges; transport to final destination"
    + "|Rate excl: insurance; final destination clearance; police escort; OOG/flat rack/open top; DG/perishables"
    + "|Freight and ONC (inland haulage) MUST be prepaid at POL; collect payment restricted"
    + "|Overweight: ADM fee $300/unit + OWS $300/unit prepaid at POL; weight limit 28MT GWT"
    + "|Road weight: 20' 13.5T light / 28T heavy; 40' 28T"
    + "|Detention: $250/truck/day after free period (2 days offloading; 3 days clearance)"
    + "|Documents required 7 days prior to vessel arrival at DSM"
    + "|Part lot or CY/CFS shipment PROHIBITED on TBL"
    + "|Sugar cargo NOT recommended (regularly confiscated by KEBS)"
    + "|Used vehicles 15 years or older PROHIBITED into Uganda (eff Oct 2018)"
)

lines.append("-- ======== TBL VIA DAR ES SALAAM GATEWAY (Q2 revised 2026: 14 Apr - 30 Jun 2026) ========")
lines.append("-- Weight slab up to 28MT for all; RATE_20 = 20DV rate; RATE_40 = 40DV/HC rate")
lines.append("")

dsl_ports = [
    ('Rwanda',  'KIGALI',     'RWKGL', 6160,  6270),
    ('Burundi', 'BUJUMBURA',  'BIBJM', 6600,  6710),
    ('Zambia',  'LUSAKA',     'ZMLUN', 9900,  10010),
    ('Zambia',  'KABWE',      'ZMQKE', 9900,  10010),
    ('Zambia',  'KITWE',      'ZMKIW', 9900,  10010),
    ('Zambia',  'NDOLA',      'ZMNLA', 9900,  10010),
    ('Zambia',  'CHINGOLA',   'ZMCGJ', 9900,  10010),
    ('Zambia',  'SOLWEZI',    'ZMSLI', 11110, 11220),
    ('Malawi',  'LILONGWE',   'MWLLW', 7370,  7480),
    ('Malawi',  'MZUZU',      'MWZZU', 6270,  6380),
    ('Malawi',  'BLANTYRE',   'MWBLZ', 8250,  8360),
    ('DRC',     'LUBUMBASHI', 'CDFBM', 15290, 15345),
    ('DRC',     'BUKAVU',     'CDBKY', 8800,  8910),
    ('DRC',     'GOMA',       'CDGOM', 8580,  8690),
    ('DRC',     'LIKASI',     'CDLKS', 16500, 16610),
    ('DRC',     'KOLOWEZI',   'CDKWZ', 18260, 18315),  # correct spelling
]
for dc,dp,icd,r20,r40 in dsl_ports:
    lines.append(row(dc,dp,r20,r40,'2026-04-14','2026-06-30',
        via='DAR ES SALAAM',
        surcharges='THD:collect;CCC:collect;CHC:collect',
        notes=f'TBL via Dar Es Salaam; ICD code {icd}; up to 28MT GWT; 20DV ${r20}; 40DV/HC ${r40}; rate incl transit customs/transport to destination; THD/CCC/CHC collect; freight PREPAID mandatory',
        clauses=TBL_DSM_CL))

lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
