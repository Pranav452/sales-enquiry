import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'ONE'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://one-line.com'

# ================================================================
# Validity
# ================================================================
VF_IWE = '2026-07-01'   # IWE: sheet only says "July 2026" (no explicit day range) — full month assumed
VT_IWE = '2026-07-31'
VF_WK  = '2026-07-01'   # WEW / WMW — explicit 1-week window on sheet
VT_WK  = '2026-07-07'
VF_14  = '2026-07-01'   # AUS / NZS / LEW / EFW / WFW
VT_14  = '2026-07-14'

# ================================================================
# Surcharge strings
# ================================================================
S_IWE_BASE     = 'MBS:incl;EFS:incl;ISL:incl;PSF:incl;SLF:incl;OBS:44/20-88/40'
S_IWE_YAS      = 'MBS:incl;EFS:incl;ISL:incl;PSF:incl;SLF:incl;YAS:incl;OBS:44/20-88/40'
S_IWE_PCO      = 'MBS:incl;EFS:incl;ISL:incl;PSF:incl;SLF:incl;PCO:incl;OBS:44/20-88/40'
S_IWE_BD       = 'MBS:incl;EFS:incl;ISL:incl;PSF:incl;SLF:incl;THD:incl;CGD:incl;OBS:44/20-88/40'
S_IWE_PH_NOISL = 'MBS:incl;EFS:incl;PSF:incl;SLF:incl;OBS:44/20-88/40'

S_WEW      = 'CAF:incl;CSS:incl;EFS:incl;HEA:incl;MBS:incl;OBS:260/teu;EES:94/teu'
S_WEW_NHEA = 'CAF:incl;CSS:incl;EFS:incl;MBS:incl;OBS:260/teu;EES:94/teu'   # Spain: Bilbao/Gijon/Vigo — no HEA
S_WMW      = 'CAF:incl;CSS:incl;EFS:incl;MBS:incl;OBS:277/teu;EES:181/teu;HEA:cond'  # HEA collect, not included
S_AUS      = 'EFS:incl;MBS:incl;OBS:incl;PSS:incl;ISL:32/ctr;SLF:10/ctr'
S_LEW      = 'EFS:incl;HEA:incl;MBS:incl;OBS:incl;PSS:incl;CSS:15/ctr;SLF:10/ctr'
S_EFW      = 'AMS:incl;BAF:incl;BRS:incl;CGD:incl;HEA:incl;LSF:incl;MBS:incl;OBS:incl;WRC:incl'
S_EFW_DAR  = 'AMS:incl;BAF:incl;BRS:incl;CGD:incl;HEA:incl;LSF:incl;MBS:incl;OBS:incl;THD:incl;WRC:incl'
S_WFW      = 'AMS:incl;BAF:incl;BRS:incl;CGD:incl;EPH:incl;HEA:incl;LSF:incl;MBS:incl;OBS:incl;WRC:incl'

# ================================================================
# Clauses
# ================================================================
CL_IWE = (
    "ONE (Ocean Network Express) MRG | Nhava Sheva origin | Far East / IWE rates"
    "|Validity: July 2026 (sheet gives no explicit day range — full month assumed 01-31 Jul)"
    "|Rates inclusive of EFS, MBS, ISL, PSF, SLF (Japan ports add YAS; China Yangtze ports add PCO;"
    " Bangladesh add THD+CGD; Batangas/Davao exclude ISL — EFS,MBS,PSF,SLF only)"
    "|OBS USD 44/20' USD 88/40' collect (eff 01-07-2026) | War Risk Surcharge USD 55/TEU"
    "|THC/DOC/THL/THD and other applicable charges both ends per port — see NOTES for the exact collect list"
    "|DG/HAZ premium (Class 1-9, USD150-300/20' USD300-600/40') and PSA Singapore T/S surcharge apply per class"
    "|Free time per country tariff — combined DMIF/DTIC 14 days typical (see country free-time table)"
    "|Middle East: NO OFFER due to ongoing conflict for Jebel Ali, Dammam, Riyadh, Sharjah, Bahrain,"
    " Shuaiba, Ajman, Shuwaikh, Sohar, Hamad, Umm Qasr, Abu Dhabi (Sokhna/Jeddah/Aqaba still rated)"
)
CL_WEW = (
    "ONE (Ocean Network Express) MRG | Nhava Sheva origin | Europe (WEW) rates"
    "|Validity: 01-07 Jul 2026 (ONE WEEK ONLY per sheet — re-check for following week)"
    "|Rates inclusive of CAF, CSS, EFS, MBS, HEA (HEA NOT included for Bilbao/Gijon/Vigo — Spain)"
    "|Subject to OBS USD 260/TEU | SCT if vessel routes via Suez | EES USD 94/TEU | ESD and other tariff surcharges"
    "|HEA (where collect/excess weight): 20'DV USD 300/unit for EU net weight >= 16MT"
    "|Food Grade Premium (FGP) USD 100/container | DG surcharge USD 200/TEU"
    "|Standard free time detention at POD for Dry"
)
CL_WMW = (
    "ONE (Ocean Network Express) MRG | Nhava Sheva origin | Mediterranean (WMW) rates"
    "|Validity: 01-07 Jul 2026 (ONE WEEK ONLY per sheet — re-check for following week)"
    "|Rates inclusive of CAF, CSS, EFS, MBS (HEA NOT included — collect for all WMW ports)"
    "|Subject to OBS USD 277/TEU | SCT if vessel routes via Suez | EES USD 181/TEU | ESD and other tariff surcharges"
    "|HEA (collect): 20'DV USD 300/unit (net weight >= 16MT) or USD 600/unit (net weight >= 18MT)"
    "|Food Grade Premium (FGP) USD 100/container | DG surcharge USD 200/TEU"
    "|Standard free time detention at POD for Dry"
)
CL_AUS = (
    "ONE (Ocean Network Express) MRG | Nhava Sheva origin | Australia (AUS) rates"
    "|Validity: 01-14 Jul 2026"
    "|Rates inclusive of EFS, MBS, OBS, PSS | ISL USD 32/ctr | SLF USD 10/ctr | THC/DOC both ends"
    "|EFS USD 120/20' USD 240/40' (eff 01-05-2026) | Flexi-tank add-on USD 100/TEU"
    "|DG surcharge per class (Class 2.1-2.3/5: USD 300/600; Class 3/4/6/8/9: USD 150/300; Class 1/7: not accepted)"
    "|PSA Singapore T/S add-on: Group 1/1D/2 USD 538/753; Group 1S/2S/2A/2B/2F USD 269/538; Group 3: nil"
)
CL_NZS = CL_AUS.replace('Australia (AUS)', 'New Zealand (NZS)')
CL_LEW = (
    "ONE (Ocean Network Express) MRG | Nhava Sheva origin | LAEC / LUX service (LEW) rates"
    "|Via Algeciras or Rotterdam | Validity: 01-14 Jul 2026"
    "|Rates inclusive of EFS, HEA, MBS, OBS, PSS | CSS USD 15/unit | SLF USD 10/unit | THL/THD both ends"
    "|EFS USD 120/20' USD 240/40' (eff 01-05-2026)"
    "|HEA: nil up to 23.99 tons; USD 200/20' for cargo weight over 18 tons (as stated on source sheet)"
    "|Free time: 18 days LAEC (except Buenos Aires 14 days, Asuncion 21 days)"
    "|Inland Fuel Charge (IFL/IFD) applies ex 02-Apr-2026 for BOL/BRA/CHL/CRI/ECU/SLV/GTM/HND/MEX/NIC/PAN/PRY/URY"
)
CL_EFW = (
    "ONE (Ocean Network Express) MRG | Nhava Sheva origin | East Africa (EFW) rates"
    "|Validity: 01-14 Jul 2026"
    "|Rates inclusive of AMS, BAF, BRS, CGD, HEA, LSF, MBS, OBS, WRC (Dar es Salaam also includes THD)"
    "|CSS/SLF/THL/doc fee and local charges both ends, per tariff"
    "|HAZ USD 200/TEU | Port Surcharge (PRS) ZAR 52/container collect (eff 01-05-2026)"
    "|EFS USD 120/20' USD 240/40' (eff 01-05-2026) | 14 days free detention at destination"
)
CL_WFW = (
    "ONE (Ocean Network Express) MRG | Nhava Sheva origin | West Africa (WFW) rates"
    "|Validity: 01-14 Jul 2026"
    "|Rates inclusive of AMS, BAF, BRS, CGD, EPH, HEA, LSF, MBS, OBS, WRC"
    "|CSS/SLF/THL/doc fee and local charges both ends, per tariff"
    "|HAZ USD 200/TEU | Port Surcharge (PRS) ZAR 52/container collect (eff 01-05-2026)"
    "|EFS USD 120/20' USD 240/40' (eff 01-05-2026) | 14 days free detention at destination"
    "|DG/PSA class surcharges apply for Tema/Apapa/Tin Can/Dakar/Cotonou/Lome/Onne/Abidjan — see DG surcharge table"
)

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, vf, vt, via, surch, clauses, notes='', currency='USD'):
    v = f"'{esc(via)}'" if via else 'NULL'
    n = f"'{esc(notes)}'" if notes else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{esc(dc)}','{esc(dp)}',"
        f"'{currency}',{r20},{r40},'{vf}','{vt}',{v},'{esc(surch)}',{n},'{esc(clauses)}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

def iwe(country, port, r20, r40hc, surch, via, notes):
    return row(country, port, r20, r40hc, VF_IWE, VT_IWE, via, surch, CL_IWE, notes)

def wew(country, port, r20, r40, via='', hea=True, notes=''):
    s = S_WEW if hea else S_WEW_NHEA
    return row(country, port, r20, r40, VF_WK, VT_WK, via, s, CL_WEW, notes)

def wmw(country, port, r20, r40, notes=''):
    return row(country, port, r20, r40, VF_WK, VT_WK, '', S_WMW, CL_WMW, notes)

def aus(country, port, r20, r40, via='', notes=''):
    return row(country, port, r20, r40, VF_14, VT_14, via, S_AUS, CL_AUS, notes)

def nzs(country, port, r20, r40, notes=''):
    return row(country, port, r20, r40, VF_14, VT_14, '', S_AUS, CL_NZS, notes)

def lew(country, port, r20, r40, via, notes=''):
    return row(country, port, r20, r40, VF_14, VT_14, via, S_LEW, CL_LEW, notes)

def efw(country, port, r20, r40, surch=S_EFW, notes=''):
    return row(country, port, r20, r40, VF_14, VT_14, '', surch, CL_EFW, notes)

def wfw(country, port, r20, r40, notes=''):
    return row(country, port, r20, r40, VF_14, VT_14, '', S_WFW, CL_WFW, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- ONE (Ocean Network Express) MRG — North & West India Sales Rate Guideline JULY 2026")
lines.append("-- IWE (Far East): validity July 2026 (full month assumed, sheet gives no day range)")
lines.append("-- WEW/WMW (Europe/Med): validity 01-07 Jul 2026 ONLY (one week per sheet)")
lines.append("-- AUS/NZS/LEW/EFW/WFW: validity 01-14 Jul 2026")
lines.append("-- Middle East IWE: NO OFFER (conflict) except Sokhna/Jeddah/Aqaba which retain rates")
lines.append("-- LWE/CSE/ZFW: no rate rows in this sheet (only surcharge/freetime footnotes) — NOT included")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# IWE — FAR EAST (+ Sokhna/Jeddah/Aqaba) — July 2026 (full month)
# ============================================================
lines.append("-- ======== IWE — FAR EAST (validity: July 2026) ========")
lines.append("-- Inclusive of EFS,MBS,ISL,PSF,SLF (+YAS Japan / +PCO Yangtze China / +THD+CGD Bangladesh)")
lines.append("-- OBS USD 44/20 USD 88/40 collect | War Risk USD 55/TEU | See NOTES for per-port collect charge list")
lines.append("")

B, Y, P, D, N = S_IWE_BASE, S_IWE_YAS, S_IWE_PCO, S_IWE_BD, S_IWE_PH_NOISL

IWE_ROWS = [
    # country, port, r20, r40hc, gp40(or None), via, surch, subj
    ('Brunei',   'MUARA',                871, 1649, 1636, '',              B, 'THL,THD,CMC,DOC,DOF'),
    ('Indonesia','PANJANG TERMINAL',     859, 1601, None, 'JAKARTA',        B, 'THL,THD,CFE,DOC,DOF'),
    ('China',    'QINZHOU',              131,  200, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('Indonesia','CIKARANG',             740,  905, None, 'JAKARTA',        B, 'THL,THD,CFE,DOC,DOF'),
    ('Indonesia','PALEMBANG',            265,  575, None, '',               B, 'THL,THD,CFE,DOC,DOF'),
    ('Japan',    'HIROSHIMA',            485,  306, None, 'KOBE',           Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Japan',    'OITA',                 380,  950, None, '',               Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('China',    'CHONGQING',            685,  485, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('China',    'GUANGZHOU',            585,  805, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('Vietnam',  'HAIPHONG',              78,  302, 301,  '',               B, 'THL,THD,DOC,DOF,VVN,CCC,CMC,CCC'),
    ('Japan',    'HAKATA',               261,   25, None, '',               Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Japan',    'NIIGATA',              142,   25, None, '',               Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Cambodia', 'PHNOM PENH',           150,  175, None, '',               B, 'THL,THD,DOC,DOF'),
    ('Japan',    'SHIMIZU',              165,   25, None, '',               Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Japan',    'TOMAKOMAI',            608,  660, 659,  'YOKOHAMA',       Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Thailand', 'BANGKOK (BMT/PAT)',     25,   50, None, 'LAEM CHABANG',   B, 'THL,THD,CCC,CMC,DOC,DOF,RCR'),
    ('China',    'BEIJIAO',               25,   50, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('Indonesia','BELAWAN',               50,  100, None, '',               B, 'THL,THD,DOC,DOF'),
    ('Bangladesh','CHITTAGONG',          850,  817, 1000, '',               D, 'THL,DOC,XDD,AMS'),
    ('Sri Lanka','COLOMBO',              250,  350, None, '',               B, 'THL,DOC,DOF'),
    ('China',    'DALIAN',               260,  300, None, 'QINGDAO',        B, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('Vietnam',  'DANANG',               435,  470, None, '',               B, 'THL,THD,DOC,DOF,VVN'),
    ('Bangladesh','DHAKA',              1635, 2150, 2615, 'CHITTAGONG',     D, 'THL,DOC,XDD'),
    ('China',    'FUZHOU',               290,  240, None, 'HONG KONG',      P, 'THL,THD,AMA,AMS,DOC,DOF,EIR,PSE'),
    ('China',    'GAOLAN',               206,  445, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('Philippines','GENERAL SANTOS',     200,  250, None, '',               B, 'THL,THD,EIS,DOC,DOF,CCC'),
    ('China',    'GONGYI',               100,  150, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('Vietnam',  'HO CHI MINH',           15,   30, None, 'CAI MEP',        B, 'THL,THD,DOC,DOF,VVN'),
    ('Hong Kong','HONG KONG',              5,    5, None, '',               B, 'THL,THD,DOC,DOF'),
    ('China',    'HUANGPU',               25,   50, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('Indonesia','JAKARTA',               50,  100, None, '',               B, 'THL,THD,DOC,DOF'),
    ('China',    'JIANGMEN',             100,   75, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('Taiwan',   'KAOHSIUNG',            110,  255, None, '',               B, 'THL,THD,DOC,DOF'),
    ('Taiwan',   'KEELUNG',              495,  680, None, 'KAOHSIUNG',      B, 'THL,THD,DOC,DOF'),
    ('Japan',    'KOBE',                  25,   50, None, '',               Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Thailand', 'LAEM CHABANG',          20,   30, None, '',               B, 'THL,THD,CCC,CMC,DOC,DOF'),
    ('Thailand', 'LAT KRABANG',           25,   35, None, 'LAEM CHABANG',   B, 'THL,THD,CCC,CMC,DOC,DOF'),
    ('Philippines','MANILA',             150,  200, None, '',               B, 'THL,THD,EIS,DOC,DOF,CCC'),
    ('Japan',    'MATSUYAMA',            465,  480, None, 'KOBE',           Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Japan',    'MIZUSHIMA',            365,  775, None, 'KOBE',           Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Japan',    'MOJI',                 294,  530, None, 'KOBE',           Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Japan',    'NAGOYA',               172,   50, None, '',               Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('China',    'NANSHA',                75,  100, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('China',    'NANTONG',              217,   50, None, 'SHANGHAI',       P, 'THL,THD,AMA,AMS,DOC,DOF,EIR,PSE'),
    ('China',    'NINGBO',                 5,    5, None, '',               P, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('Japan',    'OSAKA',                250,  420, None, 'KOBE',           Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Malaysia', 'PASIR GUDANG',         100,  100, None, '',               B, 'THL,THD,CCC,DPC,EDI,DOC,DOF'),
    ('Malaysia', 'PENANG',               115,  150, None, '',               B, 'THL,THD,CCC,DPC,EDI,DOC,DOF'),
    ('Malaysia', 'PORT KLANG',             5,   10, None, '',               B, 'THL,THD,CCC,DPC,EDI,DOC,DOF'),
    ('Korea',    'PUSAN',                  5,   10, None, '',               B, 'THL,THD,CCC,CSC,DOC,DOF,WHA,LSF'),
    ('China',    'QINGDAO',                5,    5, None, '',               B, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('China',    'RONGQI',                50,  185, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('China',    'SANSHAN',              200,  225, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('Indonesia','SEMARANG',              77,  100, None, '',               B, 'THL,THD,DOC,DOF'),
    ('Japan',    'SENDAI',               690,  660, 659,  'YOKOHAMA',       Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('China',    'SHANGHAI',               5,    5, None, '',               P, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('China',    'SHEKOU',               235,  260, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('Japan',    'SHIBUSHI',             516,  745, None, '',               Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Cambodia', 'SIHANOUKVILLE',        274,  200, None, '',               B, 'THL,THD,DOC,DOF'),
    ('Singapore','SINGAPORE',              5,   10, None, '',               B, 'THL,THD,CMC,DOC,DOF'),
    ('Thailand', 'SONGKHLA',             145,  125, None, '',               B, 'THL,THD,CCC,CMC,DOC,DOF'),
    ('Philippines','SUBIC',              323,  533, None, '',               B, 'THL,THD,EIS,DOC,DOF,CCC'),
    ('Indonesia','SURABAYA',              50,  100, None, '',               B, 'THL,THD,CFE,DOC,DOF'),
    ('Taiwan',   'TAICHUNG',             210,  525, None, 'KAOHSIUNG',      B, 'THL,THD,DOC,DOF'),
    ('Taiwan',   'TAOYUAN',              300,  590, None, 'KAOHSIUNG',      B, 'THL,THD,DOC,DOF'),
    ('Japan',    'TOKYO',                220,  220, None, '',               Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('China',    'WUHAN',                 80,   25, 300,  'SHANGHAI',       P, 'THL,THD,AMA,AMS,DOC,DOF,EIR,PSE'),
    ('China',    'XIAOLAN',               15,   25, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('China',    'XINGANG',                5,    5, None, '',               B, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('China',    'YANTIAN',              215,  265, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('Japan',    'YOKKAICHI',            218,   50, None, '',               Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Japan',    'YOKOHAMA',             135,   50, None, '',               Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('China',    'ZHANGJIAGANG',          55,  200, None, 'SHANGHAI',       P, 'THL,THD,AMA,AMS,DOC,DOF,EIR,PSE'),
    ('China',    'ZHONGSHAN',             95,   25, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('China',    'ZHUHAI',                15,   25, None, 'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF'),
    ('Egypt',    'SOKHNA',              1210, 2170, None, '',               B, 'THL,DOC,EST,AMA'),
    ('China',    'LIANYUNGANG',          197,  146, None, 'SHANGHAI',       B, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('China',    'XIAMEN',               195,  259, 260,  'HONG KONG',      B, 'THL,THD,AMA,AMS,DOC,DOF,EIR'),
    ('Vietnam',  'HO CHI MINH (CAI MEP)',  5,    5, None, '',               B, 'THL,THD,DOC,DOF,VVN'),
    ('Myanmar',  'YANGON',               459,  538, None, '',               B, 'THL,DOC'),
    ('Saudi Arabia','JEDDAH',           1085, 1920, None, '',               B, 'THL,DOC,FED,OCR,XDD'),
    ('Malaysia', 'KUCHING',              717, 1265, None, '',               B, 'THL,THD,CCC,DPC,EDI,DOC,DOF'),
    ('Maldives', 'MALE',                1011, 1886, None, '',               B, 'THL,LIO,DOC,DOF,EIR'),
    ('Indonesia','BALIKPAPAN',           937, 1405, None, 'JAKARTA',        B, 'THL,THD,DOC,DOF'),
    ('Japan',    'HACHINOHE',           1002, 1503, None, 'YOKOHAMA',       Y, 'THL,THD,AMA,AMS,DOC,DOF,CMD'),
    ('Korea',    'INCHEON',              160,    5, None, '',               B, 'THL,THD,CCC,CSC,DOC,DOF,WHA,LSF'),
    ('Korea',    'KWANGYANG',              5,  141, None, '',               B, 'THL,THD,CCC,CSC,DOC,DOF,WHA,LSF'),
    ('Philippines','CEBU',               285,  365, None, '',               B, 'THL,THD,EIS,DOC,DOF,CCC'),
    ('Philippines','BATANGAS',           700,  500, None, '',               N, 'ARO,THL,THD,EIS,DOC,DOF,CCC'),
    ('Philippines','DAVAO',                5,    5, None, '',               N, 'ARO,THL,THD,EIS,DOC,DOF,CCC'),
    ('Jordan',   'AQABA',               1145, 2220, None, '',               B, 'THL,ADD,DOC,EMS'),
]

for c, p, r20, r40, gp, via, s, subj in IWE_ROWS:
    parts = []
    if gp is not None:
        parts.append(f"40'GP USD{gp}")
    if subj:
        parts.append(f"Subject to {subj} collect")
    notes = '; '.join(parts)
    lines.append(iwe(c, p, r20, r40, s, via, notes))
lines.append("")
lines.append("-- Middle East IWE — NO OFFER due to ongoing conflict (excluded, not inserted):")
lines.append("--   Shuaiba(KW), Ajman(AE), Dammam(SA), Jebel Ali(AE), Riyadh(SA), Bahrain(BH),")
lines.append("--   Shuwaikh(KW), Sohar(OM), Hamad(QA), Umm Qasr(IQ), Abu Dhabi(AE)")
lines.append("")

# ============================================================
# WEW — EUROPE (01-07 Jul 2026)
# ============================================================
lines.append("-- ======== WEW — EUROPE (01-07 Jul 2026 — ONE WEEK ONLY) ========")
lines.append("-- CAF,CSS,EFS,HEA,MBS incl (Spain: no HEA) | OBS USD260/teu | EES USD94/teu")
lines.append("")
lines.append(wew('Belgium',        'ANTWERP',       2650, 2595))
lines.append(wew('Germany',        'HAMBURG',       2650, 2595))
lines.append(wew('Denmark',        'AALBORG',       3075, 3170))
lines.append(wew('Denmark',        'AARHUS',        2850, 2795))
lines.append(wew('Denmark',        'COPENHAGEN',    2850, 2795))
lines.append(wew('Denmark',        'FREDERICIA',    2850, 2795, 'HAMBURG'))
lines.append(wew('Estonia',        'TALLINN',       2900, 2895))
lines.append(wew('Spain',          'BILBAO',        3560, 3615, hea=False))
lines.append(wew('Spain',          'GIJON',         3560, 3615, hea=False))
lines.append(wew('Spain',          'VIGO',          3560, 3615, hea=False))
lines.append(wew('Finland',        'HELSINKI',      2800, 2795))
lines.append(wew('Finland',        'KOTKA',         2800, 2795))
lines.append(wew('Finland',        'OULU',          4010, 4195))
lines.append(wew('Finland',        'RAUMA',         2800, 2795))
lines.append(wew('France',         'LE HAVRE',      2700, 2695))
lines.append(wew('United Kingdom', 'BELFAST',       3350, 3045))
lines.append(wew('United Kingdom', 'COATBRIDGE',    3250, 3175))
lines.append(wew('United Kingdom', 'GRANGEMOUTH',   3150, 3275))
lines.append(wew('United Kingdom', 'IMMINGHAM',     3150, 3395, 'ROTTERDAM'))
lines.append(wew('United Kingdom', 'SOUTHAMPTON',   2650, 2595))
lines.append(wew('United Kingdom', 'SOUTH SHIELDS', 3120, 3475))
lines.append(wew('United Kingdom', 'TEESPORT',      3150, 3275))
lines.append(wew('Ireland',        'DUBLIN',        3050, 3045))
lines.append(wew('Ireland',        'CORK',          3050, 3045))
lines.append(wew('Lithuania',      'KLAIPEDA',      2900, 2895))
lines.append(wew('Latvia',         'RIGA',          2900, 2895))
lines.append(wew('Netherlands',    'ROTTERDAM',     2650, 2595))
lines.append(wew('Norway',         'BERGEN',        3450, 4095))
lines.append(wew('Norway',         'FREDRIKSTAD',   3375, 3595))
lines.append(wew('Norway',         'KRISTIANSAND',  3400, 3795))
lines.append(wew('Norway',         'LARVIK',        3350, 3720))
lines.append(wew('Norway',         'OSLO',          3600, 3595))
lines.append(wew('Poland',         'GDANSK',        2700, 2695))
lines.append(wew('Poland',         'GDYNIA',        2700, 2695))
lines.append(wew('Portugal',       'LEIXOES',       2800, 2895, 'ROTTERDAM'))
lines.append(wew('Portugal',       'LISBON',        2800, 2895, 'ROTTERDAM'))
lines.append(wew('Sweden',         'AHUS',          3150, 3145))
lines.append(wew('Sweden',         'GOTHENBURG',    2700, 2695))
lines.append(wew('Sweden',         'GAVLE',         2950, 3045))
lines.append(wew('Sweden',         'HELSINGBORG',   2850, 2845))
lines.append(wew('Sweden',         'NORRKOPING',    3900, 4245))
lines.append(wew('Sweden',         'SODERTALJE',    3100, 3295))
lines.append(wew('Sweden',         'STOCKHOLM',     3850, 4295))
lines.append("")

# ============================================================
# WMW — MEDITERRANEAN (01-07 Jul 2026)
# ============================================================
lines.append("-- ======== WMW — MEDITERRANEAN (01-07 Jul 2026 — ONE WEEK ONLY) ========")
lines.append("-- CAF,CSS,EFS,MBS incl; HEA collect (not included) | OBS USD277/teu | EES USD181/teu")
lines.append("")
lines.append(wmw('Albania',    'DURRES',        2800, 2800))
lines.append(wmw('Bulgaria',   'BOURGAS',       3810, 4115))
lines.append(wmw('Bulgaria',   'VARNA',         4055, 3590, notes='20ft>40ft on source sheet'))
lines.append(wmw('Egypt',      'ALEXANDRIA',    3560, 3615))
lines.append(wmw('Egypt',      'DAMIETTA',      3310, 3115))
lines.append(wmw('Spain',      'ALGECIRAS',     3310, 3115))
lines.append(wmw('Spain',      'BARCELONA',     3310, 3115))
lines.append(wmw('Spain',      'VALENCIA',      3310, 3115))
lines.append(wmw('France',     'FOS SUR MER',   3310, 3115))
lines.append(wmw('Greece',     'PIRAEUS',       3310, 3115))
lines.append(wmw('Greece',     'THESSALONIKI',  3410, 3315))
lines.append(wmw('Croatia',    'RIJEKA',        3760, 4015))
lines.append(wmw('Israel',     'ASHDOD',        3510, 3515))
lines.append(wmw('Israel',     'HAIFA',         3510, 3515))
lines.append(wmw('Italy',      'ANCONA',        3360, 3215))
lines.append(wmw('Italy',      'GENOA',         3310, 3115))
lines.append(wmw('Italy',      'LIVORNO',       3510, 3515))
lines.append(wmw('Italy',      'RAVENNA',       3710, 3815))
lines.append(wmw('Italy',      'LA SPEZIA',     3310, 3115))
lines.append(wmw('Italy',      'TRIESTE',       3760, 3915))
lines.append(wmw('Italy',      'VENICE',        3410, 3315))
lines.append(wmw('Lebanon',    'BEIRUT',        3460, 3415))
lines.append(wmw('Morocco',    'CASABLANCA',    4785, 5730))
lines.append(wmw('Morocco',    'TANGIER',       4285, 4730))
lines.append(wmw('Romania',    'CONSTANTA',     3810, 4115))
lines.append(wmw('Slovenia',   'KOPER',         3360, 3215))
lines.append(wmw('Turkey',     'ALIAGA',        3360, 3215))
lines.append(wmw('Turkey',     'GEMLIK',        3560, 3615))
lines.append(wmw('Turkey',     'ISKENDERUN',    3410, 3315))
lines.append(wmw('Turkey',     'ISTANBUL',      3360, 3215))
lines.append(wmw('Turkey',     'IZMIT',         3360, 3215))
lines.append(wmw('Turkey',     'MERSIN',        3360, 3215))
lines.append("")

# ============================================================
# AUS / NZS (01-14 Jul 2026)
# ============================================================
lines.append("-- ======== AUSTRALIA / NEW ZEALAND (01-14 Jul 2026) ========")
lines.append("-- EFS,MBS,OBS,PSS incl | ISL USD32/ctr | SLF USD10/ctr | Flexi-tank +USD100/TEU")
lines.append("")
lines.append(aus('Australia', 'ADELAIDE',             1450, 2900))
lines.append(aus('Australia', 'MELBOURNE / BRISBANE', 1450, 2900, notes='Combined port group rate (AUEC)'))
lines.append(aus('Australia', 'FREMANTLE',            1450, 2900, 'SINGAPORE', notes='WAU service lane'))
lines.append(aus('Australia', 'SYDNEY',               1450, 2900))
lines.append(nzs('New Zealand','AUCKLAND',            1175, 2250))
lines.append(nzs('New Zealand','NZ BASE PORTS',       1175, 2250, notes='NZ base ports group rate'))
lines.append("")

# ============================================================
# LEW — LAEC / LUX SERVICE (01-14 Jul 2026)
# ============================================================
lines.append("-- ======== LEW — LAEC / LUX SERVICE (01-14 Jul 2026) ========")
lines.append("-- EFS,HEA,MBS,OBS,PSS incl | CSS USD15/unit | SLF USD10/unit | via ALGECIRAS or ROTTERDAM")
lines.append("")
lines.append("-- via ALGECIRAS")
lines.append(lew('Argentina', 'BUENOS AIRES',   1500, 1700, 'ALGECIRAS'))
lines.append(lew('Brazil',    'ITAJAI',         1500, 1700, 'ALGECIRAS'))
lines.append(lew('Brazil',    'PARANAGUA',      1500, 1700, 'ALGECIRAS'))
lines.append(lew('Brazil',    'RIO DE JANEIRO', 1500, 1700, 'ALGECIRAS'))
lines.append(lew('Brazil',    'SANTOS',         1500, 1700, 'ALGECIRAS'))
lines.append(lew('Paraguay',  'ASUNCION',       3200, 3400, 'ALGECIRAS'))
lines.append(lew('Uruguay',   'MONTEVIDEO',     1500, 1700, 'ALGECIRAS'))
lines.append("")
lines.append("-- via ROTTERDAM")
lines.append(lew('Argentina', 'BUENOS AIRES',   1500, 1700, 'ROTTERDAM'))
lines.append(lew('Brazil',    'ITAJAI',         1500, 1700, 'ROTTERDAM'))
lines.append(lew('Brazil',    'PARANAGUA',      1500, 1700, 'ROTTERDAM'))
lines.append(lew('Brazil',    'RIO DE JANEIRO', 1500, 1700, 'ROTTERDAM'))
lines.append(lew('Brazil',    'SANTOS',         1500, 1700, 'ROTTERDAM'))
lines.append(lew('Paraguay',  'ASUNCION',       3200, 3400, 'ROTTERDAM'))
lines.append(lew('Uruguay',   'MONTEVIDEO',     1500, 1700, 'ROTTERDAM'))
lines.append("")

# ============================================================
# EFW — EAST AFRICA (01-14 Jul 2026)
# ============================================================
lines.append("-- ======== EFW — EAST AFRICA (01-14 Jul 2026) ========")
lines.append("-- AMS,BAF,BRS,CGD,HEA,LSF,MBS,OBS,WRC incl (Dar es Salaam also THD)")
lines.append("")
lines.append(efw('Kenya',    'MOMBASA',       1700, 1700))
lines.append(efw('Tanzania', 'DAR ES SALAAM', 1900, 1900, surch=S_EFW_DAR))
lines.append("")

# ============================================================
# WFW — WEST AFRICA (01-14 Jul 2026)
# ============================================================
lines.append("-- ======== WFW — WEST AFRICA (01-14 Jul 2026) ========")
lines.append("-- AMS,BAF,BRS,CGD,EPH,HEA,LSF,MBS,OBS,WRC incl")
lines.append("")
lines.append(wfw('Benin',       'COTONOU', 3700, 5100))
lines.append(wfw('Ivory Coast', 'ABIDJAN', 3700, 5100))
lines.append(wfw('Ghana',       'TEMA',    2500, 2900))
lines.append(wfw('Nigeria',     'APAPA',   2900, 3000))
lines.append(wfw('Nigeria',     'LEKKI',   4300, 5900))
lines.append(wfw('Nigeria',     'ONNE',    4300, 5900))
lines.append(wfw('Nigeria',     'TIN CAN', 2900, 3000))
lines.append(wfw('Togo',        'LOME',    3700, 5100))
lines.append("")

full_text = '\n'.join(lines)
total = full_text.count('\nINSERT ') + (1 if full_text.startswith('INSERT ') else 0)
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
