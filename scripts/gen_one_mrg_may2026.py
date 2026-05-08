import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL  = 'ONE'
OC  = 'India'
OP  = 'NHAVA SHEVA'
PDF = 'https://www.one-line.com/en/advanced-page/one-quote'

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, vf, vt, via='', sur='', notes='', cl=''):
    v = f"'{esc(via)}'" if via else 'NULL'
    s = f"'{esc(sur)}'" if sur else 'NULL'
    n = f"'{esc(notes)}'" if notes else 'NULL'
    c = esc(cl)
    dc_ = esc(dc); dp_ = esc(dp)
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{dc_}','{dp_}',"
        f"'USD',{r20},{r40},'{vf}','{vt}',{v},{s},{n},'{c}','{PDF}',1,'SYSTEM',GETDATE(),GETDATE());"
    )

lines = []
lines.append("-- ============================================================")
lines.append("-- ONE MRG May 2026 — Compiled EA+WA+RS+EUR+MED+AUS+NZ+CSE+LEW+LWE+Africa")
lines.append("-- Origin: Nhava Sheva (INNSA) | All rates USD | CY/CY non-haz")
lines.append("-- EFS: $60/20 $120/40 EA/WA; $120/20 $240/40 all other trades (eff 01-May-2026)")
lines.append("-- OBS extra: EUR $117/teu | MED $119/teu | LAEC $160/320 per D2/D4")
lines.append("-- EES extra: EUR $95/teu | MED $182/teu")
lines.append("-- HEA: $300/20GP (>=16T EU/MED); $600/20GP (>=18T MED only)")
lines.append("-- War Risk: USD 55/TEU for Gulf/Red Sea as applicable")
lines.append("-- ============================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ── SURCHARGE CONSTANTS ───────────────────────────────────────────────────────
EA_S  = 'ISL:32/cntr;OBS:incl;PSF:incl;SLF:10/cntr;EFS:60/20-120/40'
JP_S  = 'ISL:32/cntr;OBS:incl;PSF:incl;SLF:10/cntr;YAS:incl;AMA:collect;AMS:collect;EFS:60/20-120/40'
BD_S  = 'ISL:32/cntr;OBS:incl;PSF:incl;SLF:10/cntr;THD:incl;CGD:incl;EFS:60/20-120/40'
PH_S  = 'ISL:32/cntr;OBS:incl;PSF:incl;SLF:10/cntr;EIS:collect;CCC:collect;EFS:60/20-120/40'
MY_S  = 'ISL:32/cntr;OBS:incl;PSF:incl;SLF:10/cntr;CCC:collect;DPC:collect;EDI:collect;EFS:60/20-120/40'
KR_S  = 'ISL:32/cntr;OBS:incl;PSF:incl;SLF:10/cntr;CCC:collect;CSC:collect;WHA:collect;LSF:collect;EFS:60/20-120/40'
VN_S  = 'ISL:32/cntr;OBS:incl;PSF:incl;SLF:10/cntr;VVN:collect;CCC:collect;EFS:60/20-120/40'
TH_S  = 'ISL:32/cntr;OBS:incl;PSF:incl;SLF:10/cntr;CCC:collect;CMC:collect;RCR:collect;EFS:60/20-120/40'

EUR_S = 'OBS:117/teu;EES:95/teu;EFS:120/20-240/40;ESD:collect;SLF:collect;HEA:300/20gp-16T+;FGP:100/cntr'
MED_S = 'OBS:119/teu;EES:182/teu;EFS:120/20-240/40;ESD:collect;SLF:collect;HEA:300-600/20gp;FGP:100/cntr'

AUS_S = 'ISL:32/cntr;SLF:10/cntr;OBS:incl;MBS:incl;EFS:120/20-240/40'
CSE_S = 'CSS:15/cntr;SLF:10/cntr;PCT:40/teu;EFS:120/20-240/40;OBS:incl;PSS:incl;HEA:200/20gp-18T+'
LEW_S = 'CSS:15/cntr;SLF:10/cntr;EFS:120/20-240/40;OBS:incl;PSS:incl;HEA:collect'
LWE_S = 'CSS:15/cntr;SLF:10/cntr;EFS:120/20-240/40;OBS:incl;PSS:incl;BAF:incl;BRS:incl;HEA:collect'
AFR_S = 'CSS:collect;SLF:10/cntr;EFS:120/20-240/40;OBS:incl;WRC:incl;HAZ:200/teu'
ZAF_S = 'CSS:collect;SLF:10/cntr;EFS:120/20-240/40;OBS:incl;WRC:incl;HAZ:200/teu;PRS:ZAR52/cntr'

# ── CLAUSES ───────────────────────────────────────────────────────────────────
EA_CL = (
    "ONE MRG May 2026 | East/West Asia Trade (IWE) | Nhava Sheva (INNSA)"
    "|Rates incl ISL($32/cntr)/OBS/PSF/SLF($10/cntr); CY/CY non-haz; freight prepaid"
    "|EFS USD 60/20ft USD 120/40ft Dry extra on collect (eff 01-May-2026)"
    "|14 days freetime detention at destination for Dry"
    "|War Risk USD 55/TEU for Gulf/Red Sea ports as applicable"
    "|HEA: not applicable for cargo wt+tare <=17.71T; check ONE if excess weight before booking"
    "|Bookings on feeder space via SIN subject to approval — reserve before placing booking"
    "|Rates NOT applicable for lot shipments of Onion/Soya/Agri products/Raw Cotton"
    "|Flexitanks not accepted; bulk commodity loose stuffing not accepted"
    "|EIS Manila North collect: USD 402/20 USD 803/40 all cntr types"
    "|DG surcharge: IMO 2=$300/600; 3/4/6/8/9=$150/300; 5=$300/600; via SIN PSA addon extra"
    f"|{PDF}"
)

EUR_CL = (
    "ONE MRG May 2026 | Europe Trade (WEW/IOX) | Nhava Sheva (INNSA)"
    "|Rates incl CAF/CSS/HEA/MBS; OFT is base ocean freight"
    "|OBS extra: USD 117/teu | EES extra: USD 95/teu | EFS extra: USD 120/20 USD 240/40"
    "|ESD extra (prepaid) | SLF extra collect | THD/THL/DOC/DOF extra"
    "|HEA: USD 300/20GP for net wt >= 16MT (Europe)"
    "|FGP: USD 100/cntr for food grade containers only"
    "|DG surcharge: USD 200/TEU"
    "|Standard freetime 14 days detention at destination for Dry"
    f"|{PDF}"
)

MED_CL = (
    "ONE MRG May 2026 | MED Trade (WMW/IOM) | Nhava Sheva (INNSA)"
    "|Rates incl CAF/CSS/MBS; OFT is base ocean freight"
    "|OBS extra: USD 119/teu | EES extra: USD 182/teu | EFS extra: USD 120/20 USD 240/40"
    "|ESD extra | SLF extra collect | THD/THL/DOC/DOF extra"
    "|HEA: USD 300/20GP (net wt >= 16MT MED); USD 600/20GP (net wt >= 18MT MED only)"
    "|FGP: USD 100/cntr for food grade containers only"
    "|DG surcharge: USD 200/TEU"
    "|Standard freetime 14 days detention at destination for Dry"
    f"|{PDF}"
)

AUS_CL = (
    "ONE MRG May 2026 | Australia & New Zealand Trade (AUS/NZS) | Nhava Sheva (INNSA)"
    "|Rates incl MBS/OBS; ISL $32/cntr and SLF $10/cntr extra"
    "|EFS extra: USD 120/20 USD 240/40 Dry (eff 01-May-2026)"
    "|Flexi-tank add-on: USD 100/TEU"
    "|DG: Class 1/7 not accepted; 2.1/2.2/2.3=$300/600; 3/4/6/8/9=$150/300; 5=$300/600"
    "|PSA surcharge for DG via SIN: Group 1/1D/2=$538/753; 1S/2S/2A/2B/2F=$269/538; 3=$0"
    "|Standard freetime at POD"
    f"|{PDF}"
)

CSE_CL = (
    "ONE MRG May 2026 | Caribbean/Central America (CSE) | Nhava Sheva (INNSA)"
    "|Rates incl EFS/MBS/OBS/PSS; CSS $15/cntr SLF $10/cntr PCT $40/teu extra"
    "|EFS: USD 120/20 USD 240/40 Dry (eff 01-May-2026)"
    "|HEA: nil for cargo wt <=17.99T; USD 200/20ft for cargo wt >18T"
    "|OBS: USD 160/320/320/544 per D2/D4/D5/R5 NOR (Q2 Apr-Jun 2026)"
    "|DG Class 1/7 not accepted; 2.1=$450/800; 2.2=$300/600; other 2=$700/1400"
    "|DG Class 3/4/5/6.1/6.2=$200/400; 8/9=$100/200"
    "|Freetime: 12 days at most PODs (15 days Puerto Cortes/Santo Tomas; 20 days Port au Prince)"
    "|San Juan shipment governed by FMC — service contract filing required BEFORE cargo gates in"
    "|Haiti requires due diligence procedures"
    f"|{PDF}"
)

LEW_CL = (
    "ONE MRG May 2026 | South America East (LEW/LAEC) | Nhava Sheva (INNSA)"
    "|Rates incl EFS/HEA/MBS/OBS/PSS; CSS $15/cntr SLF $10/cntr extra"
    "|EFS: USD 120/20 USD 240/40 Dry (eff 01-May-2026)"
    "|HEA: nil for cargo wt <=23.99T; USD 200/20ft for cargo wt >18T (as applicable)"
    "|OBS: USD 160/320/320/544 per D2/D4/D5/R5 NOR (Q2 Apr-Jun 2026)"
    "|IFL/IFD (Inland Fuel Charge) applicable for carrier inland transport eff Apr 2 2026"
    "|Freetime: 18 days at most LAEC ports; 14 days Buenos Aires; 21 days Asuncion"
    f"|{PDF}"
)

LWE_CL = (
    "ONE MRG May 2026 | South America West (LWE) | Nhava Sheva (INNSA)"
    "|Rates incl BAF/BRS/EFS/MBS/OBS/PSS; CSS $15/cntr SLF $10/cntr extra"
    "|EFS: USD 120/20 USD 240/40 Dry (eff 01-May-2026)"
    "|HEA: USD 150/20ft wt 18.01-21T; USD 200/20ft above 21T"
    "|ENS applicable for Mexico ports"
    "|IFL/IFD (Inland Fuel Charge) applicable for carrier inland transport eff Apr 2 2026"
    "|Freetime: 21 days Chile/Peru/Mexico; 20 days Colombia; 18 days Ecuador"
    "|Freetime: 17 days Guatemala; 16 days Nicaragua/Costa Rica/El Salvador/Honduras; 12 days Panama"
    f"|{PDF}"
)

AFR_CL = (
    "ONE MRG May 2026 | Africa Trade (EFW/WFW) | Nhava Sheva (INNSA)"
    "|Rates incl AMS/BAF/BRS/CGD/EPH/HEA/LSF/MBS/OBS/PSS/WRC as applicable per port"
    "|CSS/SLF/THL/DOC/EFS extra; EFS: USD 120/20 USD 240/40 (eff 01-May-2026)"
    "|HAZ surcharge: USD 200/TEU"
    "|14 days freetime detention at destination for Dry"
    "|DG ex SGSIN bound by PSA CHEM care — cost on shipper account"
    f"|{PDF}"
)

ZAF_CL = (
    "ONE MRG May 2026 | South Africa Trade (ZFW) | Nhava Sheva (INNSA)"
    "|Rates incl BAF/BRS/CGD/HEA/MBS/OBS/PSS/WRC as applicable per port"
    "|AMS/CSS/SLF/THL/DOC/EFS extra; EFS: USD 120/20 USD 240/40 (eff 01-May-2026)"
    "|HAZ surcharge: USD 200/TEU"
    "|PORT SURCHARGE (PRS): ZAR 52/cntr collect (eff 01-May-2026)"
    "|14 days freetime detention at destination for Dry"
    f"|{PDF}"
)

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — EAST ASIA / WEST ASIA (IWE)  May 2026
# ═══════════════════════════════════════════════════════════════════════════════
VF_EA = '2026-05-01'; VT_EA = '2026-05-31'

lines.append("-- ======== EAST ASIA / WEST ASIA (IWE) — May 2026 ========")
lines.append("-- Incl: ISL/OBS/PSF/SLF | EFS $60/20 $120/40 extra | 14d freetime at POD")
lines.append("-- Middle East (Jebel Ali/Dammam/Riyadh/Bahrain/Shuaiba/Ajman/Shuwaikh/Sohar/Hamad/Umm Qasr/Abu Dhabi): NO OFFER")
lines.append("")

# data: (country, port, r20, r40, via, service_notes, surcharges)
ea = [
    # Brunei
    ('Brunei',       'MUARA',                   871,   1636, '',              'IWE (PS3)-SGSIN-(FDR); HC $1649',                                          EA_S),
    # Indonesia
    ('Indonesia',    'JAKARTA',                  79,    125, '',              'IWE (PS3)-SGSIN-(JID)',                                                     EA_S),
    ('Indonesia',    'PANJANG TERMINAL',        859,   1601, 'JAKARTA',       'IWE (PS3)-SGSIN-(JID) feeder; T/S Jakarta',                                 EA_S),
    ('Indonesia',    'CIKARANG',                740,    905, 'JAKARTA',       'IWE (PS3)-SGSIN-(JID) feeder; T/S Jakarta',                                 EA_S),
    ('Indonesia',    'PALEMBANG',               265,    575, '',              'IWE (NCI)-SGSIN-(SPL)',                                                     EA_S),
    ('Indonesia',    'BELAWAN',                 249,    577, '',              'IWE (PS3)-SGSIN-(BMX)',                                                     EA_S),
    ('Indonesia',    'SEMARANG',                195,    250, '',              'IWE (PS3)-SGSIN-(SRG)',                                                     EA_S),
    ('Indonesia',    'SURABAYA',                163,    160, '',              'IWE (PS3)-SGSIN-(SSX)',                                                     EA_S),
    ('Indonesia',    'BALIKPAPAN',              750,   1375, 'JAKARTA',       'IWE (PS3)-SGSIN-(JID) feeder; T/S Jakarta',                                 EA_S),
    # Japan
    ('Japan',        'KOBE',                     25,     50, '',              'IWE (PS3)-SGSIN-(FP1); incl YAS/AMA/AMS',                                   JP_S),
    ('Japan',        'HIROSHIMA',               485,    306, 'KOBE',          'IWE (PS3)-SGSIN-(FP1) feeder via Kobe; incl YAS/AMA/AMS',                   JP_S),
    ('Japan',        'OITA',                    380,    950, 'KOBE',          'IWE (PS3)-SGSIN-(FP1) feeder via Kobe; incl YAS/AMA/AMS',                   JP_S),
    ('Japan',        'MATSUYAMA',               465,    480, 'KOBE',          'IWE (PS3)-SGSIN-(FP1) feeder via Kobe; incl YAS/AMA/AMS',                   JP_S),
    ('Japan',        'MIZUSHIMA',               365,    775, 'KOBE',          'IWE (PS3)-SGSIN-(JID) feeder via Kobe; incl YAS/AMA/AMS',                   JP_S),
    ('Japan',        'MOJI',                    200,    530, 'KOBE',          'IWE (PS3)-SGSIN-(FP1) feeder via Kobe; incl YAS/AMA/AMS',                   JP_S),
    ('Japan',        'OSAKA',                   250,    420, 'KOBE',          'IWE (PS3)-SGSIN-(FP1) feeder via Kobe; incl YAS/AMA/AMS',                   JP_S),
    ('Japan',        'SHIBUSHI',                510,    745, 'KOBE',          'IWE (PS3)-SGSIN-(FP1) feeder via Kobe; incl YAS/AMA/AMS',                   JP_S),
    ('Japan',        'HAKATA',                  490,    815, '',              'IWE (PS3)-SGSIN-(FP1)-JPUKB-(JK2); incl YAS/AMA/AMS',                       JP_S),
    ('Japan',        'NAGOYA',                  172,     50, '',              'IWE (PS3)-SGSIN-(JSM); incl YAS/AMA/AMS',                                   JP_S),
    ('Japan',        'TOKYO',                   220,    220, '',              'IWE (PS3)-SGSIN-(JSM); incl YAS/AMA/AMS',                                   JP_S),
    ('Japan',        'YOKOHAMA',                135,     50, '',              'IWE (PS3)-SGSIN-(JSM); incl YAS/AMA/AMS',                                   JP_S),
    ('Japan',        'SENDAI',                  690,    659, 'TOKYO',         'IWE (PS3)-SGSIN-(JSM) feeder via Tokyo; HC $660; incl YAS/AMA/AMS',          JP_S),
    ('Japan',        'SHIMIZU',                 345,    220, '',              'IWE (PS3)-SGSIN-(JID); incl YAS/AMA/AMS',                                   JP_S),
    ('Japan',        'YOKKAICHI',               218,     50, '',              'IWE (NCI)-SGSIN-(JID); incl YAS/AMA/AMS',                                   JP_S),
    ('Japan',        'NIIGATA',                 332,    375, '',              'IWE (PS3)-SGSIN-(MD2)-KRPUS-(BNX); incl YAS/AMA/AMS',                       JP_S),
    ('Japan',        'TOMAKOMAI',               358,    495, '',              'IWE (PS3)-SGSIN-(MD3)-KRPUS-(HAS); incl YAS/AMA/AMS',                       JP_S),
    ('Japan',        'HACHINOHE',              1002,   1503, '',              'IWE (PS3)-SGSIN-(MD3)-KRPUS-(FDR); incl YAS/AMA/AMS',                       JP_S),
    # China — N.PRC
    ('China',        'QINGDAO',                   5,      5, '',              'IWE (NCI); incl AMA/AMS/EIR',                                               EA_S),
    ('China',        'XINGANG',                   5,      5, '',              'IWE (NCI); incl AMA/AMS/EIR',                                               EA_S),
    ('China',        'DALIAN',                  260,    300, '',              'IWE (PS3)-SGSIN-(MD2)-KRPUS-(GS2); incl AMA/AMS/EIR',                       EA_S),
    # China — C.PRC
    ('China',        'SHANGHAI',                  5,      5, '',              'IWE (CIP); incl AMA/AMS/EIR/PCO',                                           EA_S),
    ('China',        'NINGBO',                    5,      5, '',              'IWE (CIP); incl AMA/AMS/EIR/PCO',                                           EA_S),
    ('China',        'NANTONG',                 217,     50, 'SHANGHAI',      'IWE (CIP) feeder via Shanghai; incl AMA/AMS/EIR/PCO',                        EA_S),
    ('China',        'ZHANGJIAGANG',             55,    200, 'SHANGHAI',      'IWE (CIP) feeder via Shanghai; incl AMA/AMS/EIR/PCO',                        EA_S),
    ('China',        'LIANYUNGANG',             197,    146, 'SHANGHAI',      'IWE (CIP) feeder via Shanghai; incl AMA/AMS/EIR',                            EA_S),
    ('China',        'WUHAN',                    80,    300, 'SHANGHAI',      'IWE (CIP) feeder via Shanghai; HC $25 (verify); incl AMA/AMS/EIR/PCO',       EA_S),
    ('China',        'CHONGQING',               685,    485, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    # China — S.PRC Guangdong (all via HK)
    ('China',        'GUANGZHOU',               585,    805, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'NANSHA',                   75,    135, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'HUANGPU',                  25,     50, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'QINZHOU',                 156,    365, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'GAOLAN',                  206,    445, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'GONGYI',                  100,    150, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'JIANGMEN',                100,     75, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'RONGQI',                   50,    185, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'SANSHAN',                 200,    225, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'BEIJIAO',                  25,     50, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'XIAOLAN',                  15,     25, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'ZHONGSHAN',                15,     25, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'ZHUHAI',                   15,     25, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    # China — S.PRC Fujian
    ('China',        'FUZHOU',                  290,    240, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR/PCO/PSE',                   EA_S),
    ('China',        'XIAMEN',                  195,    260, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; HC $259; incl AMA/AMS/EIR',                  EA_S),
    # China — S.PRC Shenzhen
    ('China',        'SHEKOU',                  235,    260, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    ('China',        'YANTIAN',                 215,    265, 'HONG KONG',     'IWE (CIP) feeder via Hong Kong; incl AMA/AMS/EIR',                           EA_S),
    # Hong Kong
    ('Hong Kong',    'HONG KONG',                 5,      5, '',              'IWE (CIP)',                                                                  EA_S),
    # Korea
    ('South Korea',  'BUSAN',                     5,     10, '',              'IWE (NPI); incl CCC/CSC/WHA/LSF collect',                                    KR_S),
    ('South Korea',  'INCHEON',                  25,      5, '',              'IWE (PS3)-SGSIN-(KC2); incl CCC/CSC/WHA/LSF collect',                        KR_S),
    ('South Korea',  'KWANGYANG',             10089,    141, 'SHANGHAI',      'IWE (CIP)-CNSHA-(PS6); NOTE: 20ft rate 10089 appears source data anomaly — verify before booking', KR_S),
    # Taiwan
    ('Taiwan',       'KAOHSIUNG',               110,    255, '',              'IWE (NCI)',                                                                  EA_S),
    ('Taiwan',       'KEELUNG',                 495,    680, 'KAOHSIUNG',     'IWE (NCI) feeder via Kaohsiung',                                             EA_S),
    ('Taiwan',       'TAICHUNG',                210,    525, 'KAOHSIUNG',     'IWE (NCI) feeder via Kaohsiung',                                             EA_S),
    ('Taiwan',       'TAOYUAN',                 300,    590, 'KAOHSIUNG',     'IWE (NCI) feeder via Kaohsiung',                                             EA_S),
    # Malaysia
    ('Malaysia',     'PORT KLANG',                5,     10, '',              'IWE (NCI); incl CCC/DPC/EDI collect',                                        MY_S),
    ('Malaysia',     'PASIR GUDANG',            100,    100, '',              'IWE (PS3)-SGSIN-(PG2); incl CCC/DPC/EDI collect',                            MY_S),
    ('Malaysia',     'PENANG',                  115,    150, '',              'IWE (PS3)-SGSIN-(PF1); incl CCC/DPC/EDI collect',                            MY_S),
    ('Malaysia',     'KUCHING',                 720,   1285, '',              'IWE (PS3)-SGSIN-(FDR); incl CCC/DPC/EDI collect',                            MY_S),
    ('Malaysia',     'KOTA KINABALU',           791,   1323, '',              'IWE (PS3)-SGSIN-(FDR); incl CCC/DPC/EDI collect',                            MY_S),
    # Singapore
    ('Singapore',    'SINGAPORE',                 5,     10, '',              'IWE (NCI)',                                                                  EA_S),
    # Thailand
    ('Thailand',     'LAEM CHABANG',             20,     30, '',              'IWE (JTI); incl CCC/CMC/RCR collect',                                        TH_S),
    ('Thailand',     'BANGKOK (BMT/PAT)',         49,     50, 'LAEM CHABANG', 'IWE (JTI) feeder via Laem Chabang; incl CCC/CMC/RCR collect',                TH_S),
    ('Thailand',     'LAT KRABANG (ICD)',         25,     35, 'LAEM CHABANG', 'IWE (JTI) feeder via Laem Chabang; incl CCC/CMC collect',                    TH_S),
    ('Thailand',     'SONGKHLA',                145,    125, '',              'IWE (PS3)-SGSIN-(SGZ); incl CCC/CMC collect',                                TH_S),
    # Vietnam
    ('Vietnam',      'HO CHI MINH (CAI MEP)',     5,      5, '',              'IWE (PS3) direct Cai Mep; incl VVN/CCC collect',                             VN_S),
    ('Vietnam',      'HO CHI MINH',              15,     30, 'CAI MEP',       'IWE (PS3) feeder via Cai Mep; incl VVN collect',                             VN_S),
    ('Vietnam',      'HAIPHONG',                 99,    100, '',              'IWE (PS3)-SGSIN-(CCX); incl VVN/CCC/CMC collect',                            VN_S),
    ('Vietnam',      'DANANG',                  435,    470, '',              'IWE (NCI)-SGSIN-(NV2); incl VVN collect',                                    VN_S),
    # Philippines
    ('Philippines',  'MANILA',                  249,    365, '',              'IWE (PS3)-SGSIN-(PHX); EIS collect $402/20 $803/40',                         PH_S),
    ('Philippines',  'CEBU',                    285,    365, '',              'IWE (PS3)-SGSIN-(PH2); EIS collect; incl CCC',                               PH_S),
    ('Philippines',  'SUBIC',                   323,    533, '',              'IWE (PS3)-SGSIN-(PHX); EIS collect; incl CCC',                               PH_S),
    ('Philippines',  'GENERAL SANTOS',          395,   8624, 'GENERAL SANTOS','IWE (PS3)-SGSIN-(PH3); NOTE: 40ft rate 8624/HC 8623 may be source data anomaly — verify', PH_S),
    ('Philippines',  'BATANGAS',                700,    500, '',              'IWE (PS3)-SGSIN-(FDR); EIS collect; incl CCC',                               PH_S),
    # Cambodia
    ('Cambodia',     'PHNOM PENH',              265,    670, '',              'IWE (PS3)-VNCMP-(9VA)',                                                      EA_S),
    ('Cambodia',     'SIHANOUKVILLE',           274,    200, '',              'IWE (PS3)-SGSIN-(SIH)',                                                      EA_S),
    # Myanmar
    ('Myanmar',      'YANGON',                  459,    538, '',              'IWE (NCI)-SGSIN-(SMM)',                                                      EA_S),
    # Bangladesh
    ('Bangladesh',   'CHITTAGONG',              850,   1000, '',              'IWE (CIP)-LKCMB-(BA2); rates incl ISL/OBS/PSF/SLF/THD/CGD; subj XDD/AMS',   BD_S),
    ('Bangladesh',   'DHAKA',                  1635,   2615, 'COLOMBO',       'IWE (CIP)-LKCMB-(BA2) feeder via Colombo; HC $2150; incl ISL/OBS/PSF/SLF/THD/CGD', BD_S),
    # Sri Lanka
    ('Sri Lanka',    'COLOMBO',                 319,    413, '',              'IWE (NCI)',                                                                  EA_S),
    # Maldives
    ('Maldives',     'MALE',                   1367,   2160, 'COLOMBO',       'IWE (WIN)-LKCMB-(FDR) feeder via Colombo; incl LIO collect',                 EA_S),
    # Egypt / Red Sea (has rates unlike other Gulf)
    ('Egypt',        'AIN SOKHNA',             1400,   1800, '',              'IWE (RGI); incl EST/AMA collect',                                            EA_S),
    # Saudi Arabia Jeddah — has rate (not in no-offer list)
    ('Saudi Arabia', 'JEDDAH',                 1250,   1650, '',              'IWE (RGI); incl FED/OCR/XDD collect',                                        EA_S),
]

for dc, dp, r20, r40, via, notes, sur in ea:
    lines.append(row(dc, dp, r20, r40, VF_EA, VT_EA, via=via, sur=sur, notes=notes, cl=EA_CL))

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — EUROPE (WEW / IOX)  1–15 May 2026
# ═══════════════════════════════════════════════════════════════════════════════
VF_EU = '2026-05-01'; VT_EU = '2026-05-15'

lines.append("-- ======== EUROPE (WEW/IOX) — 1-15 May 2026 ========")
lines.append("-- OBS $117/teu | EES $95/teu | EFS $120/20 $240/40 | ESD | SLF | HEA $300/20GP (>=16T) — all extra")
lines.append("")

eur = [
    # Belgium / Netherlands / Germany core
    ('Belgium',     'ANTWERP',                  1385,  1110, '',         'IOX direct'),
    ('Netherlands', 'ROTTERDAM',                1385,  1110, '',         'IOX direct'),
    ('Germany',     'HAMBURG',                  1385,  1110, '',         'IOX direct'),
    ('France',      'LE HAVRE',                 1435,  1210, '',         'IOX direct'),
    # UK
    ('UK',          'SOUTHAMPTON',              1385,  1110, '',         'IOX direct'),
    ('UK',          'COATBRIDGE',               1985,  1690, '',         'IOX'),
    ('UK',          'GRANGEMOUTH',              1885,  1790, '',         'IOX via Rotterdam-(UKE)'),
    ('UK',          'IMMINGHAM',                1885,  1910, 'ROTTERDAM','IOX via Rotterdam-(UKE); HC $1910'),
    ('UK',          'SOUTH SHIELDS',            1855,  1990, '',         'IOX via Rotterdam-(UKE)'),
    ('UK',          'TEESPORT',                 1885,  1790, '',         'IOX via Rotterdam-(UKE)'),
    ('UK',          'BELFAST',                  2085,  1560, '',         'IOX via Rotterdam-(IRX)'),
    # Ireland
    ('Ireland',     'DUBLIN',                   1785,  1560, '',         'IOX via Southampton-(IRX)'),
    ('Ireland',     'CORK',                     1785,  1560, '',         'IOX direct'),
    # Sweden
    ('Sweden',      'GOTHENBURG',               1435,  1210, '',         'IOX via Antwerp-(SCX)'),
    ('Sweden',      'HELSINGBORG',              1585,  1360, '',         'IOX via Antwerp-(SCX)'),
    ('Sweden',      'AAHUS',                    1885,  1660, '',         'IOX'),
    ('Sweden',      'GAVLE',                    1685,  1660, '',         'IOX via Antwerp-(SBX); HC $1560'),
    ('Sweden',      'SODERTALJE',               1835,  1810, '',         'IOX'),
    ('Sweden',      'STOCKHOLM',                2585,  2810, '',         'IOX'),
    ('Sweden',      'NORRKOPING',               2635,  2760, '',         'IOX'),
    # Denmark
    ('Denmark',     'AARHUS',                   1585,  1310, '',         'IOX via Antwerp-(SCX)'),
    ('Denmark',     'COPENHAGEN',               1585,  1310, '',         'IOX via Antwerp-(SCX)'),
    ('Denmark',     'AALBORG',                  1810,  1685, '',         'IOX'),
    ('Denmark',     'FREDERICIA',               1585,  1310, 'HAMBURG',  'IOX via Hamburg-(SC2)'),
    # Norway
    ('Norway',      'OSLO',                     2335,  2110, '',         'IOX'),
    ('Norway',      'BERGEN',                   2185,  2610, '',         'IOX'),
    ('Norway',      'FREDRIKSTAD',              2110,  2110, '',         'IOX'),
    ('Norway',      'KRISTIANSAND S.',          2135,  2310, '',         'IOX'),
    ('Norway',      'LARVIK',                   2085,  2235, '',         'IOX'),
    # Finland
    ('Finland',     'HELSINKI',                 1535,  1310, '',         'IOX via Rotterdam-(FI2)'),
    ('Finland',     'KOTKA',                    1535,  1310, '',         'IOX via Rotterdam-(FI2)'),
    ('Finland',     'RAUMA',                    1535,  1310, '',         'IOX via Antwerp-(SBX)'),
    ('Finland',     'OULU',                     2745,  3310, '',         'IOX; HC $2710'),
    # Estonia / Latvia / Lithuania
    ('Estonia',     'TALLINN',                  1635,  1410, '',         'IOX via Rotterdam-(FI2)'),
    ('Latvia',      'RIGA',                     1635,  1410, '',         'IOX via Southampton-(IBX)'),
    ('Lithuania',   'KLAIPEDA',                 1635,  1410, '',         'IOX via Southampton-(IBX)'),
    # Poland
    ('Poland',      'GDANSK',                   1435,  1210, '',         'IOX via Southampton-(IBX)'),
    ('Poland',      'GDYNIA',                   1435,  1210, '',         'IOX via Antwerp-(SBX)'),
    # Portugal
    ('Portugal',    'LEIXOES',                  1535,  1410, 'ROTTERDAM','IOX via Rotterdam-(IBX)'),
    ('Portugal',    'LISBON',                   1535,  1410, 'ROTTERDAM','IOX via Rotterdam-(LUX)'),
    # Spain (WEW scope but IOM-ESALG routing — no HEA in Include)
    ('Spain',       'BILBAO',                   1895,  1785, '',         'IOX via IOM-ESALG-(FDR); WHA collect'),
    ('Spain',       'GIJON',                    1895,  1785, '',         'IOX via IOM-ESALG-(FDR); WHA collect; CCU collect'),
    ('Spain',       'VIGO',                     1895,  1785, '',         'IOX via IOM-ESALG-(FDR); WHA collect'),
]

for dc, dp, r20, r40, via, notes in eur:
    lines.append(row(dc, dp, r20, r40, VF_EU, VT_EU, via=via, sur=EUR_S, notes=f'WEW IOX service; {notes}', cl=EUR_CL))

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — MED (WMW / IOM)  1–15 May 2026
# ═══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== MED (WMW/IOM) — 1-15 May 2026 ========")
lines.append("-- OBS $119/teu | EES $182/teu | EFS $120/20 $240/40 | HEA $300/20GP(>=16T)/$600(>=18T) — all extra")
lines.append("")

med = [
    # Greece
    ('Greece',      'PIRAEUS',                  1645,  1285, '',         'IOM direct'),
    ('Greece',      'THESSALONIKI',             1745,  1485, 'PIRAEUS',  'IOM via Piraeus-(IGX)'),
    # Italy
    ('Italy',       'GENOA',                    1645,  1285, '',         'IOM direct'),
    ('Italy',       'LA SPEZIA',                1645,  1285, '',         'IOM via Valencia-(MS2)'),
    ('Italy',       'LIVORNO',                  1845,  1685, '',         'IOM'),
    ('Italy',       'ANCONA',                   1695,  1385, '',         'IOM via Piraeus-(AD1)'),
    ('Italy',       'RAVENNA',                  2045,  1985, '',         'IOM'),
    ('Italy',       'TRIESTE',                  2095,  2085, '',         'IOM'),
    ('Italy',       'VENICE',                   1745,  1485, '',         'IOM via Piraeus-(AD1)'),
    # Spain (MED)
    ('Spain',       'ALGECIRAS',                1645,  1285, '',         'IOM direct'),
    ('Spain',       'BARCELONA',                1645,  1285, '',         'IOM direct'),
    ('Spain',       'VALENCIA',                 1645,  1285, '',         'IOM direct'),
    # France (MED)
    ('France',      'FOS-SUR-MER',              1645,  1285, '',         'IOM via Genoa-(MS2)'),
    # Croatia
    ('Croatia',     'RIJEKA',                   2095,  2185, '',         'IOM direct'),
    # Slovenia
    ('Slovenia',    'KOPER',                    1695,  1385, '',         'IOM via Piraeus-(AD1)'),
    # Albania
    ('Albania',     'DURRES',                   1800,  1800, '',         'IOM direct'),
    # Turkey
    ('Turkey',      'ISTANBUL',                 1695,  1385, '',         'IOM via Piraeus-(MD1)'),
    ('Turkey',      'IZMIT',                    1695,  1385, '',         'IOM via Piraeus-(MD1)'),
    ('Turkey',      'IZMIR (ALIAGA)',            1695,  1385, '',         'IOM via Piraeus-(AEX)'),
    ('Turkey',      'GEBZE',                    1695,  1385, '',         'IOM direct'),
    ('Turkey',      'GEMLIK',                   1895,  1785, '',         'IOM via AEX'),
    ('Turkey',      'ISKENDERUN',               1745,  1485, '',         'IOM direct'),
    ('Turkey',      'MERSIN',                   1695,  1385, '',         'IOM via Piraeus-(MD1)'),
    # Bulgaria
    ('Bulgaria',    'BOURGAS',                  2145,  2285, '',         'IOM via Piraeus-Trieste-(BT1)'),
    ('Bulgaria',    'VARNA',                    2710,  2400, '',         'IOM via Piraeus-Trieste-(BT1)'),
    # Romania
    ('Romania',     'CONSTANTA',                2145,  2285, '',         'IOM via Piraeus-Trieste-(BT3)'),
    # Egypt (MED)
    ('Egypt',       'ALEXANDRIA',               1745,  1485, '',         'IOM via Piraeus-(MD1)'),
    ('Egypt',       'DAMIETTA',                 1645,  1285, '',         'IOM via Piraeus-(MD1)'),
    # Israel
    ('Israel',      'ASHDOD',                   1845,  1685, '',         'IOM via Piraeus-(AD1)'),
    ('Israel',      'HAIFA',                    1845,  1685, '',         'IOM via Piraeus-(AD1)'),
    # Lebanon
    ('Lebanon',     'BEIRUT',                   1795,  1585, '',         'IOM via Piraeus-Damietta-(EL2)'),
    # Morocco
    ('Morocco',     'CASABLANCA',               3440,  4540, '',         'IOM via Algeciras-(IMS)'),
    ('Morocco',     'TANGIER',                  2940,  3540, '',         'IOM via Valencia-(FDR)'),
]

for dc, dp, r20, r40, via, notes in med:
    lines.append(row(dc, dp, r20, r40, VF_EU, VT_EU, via=via, sur=MED_S, notes=f'WMW IOM service; {notes}', cl=MED_CL))

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — AUSTRALIA & NEW ZEALAND (AUS/NZS)  1–14 May 2026
# ═══════════════════════════════════════════════════════════════════════════════
VF_AU = '2026-05-01'; VT_AU = '2026-05-14'

lines.append("-- ======== AUSTRALIA & NEW ZEALAND (AUS/NZS) — 1-14 May 2026 ========")
lines.append("-- Rates incl MBS/OBS; ISL $32/cntr SLF $10/cntr EFS $120/20 $240/40 extra")
lines.append("")

aus = [
    ('Australia', 'ADELAIDE',              925,  1850, '',          'AUS (PS3)-SGSIN-(AU1)'),
    ('Australia', 'MELBOURNE & BRISBANE',  925,  1850, '',          'AUS (CIP)-MYPKG-(AU1)'),
    ('Australia', 'FREMANTLE',             925,  1850, 'SINGAPORE', 'AUS (PS3)-SGSIN-(WAU)'),
    ('Australia', 'SYDNEY',                925,  1850, '',          'AUS (NCI)-SGSIN-(AU1)'),
    ('New Zealand','AUCKLAND',             900,  1700, '',          'NZS (PS3)-SGSIN-(NZ1)'),
    ('New Zealand','LYTTELTON/NAPIER/TAURANGA', 900, 1700, '',      'NZS (PS3)-SGSIN-(NZ1)'),
]

for dc, dp, r20, r40, via, notes in aus:
    lines.append(row(dc, dp, r20, r40, VF_AU, VT_AU, via=via, sur=AUS_S, notes=notes, cl=AUS_CL))

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — CARIBBEAN / CENTRAL AMERICA (CSE)  1–7 May 2026
# ═══════════════════════════════════════════════════════════════════════════════
VF_CS = '2026-05-01'; VT_CS = '2026-05-07'

lines.append("-- ======== CARIBBEAN / CENTRAL AMERICA (CSE) — 1-7 May 2026 ========")
lines.append("-- Rates incl EFS/MBS/OBS/PSS; CSS $15/cntr SLF $10/cntr PCT $40/teu extra")
lines.append("")

cse = [
    ('Aruba',           'BARCADERA (ORANJESTAD)',   5600, 5600, '',          'CSE (PS3)-SGSIN-(FE3)-KRPUS-(EC2)-PAMIT-(FDR)'),
    ('Barbados',        'BRIDGETOWN',               5600, 5600, '',          'CSE'),
    ('Brazil',          'MANAUS',                   4400, 4400, '',          'CSE (PS3)-CNYTN-(EC2)-PAMIT-(CX1)'),
    ('Brazil',          'VILA DO CONDE',             4400, 4400, '',          'CSE'),
    ('Colombia',        'BARRANQUILLA',              3500, 3500, '',          'CSE (PS3)-SGSIN-(MD3)-KRPUS-(EC2)-PAMIT-(CX3)'),
    ('Colombia',        'CARTAGENA',                3500, 3500, '',          'CSE'),
    ('Colombia',        'SANTA MARTA',              3500, 3500, '',          'CSE'),
    ('Costa Rica',      'MOIN',                     3900, 3900, '',          'CSE'),
    ('Curacao',         'WILLEMSTAD',               6600, 6600, '',          'CSE'),
    ('Dominican Rep.',  'CAUCEDO',                  3500, 3500, '',          'CSE (NPI)-KRPUS-(AX2)-PAROD-(AL5)'),
    ('Dominican Rep.',  'RIO HAINA',                4100, 4100, '',          'CSE (NPI)-KRPUS-(EC2)-PAMIT-(CX6)'),
    ('Guatemala',       'SANTO TOMAS DE CASTILLA',  3900, 3900, '',          'CSE'),
    ('Guyana',          'GEORGETOWN',               5600, 5600, '',          'CSE (PS3)-SGSIN-(FE3)-KRPUS-(EC2)-PAMIT-(CX5)'),
    ('Honduras',        'PUERTO CORTES',             3900, 3900, '',          'CSE (PS3)-SGSIN-(SX1)-CNSHA-(EC2)-PAMIT-(CX4)'),
    ('Haiti',           'PORT AU PRINCE',            4400, 4400, '',          'CSE (PS3)-SGSIN-(MD2)-KRPUS-(EC2)-PAMIT-(FDR); Haiti due diligence required'),
    ('Jamaica',         'KINGSTON',                 4000, 4000, '',          'CSE (PS3)-SGSIN-(MD3)-KRPUS-(EC2)-PAMIT-(CX4)'),
    ('Panama',          'COLON FREE ZONE',           3300, 3300, '',          'CSE (PS3)-SGSIN-(MD3)-KRPUS-(EC2); Door delivery; ADD/IFD extra'),
    ('Panama',          'MANZANILLO',               3200, 3200, '',          'CSE (PS3)-SGSIN-(MD3)-KRPUS-(EC2); ADD/IFD extra'),
    ('Puerto Rico',     'SAN JUAN',                 4400, 4400, '',          'CSE (NPI)-KRPUS-(EC2)-PAMIT-(CX6); FMC filing required BEFORE gate-in'),
    ('Suriname',        'PARAMARIBO',               5600, 5600, '',          'CSE (NPI)-KRPUS-(EC2)-PAMIT-(CX5)'),
    ('Trinidad',        'PORT OF SPAIN',             3500, 3500, '',          'CSE (PS3)-SGSIN-(MD3)-KRPUS-(EC2)-PAMIT-(CX5)'),
    ('Venezuela',       'LA GUAIRA',                4400, 4400, '',          'CSE'),
    ('Venezuela',       'PUERTO CABELLO',            4400, 4400, '',          'CSE'),
]

for dc, dp, r20, r40, via, notes in cse:
    lines.append(row(dc, dp, r20, r40, VF_CS, VT_CS, via=via, sur=CSE_S, notes=notes, cl=CSE_CL))

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — SOUTH AMERICA EAST (LEW / LAEC)
# Via ESALG or NLRTM: VT 14 May | Direct: VT 7 May
# ═══════════════════════════════════════════════════════════════════════════════
VF_LW  = '2026-05-01'; VT_LW7 = '2026-05-07'; VT_LW14 = '2026-05-14'

lines.append("-- ======== SOUTH AMERICA EAST (LEW/LAEC) ========")
lines.append("-- Via ESALG/NLRTM routing: VT 14-May | Direct routing: VT 7-May")
lines.append("-- Rates incl EFS/HEA/MBS/OBS/PSS; CSS $15/cntr SLF $10/cntr extra")
lines.append("")

# Ports that have both via-routing and direct options
# Format: (country, port, r20_via, r40_via, r20_dir, r40_dir, route_dir, freetime_note)
lew_main = [
    ('Argentina', 'BUENOS AIRES', 1500, 1700, 3200, 3300, '(PS3)-SGSIN-(SX1)',  '14 days freetime at POD'),
    ('Brazil',    'ITAPOA',       1500, 1700, 3200, 3300, '(NCI)-SGSIN-(SX2)',  '18 days freetime at POD'),
    ('Brazil',    'PARANAGUA',    1500, 1700, 3200, 3300, '(PS3)-SGSIN-(SX1)',  '18 days freetime at POD'),
    ('Brazil',    'RIO DE JANEIRO', 1500, 1700, 3200, 3300, '(PS3)-SGSIN-(SX2)', '18 days freetime at POD'),
    ('Brazil',    'SANTOS',       1500, 1700, 3200, 3300, '(PS3)-SGSIN-(SX1)',  '18 days freetime at POD'),
    ('Paraguay',  'ASUNCION',     3200, 3400, 4500, 5000, '(PS3)-SGSIN-(SX1)-ARBUE-(FDR)', '21 days freetime at POD'),
    ('Uruguay',   'MONTEVIDEO',   1500, 1700, 3200, 3300, '(PS3)-SGSIN-(SX1)',  '18 days freetime at POD'),
]

for dc, dp, r20v, r40v, r20d, r40d, route_d, ft in lew_main:
    lines.append(row(dc, dp, r20v, r40v, VF_LW, VT_LW14, via='ALGECIRAS',
        sur=LEW_S,
        notes=f'LEW via IOM-ESALG-(LUX) routing; {ft}',
        cl=LEW_CL))
    lines.append(row(dc, dp, r20v, r40v, VF_LW, VT_LW14, via='ROTTERDAM',
        sur=LEW_S,
        notes=f'LEW via IOX-NLRTM-(LUX) routing; {ft}',
        cl=LEW_CL))
    lines.append(row(dc, dp, r20d, r40d, VF_LW, VT_LW7, via='',
        sur=LEW_S,
        notes=f'LEW direct {route_d}; {ft}',
        cl=LEW_CL))

# Direct-only ports
lew_direct = [
    ('Brazil', 'NAVEGANTES',  3200, 3300, '(PS3)-SGSIN-(SX1)', '18 days freetime'),
    ('Brazil', 'PECEM',       4600, 4800, '(PS3)-SGSIN-(SX2)-BRSSZ-(FDR)', '18 days freetime'),
    ('Brazil', 'RIO GRANDE',  3200, 3300, '(PS3)-SGSIN-(SX1)', '18 days freetime'),
    ('Brazil', 'SALVADOR',    4600, 4800, '(PS3)-SGSIN-(SX2)-BRSSZ-(FDR)', '18 days freetime'),
    ('Brazil', 'SUAPE',       4600, 4800, '(PS3)-SGSIN-(SX2)-BRSSZ-(FDR)', '18 days freetime'),
]

for dc, dp, r20, r40, route, ft in lew_direct:
    lines.append(row(dc, dp, r20, r40, VF_LW, VT_LW7, sur=LEW_S,
        notes=f'LEW direct {route}; {ft}',
        cl=LEW_CL))

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — SOUTH AMERICA WEST (LWE)  1–14 May 2026
# ═══════════════════════════════════════════════════════════════════════════════
VF_WE = '2026-05-01'; VT_WE = '2026-05-14'

lines.append("-- ======== SOUTH AMERICA WEST (LWE) — 1-14 May 2026 ========")
lines.append("-- Rates incl BAF/BRS/EFS/MBS/OBS/PSS; CSS $15/cntr SLF $10/cntr HEA extra")
lines.append("")

lwe = [
    # Chile
    ('Chile',      'ARICA',           2575, 3350, '',          'LWE (PS3)-SGSIN-(MD3)-KRPUS-(AX1)-PECLL-(ATS); 21d free'),
    ('Chile',      'IQUIQUE',         2475, 3350, '',          'LWE (CIP)-CNNGB-(AX1); 21d free'),
    ('Chile',      'PUERTO ANGAMOS',  2475, 3350, '',          'LWE (CIP)-HKHKG-(AX1); 21d free'),
    ('Chile',      'VALPARAISO',      2175, 2550, '',          'LWE (CIP)-CNNGB-(AX1); 21d free'),
    ('Chile',      'SAN ANTONIO',     2175, 2550, '',          'LWE (CIP)-CNNGB-(AX2); 21d free'),
    ('Chile',      'SAN VICENTE',     2275, 2650, '',          'LWE (CIP)-CNNGB-(AX1); 21d free'),
    ('Chile',      'CORONEL',         2275, 2650, '',          'LWE (CIP)-CNNGB-(AX2); 21d free'),
    ('Chile',      'LIRQUEN',         2275, 2650, '',          'LWE (CIP)-CNNGB-(AX2); 21d free'),
    # Peru
    ('Peru',       'CALLAO',          2175, 2550, '',          'LWE (CIP)-CNSHA-(AX1); 21d free'),
    # Colombia
    ('Colombia',   'BUENAVENTURA',    2175, 2550, '',          'LWE (CIP)-CNNGB-(AX2); 20d free'),
    # Ecuador
    ('Ecuador',    'GUAYAQUIL',       2175, 2550, '',          'LWE (CIP)-CNNGB-(AX3); 18d free'),
    ('Ecuador',    'POSORJA',         1975, 2350, '',          'LWE; 18d free'),
    # Mexico
    ('Mexico',     'MANZANILLO',      2175, 2550, '',          'LWE (CIP)-CNSHA-(AX1); 21d free; ENS applicable'),
    ('Mexico',     'LAZARO CARDENAS', 2175, 2550, '',          'LWE (PS3)-SGSIN-(MD3)-KRPUS-(AX4); 21d free; ENS applicable'),
    ('Mexico',     'ENSENADA',        2475, 3350, '',          'LWE (CIP)-CNNGB-(AX3); 21d free; ENS applicable'),
    # Guatemala
    ('Guatemala',  'PUERTO QUETZAL',  2475, 3350, '',          'LWE (CIP)-CNNGB-(AX3); 17d free'),
    # El Salvador
    ('El Salvador','ACAJUTLA',        2575, 3350, '',          'LWE (CIP)-HKHKG-(AX2)-MXLZC-(MX2); 16d free'),
    # Honduras
    ('Honduras',   'SAN LORENZO',     4898, 5673, 'ACAJUTLA',  'LWE (CIP)-HKHKG-(AX2)-MXLZC-(MX2) feeder via Acajutla; 16d free; IFD extra'),
    # Nicaragua
    ('Nicaragua',  'CORINTO',         2575, 3350, '',          'LWE (PS3)-SGSIN-(MD3)-KRPUS-(AX2)-COBUN-(MX3); 16d free'),
    # Costa Rica
    ('Costa Rica', 'PUERTO CALDERA',  2575, 3350, '',          'LWE (NPI)-KRPUS-(AX2)-COBUN-(MX3); 16d free; AMS applicable'),
    # Panama
    ('Panama',     'RODMAN',          2575, 3550, '',          'LWE (NPI)-KRPUS-(AX2); 12d free; ADD extra'),
    ('Panama',     'PANAMA CITY',     2725, 3600, 'RODMAN',    'LWE (NPI)-KRPUS-(AX2) Door delivery via Rodman; 12d free; ADD/IFD extra'),
]

for dc, dp, r20, r40, via, notes in lwe:
    lines.append(row(dc, dp, r20, r40, VF_WE, VT_WE, via=via, sur=LWE_S, notes=notes, cl=LWE_CL))

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8 — AFRICA (EFW / WFW / ZFW)  1–14 May 2026
# ═══════════════════════════════════════════════════════════════════════════════
VF_AF = '2026-05-01'; VT_AF = '2026-05-14'

lines.append("-- ======== EAST AFRICA (EFW) — 1-14 May 2026 ========")
lines.append("-- Rates incl AMS/BAF/BRS/CGD/HEA/LSF/MBS/OBS/PSS/WRC; EFS/CSS/SLF/THL extra")
lines.append("")

efw = [
    ('Kenya',    'MOMBASA',       1850, 1850, '', 'EFW (MIM); 14d freetime; ARD applies for Nairobi ICD Embakasi CY (ONEY-959)'),
    ('Tanzania', 'DAR ES SALAAM', 1950, 1950, '', 'EFW (MIM); 14d freetime; incl THD'),
]
for dc, dp, r20, r40, via, notes in efw:
    lines.append(row(dc, dp, r20, r40, VF_AF, VT_AF, via=via, sur=AFR_S, notes=notes, cl=AFR_CL))

lines.append("")
lines.append("-- ======== WEST AFRICA (WFW) — 1-14 May 2026 ========")
lines.append("")

wfw = [
    ('Benin',         'COTONOU',  3200, 4200, '', 'WFW (PS3)-SGSIN-(SW2); 14d freetime'),
    ("Cote d'Ivoire", 'ABIDJAN',  3200, 4200, '', 'WFW (PS3)-SGSIN-(SW2); 14d freetime; DG HAZ $550/teu'),
    ('Ghana',         'TEMA',     1800, 2250, '', 'WFW (AIM); 14d freetime; PRS collect'),
    ('Nigeria',       'APAPA',    2200, 2550, '', 'WFW (AIM); 14d freetime; NGP/NRF collect'),
    ('Nigeria',       'LEKKI',    3800, 5000, '', 'WFW (NCI)-SGSIN-(SW2); 14d freetime; NGP/NRF collect'),
    ('Nigeria',       'ONNE',     3800, 5000, '', 'WFW (NPI)-SGSIN-(WA1); 14d freetime; NGP/NRF collect'),
    ('Nigeria',       'TIN CAN',  2400, 2700, '', 'WFW (AIM); 14d freetime; NGP/NRF collect'),
    ('Senegal',       'DAKAR',    4600, 5000, '', 'WFW (IOM)-ESALG-(MAX); 14d freetime'),
    ('Togo',          'LOME',     3200, 4200, '', 'WFW; 14d freetime'),
]
for dc, dp, r20, r40, via, notes in wfw:
    lines.append(row(dc, dp, r20, r40, VF_AF, VT_AF, via=via, sur=AFR_S, notes=notes, cl=AFR_CL))

lines.append("")
lines.append("-- ======== SOUTH AFRICA (ZFW) — 1-14 May 2026 ========")
lines.append("-- PRS: ZAR 52/cntr collect (eff 01-May-2026)")
lines.append("")

zfw = [
    ('Mozambique',   'MAPUTO', 2200, 2400, '', 'ZFW (MIM); 14d freetime; EHD collect'),
    ('South Africa', 'DURBAN', 1400, 1400, '', 'ZFW (AIM); 14d freetime; AMS prepaid; EHD collect; PRS ZAR52/cntr'),
]
for dc, dp, r20, r40, via, notes in zfw:
    lines.append(row(dc, dp, r20, r40, VF_AF, VT_AF, via=via, sur=ZAF_S, notes=notes, cl=ZAF_CL))

lines.append("")

# ── TOTAL & PRINT ─────────────────────────────────────────────────────────────
total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
