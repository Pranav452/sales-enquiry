import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'ONE'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://one-line.com'

VF      = '2026-06-01'
VT_END  = '2026-06-30'   # IWE (MRG Far East)
VT_15   = '2026-06-15'   # WEW, WMW
VT_14   = '2026-06-14'   # AUS, NZS, EFW, WFW, LWE, LEW LUX
VT_07   = '2026-06-07'   # CSE, LEW direct

# ================================================================
# Surcharge strings
# ================================================================
S_MRG     = 'MBS:incl;ISL:incl;OBS:incl;PSF:incl;SLF:incl;EFS:60/20-120/40'
S_MRG_YAS = 'MBS:incl;ISL:incl;OBS:incl;PSF:incl;SLF:incl;YAS:incl;EFS:60/20-120/40'
S_EUR     = 'MBS:incl;CAF:incl;CSS:incl;HEA:cond;OBS:117/teu;EES:95/teu;EFS:120/20-240/40;ISL:32/ctr;SLF:10/ctr'
S_EUR_NHE = 'MBS:incl;CAF:incl;CSS:incl;OBS:117/teu;EES:95/teu;EFS:120/20-240/40;ISL:32/ctr;SLF:10/ctr'
S_MED     = 'MBS:incl;CAF:incl;CSS:incl;OBS:119/teu;EES:182/teu;EFS:120/20-240/40;ISL:32/ctr;SLF:10/ctr'
S_AUS     = 'MBS:incl;OBS:incl;ISL:32/ctr;SLF:10/ctr;EFS:120/20-240/40'
S_CSE     = 'MBS:incl;OBS:incl;EFS:120/20-240/40;PSS:incl;PCT:40/teu;CSS:15/ctr;SLF:10/ctr'
S_LEW     = 'MBS:incl;OBS:incl;EFS:120/20-240/40;PSS:incl;HEA:cond;CSS:15/ctr;SLF:10/ctr'
S_LWE     = 'MBS:incl;OBS:incl;BAF:incl;BRS:incl;EFS:120/20-240/40;PSS:incl;HEA:cond;CSS:15/ctr;SLF:10/ctr'
S_EFW     = 'MBS:incl;OBS:incl;BAF:incl;BRS:incl;AMS:incl;CGD:incl;HEA:cond;LSF:incl;WRC:incl;EFS:120/20-240/40;CSS:15/ctr;SLF:10/ctr'
S_WFW     = 'MBS:incl;OBS:incl;BAF:incl;BRS:incl;AMS:incl;CGD:incl;EPH:incl;HEA:cond;LSF:incl;WRC:incl;EFS:120/20-240/40;CSS:15/ctr;SLF:10/ctr'

# ================================================================
# Clauses per trade
# ================================================================
CL_MRG = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Far East / SE Asia / South Asia (IWE) rates"
    "|Validity: June 2026"
    "|Rates inclusive of: MBS, ISL, OBS, PSF, SLF | Subject to: EFS USD 60/20' USD 120/40' collect"
    "|Japan rates include YAS | War Risk Surcharge USD 55/TEU"
    "|THC/DOC both ends | Space and equipment subject to availability"
    "|Rates NOT applicable for lot shipments of Onion, Soya, Agri products & Raw Cotton"
)
CL_EUR = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Europe (WEW) rates"
    "|Validity: 01-15 Jun 2026"
    "|Rates inclusive of: MBS, CAF, CSS | OBS USD 117/TEU | EES USD 95/TEU extra"
    "|EFS USD 120/20' USD 240/40' | ISL USD 32/ctr | SLF USD 10/ctr"
    "|HEA USD 300/20' for net weight >= 16MT (where applicable)"
    "|THC/DOC both ends | Space and equipment subject to availability"
)
CL_MED = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Mediterranean (WMW) rates"
    "|Validity: 01-15 Jun 2026"
    "|Rates inclusive of: MBS, CAF, CSS | OBS USD 119/TEU | EES USD 182/TEU extra"
    "|EFS USD 120/20' USD 240/40' | ISL USD 32/ctr | SLF USD 10/ctr"
    "|HEA conditional (net weight >= 16MT or 18MT per port)"
    "|THC/DOC both ends | Space and equipment subject to availability"
)
CL_AUS = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Australia (AUS) rates"
    "|Validity: 01-14 Jun 2026"
    "|Rates inclusive of: MBS, OBS | ISL USD 32/ctr | SLF USD 10/ctr"
    "|EFS USD 120/20' USD 240/40' | THC/DOC both ends"
    "|Space and equipment subject to availability"
)
CL_NZS = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | New Zealand (NZS) rates"
    "|Validity: 01-14 Jun 2026"
    "|Rates inclusive of: MBS, OBS | ISL USD 32/ctr | SLF USD 10/ctr"
    "|EFS USD 120/20' USD 240/40' | THC/DOC both ends"
    "|Space and equipment subject to availability"
)
CL_CSE = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Caribbean / Central America (CSE) rates"
    "|Validity: 01-07 Jun 2026"
    "|Rates inclusive of: MBS, OBS, EFS, PSS | PCT USD 40/TEU | CSS USD 15/ctr | SLF USD 10/ctr"
    "|HEA conditional | THC/DOC both ends | Space and equipment subject to availability"
    "|EFS USD 120/20' USD 240/40'"
)
CL_LEW = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | East Coast South America / LAEC (LEW) rates"
    "|LUX service (via Algeciras or Rotterdam): valid 01-14 Jun 2026"
    "|Direct service: valid 01-07 Jun 2026"
    "|Rates inclusive of: MBS, OBS, EFS, PSS, HEA (conditional)"
    "|CSS USD 15/ctr | SLF USD 10/ctr | EFS USD 120/20' USD 240/40'"
    "|THC/DOC both ends | Space and equipment subject to availability"
)
CL_LWE = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | West Coast South America / LAWC (LWE) rates"
    "|Validity: 01-14 Jun 2026"
    "|Rates inclusive of: MBS, OBS, BAF, BRS, EFS, PSS | HEA conditional"
    "|CSS USD 15/ctr | SLF USD 10/ctr | EFS USD 120/20' USD 240/40'"
    "|THC/DOC both ends | Space and equipment subject to availability"
)
CL_EFW = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | East Africa (EFW) rates"
    "|Validity: 01-14 Jun 2026"
    "|Rates inclusive of: MBS, OBS, BAF, BRS, AMS, CGD, HEA, LSF, WRC"
    "|EFS USD 120/20' USD 240/40' | CSS USD 15/ctr | SLF USD 10/ctr"
    "|THC/DOC both ends | 14 days free detention at destination"
)
CL_WFW = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | West Africa (WFW) rates"
    "|Validity: 01-14 Jun 2026"
    "|Rates inclusive of: MBS, OBS, BAF, BRS, AMS, CGD, EPH, HEA, LSF, WRC"
    "|EFS USD 120/20' USD 240/40' | CSS USD 15/ctr | SLF USD 10/ctr"
    "|THC/DOC both ends | 14 days free detention at destination"
)

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, vf, vt, via, surch, clauses, notes=''):
    v = f"'{esc(via)}'" if via else 'NULL'
    n = f"'{esc(notes)}'" if notes else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{esc(dc)}','{esc(dp)}',"
        f"'USD',{r20},{r40},'{vf}','{vt}',{v},'{esc(surch)}',{n},'{esc(clauses)}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

def mrg(dc, dp, r20, r40, via='', yas=False, notes=''):
    s = S_MRG_YAS if yas else S_MRG
    return row(dc, dp, r20, r40, VF, VT_END, via, s, CL_MRG, notes)

def eur(dc, dp, r20, r40, via='', hea=True, notes=''):
    s = S_EUR if hea else S_EUR_NHE
    return row(dc, dp, r20, r40, VF, VT_15, via, s, CL_EUR, notes)

def med(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF, VT_15, via, S_MED, CL_MED, notes)

def aus(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF, VT_14, via, S_AUS, CL_AUS, notes)

def nzs(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF, VT_14, via, S_AUS, CL_NZS, notes)

def cse(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF, VT_07, via, S_CSE, CL_CSE, notes)

def lew_lux(dc, dp, r20, r40, via_ts, notes=''):
    return row(dc, dp, r20, r40, VF, VT_14, via_ts, S_LEW, CL_LEW, notes)

def lew_dir(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF, VT_07, '', S_LEW, CL_LEW, notes)

def lwe(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF, VT_14, via, S_LWE, CL_LWE, notes)

def efw(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF, VT_14, via, S_EFW, CL_EFW, notes)

def wfw(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF, VT_14, via, S_WFW, CL_WFW, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- ONE (Ocean Network Express) — MRG NHAVA SHEVA Rates June 2026")
lines.append("-- IWE Far East/SE Asia: valid 01-30 Jun 2026")
lines.append("-- WEW Europe / WMW MED: valid 01-15 Jun 2026")
lines.append("-- AUS / NZS / EFW / WFW / LWE: valid 01-14 Jun 2026")
lines.append("-- CSE / LEW direct: valid 01-07 Jun 2026")
lines.append("-- LEW LUX (via ALGECIRAS/ROTTERDAM): valid 01-14 Jun 2026")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# IWE / MRG — FAR EAST, SE ASIA, SOUTH ASIA (01-30 Jun 2026)
# ============================================================
lines.append("-- ======== IWE / MRG — FAR EAST / SE ASIA / SOUTH ASIA (01-30 Jun 2026) ========")
lines.append("-- Incl: MBS, ISL, OBS, PSF, SLF | EFS USD 60/120 collect | YAS incl for Japan")
lines.append("-- No offer for Middle East ports (conflict) — skipped")
lines.append("-- Kwangyang 20ft=10089 (corrupt on source sheet) — skipped")
lines.append("")

lines.append("-- Brunei")
lines.append(mrg('Brunei',      'MUARA',                          871, 1649, 'SINGAPORE'))
lines.append("")

lines.append("-- Indonesia")
lines.append(mrg('Indonesia',   'PANJANG TERMINAL',               859, 1601, 'SINGAPORE'))
lines.append(mrg('Indonesia',   'CIKARANG',                       740,  905, 'SINGAPORE', notes='Truck delivery inland'))
lines.append(mrg('Indonesia',   'PALEMBANG',                      265,  575, 'SINGAPORE'))
lines.append(mrg('Indonesia',   'BELAWAN',                        100,  150, 'SINGAPORE'))
lines.append(mrg('Indonesia',   'JAKARTA',                         79,  125, 'SINGAPORE'))
lines.append(mrg('Indonesia',   'SEMARANG',                       195,  250, 'SINGAPORE'))
lines.append(mrg('Indonesia',   'SURABAYA',                       163,  160, 'SINGAPORE', notes='20ft>40ft on source sheet'))
lines.append(mrg('Indonesia',   'BALIKPAPAN',                     750, 1375, 'SINGAPORE'))
lines.append("")

lines.append("-- Malaysia")
lines.append(mrg('Malaysia',    'PORT KLANG',                       5,   10))
lines.append(mrg('Malaysia',    'PASIR GUDANG',                   100,  100, 'SINGAPORE'))
lines.append(mrg('Malaysia',    'PENANG',                         115,  150, 'SINGAPORE'))
lines.append(mrg('Malaysia',    'KUCHING',                        700, 1265, 'SINGAPORE'))
lines.append(mrg('Malaysia',    'KOTA KINABALU',                  791, 1323, 'SINGAPORE'))
lines.append("")

lines.append("-- Singapore")
lines.append(mrg('Singapore',   'SINGAPORE',                        5,   10))
lines.append("")

lines.append("-- Thailand")
lines.append(mrg('Thailand',    'LAEM CHABANG',                    20,   30))
lines.append(mrg('Thailand',    'BANGKOK (BMT/PAT)',                25,   50, 'LAEM CHABANG'))
lines.append(mrg('Thailand',    'LAT KRABANG',                     25,   35, 'LAEM CHABANG', notes='Truck delivery inland'))
lines.append(mrg('Thailand',    'SONGKHLA',                       145,  125, 'SINGAPORE',    notes='20ft>40ft on source sheet'))
lines.append("")

lines.append("-- Vietnam")
lines.append(mrg('Vietnam',     'HO CHI MINH (CAI MEP)',            5,    5, 'SINGAPORE'))
lines.append(mrg('Vietnam',     'HO CHI MINH',                     15,   30, 'SINGAPORE'))
lines.append(mrg('Vietnam',     'HAIPHONG',                         5,    5, 'SINGAPORE'))
lines.append(mrg('Vietnam',     'DANANG',                         435,  470, 'SINGAPORE'))
lines.append("")

lines.append("-- Cambodia")
lines.append(mrg('Cambodia',    'PHNOM PENH',                     150,  175, 'HO CHI MINH (CAI MEP)'))
lines.append(mrg('Cambodia',    'SIHANOUKVILLE',                  274,  200, 'SINGAPORE', notes='20ft>40ft on source sheet'))
lines.append("")

lines.append("-- Myanmar")
lines.append(mrg('Myanmar',     'YANGON',                         459,  538, 'SINGAPORE'))
lines.append("")

lines.append("-- Philippines")
lines.append(mrg('Philippines', 'MANILA',                         150,  200, 'SINGAPORE'))
lines.append(mrg('Philippines', 'GENERAL SANTOS',                 200,  250, 'SINGAPORE'))
lines.append(mrg('Philippines', 'SUBIC',                          323,  533, 'SINGAPORE'))
lines.append(mrg('Philippines', 'CEBU',                           285,  365, 'SINGAPORE'))
lines.append(mrg('Philippines', 'BATANGAS',                       700,  500, 'SINGAPORE', notes='20ft>40ft on source sheet'))
lines.append(mrg('Philippines', 'DAVAO',                            5,    5, 'SINGAPORE'))
lines.append("")

lines.append("-- Sri Lanka")
lines.append(mrg('Sri Lanka',   'COLOMBO',                        250,  350))
lines.append("")

lines.append("-- Maldives")
lines.append(mrg('Maldives',    'MALE',                           950, 1715, 'COLOMBO'))
lines.append("")

lines.append("-- Bangladesh")
lines.append(mrg('Bangladesh',  'CHITTAGONG',                     850,  680, 'COLOMBO', notes='40GP USD 1000; source sheet HCD USD 680'))
lines.append(mrg('Bangladesh',  'DHAKA',                         1635, 2150, 'COLOMBO', notes='40GP USD 2615; source sheet HCD USD 2150; inland barge'))
lines.append("")

lines.append("-- Hong Kong")
lines.append(mrg('Hong Kong',   'HONG KONG',                        5,    5))
lines.append("")

lines.append("-- South Korea")
lines.append(mrg('South Korea', 'PUSAN',                            5,   10))
lines.append(mrg('South Korea', 'INCHEON',                        132,    5, 'SINGAPORE', notes='20ft>40ft on source sheet'))
# Kwangyang skipped: 20ft=10089 corrupt on source sheet
lines.append("-- Korea KWANGYANG skipped: 20ft rate=10089 (corrupt on source sheet)")
lines.append("")

lines.append("-- Taiwan")
lines.append(mrg('Taiwan',      'KAOHSIUNG',                      110,  255))
lines.append(mrg('Taiwan',      'KEELUNG',                        495,  680, 'KAOHSIUNG'))
lines.append(mrg('Taiwan',      'TAICHUNG',                       210,  525, 'KAOHSIUNG'))
lines.append(mrg('Taiwan',      'TAOYUAN',                        300,  590, 'KAOHSIUNG'))
lines.append("")

lines.append("-- Japan")
lines.append(mrg('Japan',       'KOBE',                            25,   50, 'SINGAPORE', yas=True))
lines.append(mrg('Japan',       'OSAKA',                          250,  420, 'SINGAPORE', yas=True))
lines.append(mrg('Japan',       'NAGOYA',                         172,   50, 'SINGAPORE', yas=True, notes='20ft>40ft on source sheet'))
lines.append(mrg('Japan',       'TOKYO',                          220,  220, 'SINGAPORE', yas=True))
lines.append(mrg('Japan',       'YOKOHAMA',                       135,   50, 'SINGAPORE', yas=True, notes='20ft>40ft on source sheet'))
lines.append(mrg('Japan',       'YOKKAICHI',                      218,   50, 'SINGAPORE', yas=True, notes='20ft>40ft on source sheet'))
lines.append(mrg('Japan',       'HIROSHIMA',                      485,  306, 'SINGAPORE', yas=True, notes='20ft>40ft on source sheet'))
lines.append(mrg('Japan',       'MATSUYAMA',                      465,  480, 'SINGAPORE', yas=True))
lines.append(mrg('Japan',       'MOJI',                           236,  530, 'SINGAPORE', yas=True))
lines.append(mrg('Japan',       'MIZUSHIMA',                      365,  775, 'SINGAPORE', yas=True))
lines.append(mrg('Japan',       'SHIBUSHI',                       510,  745, 'SINGAPORE', yas=True))
lines.append(mrg('Japan',       'OITA',                           380,  950, 'SINGAPORE', yas=True))
lines.append(mrg('Japan',       'HAKATA',                         190,    5, 'SINGAPORE', yas=True, notes='20ft>40ft on source sheet'))
lines.append(mrg('Japan',       'SHIMIZU',                        165,    5, 'SINGAPORE', yas=True, notes='20ft>40ft on source sheet'))
lines.append(mrg('Japan',       'SENDAI',                         690,  660, 'SINGAPORE', yas=True, notes='40GP USD 659; source sheet HCD USD 660'))
lines.append(mrg('Japan',       'NIIGATA',                        140,    5, 'SINGAPORE', yas=True, notes='20ft>40ft on source sheet; via Singapore & Busan'))
lines.append(mrg('Japan',       'TOMAKOMAI',                      170,   45, 'SINGAPORE', yas=True, notes='20ft>40ft on source sheet; via Singapore & Busan'))
lines.append(mrg('Japan',       'HACHINOHE',                     1002, 1503, 'SINGAPORE', yas=True, notes='via Singapore & Busan'))
lines.append("")

lines.append("-- China — South (CIP via Hong Kong)")
lines.append(mrg('China',       'QINZHOU',                               100,  200, 'HONG KONG'))
lines.append(mrg('China',       'GUANGZHOU',                       585,  805, 'HONG KONG'))
lines.append(mrg('China',       'NANSHA',                           75,  100, 'HONG KONG'))
lines.append(mrg('China',       'HUANGPU',                          25,   50, 'HONG KONG'))
lines.append(mrg('China',       'GAOLAN',                          206,  445, 'HONG KONG'))
lines.append(mrg('China',       'JIANGMEN',                        100,   75, 'HONG KONG', notes='20ft>40ft on source sheet'))
lines.append(mrg('China',       'RONGQI',                           50,  185, 'HONG KONG'))
lines.append(mrg('China',       'SANSHAN',                         200,  225, 'HONG KONG'))
lines.append(mrg('China',       'BEIJIAO',                          25,   50, 'HONG KONG'))
lines.append(mrg('China',       'XIAOLAN',                          15,   25, 'HONG KONG'))
lines.append(mrg('China',       'ZHONGSHAN',                        15,   25, 'HONG KONG'))
lines.append(mrg('China',       'ZHUHAI',                           15,   25, 'HONG KONG'))
lines.append(mrg('China',       'GONGYI',                          100,  150, 'HONG KONG'))
lines.append(mrg('China',       'SHEKOU',                          235,  260))
lines.append(mrg('China',       'YANTIAN',                         215,  265, 'HONG KONG'))
lines.append(mrg('China',       'FUZHOU',                          290,  240, 'HONG KONG', notes='20ft>40ft on source sheet'))
lines.append(mrg('China',       'XIAMEN',                          195,  259, 'HONG KONG', notes='40GP USD 260'))
lines.append("")

lines.append("-- China — Central (CIP via Shanghai or direct)")
lines.append(mrg('China',       'SHANGHAI',                          5,    5))
lines.append(mrg('China',       'NINGBO',                            5,    5))
lines.append(mrg('China',       'NANTONG',                         217,   50, 'SHANGHAI', notes='20ft>40ft on source sheet'))
lines.append(mrg('China',       'ZHANGJIAGANG',                     55,  200, 'SHANGHAI'))
lines.append(mrg('China',       'WUHAN',                            80,   25, 'SHANGHAI', notes='40GP USD 300; source sheet HCD USD 25 (possibly corrupt); inland river'))
lines.append(mrg('China',       'CHONGQING',                       685,  485, 'HONG KONG', notes='20ft>40ft on source sheet; inland rail'))
lines.append("")

lines.append("-- China — North (NCI direct or via Shanghai)")
lines.append(mrg('China',       'QINGDAO',                           5,    5))
lines.append(mrg('China',       'XINGANG',                           5,    5))
lines.append(mrg('China',       'DALIAN',                          260,  300, 'SINGAPORE'))
lines.append(mrg('China',       'LIANYUNGANG',                     197,  146, 'SHANGHAI', notes='20ft>40ft on source sheet'))
lines.append("")

lines.append("-- Egypt / Saudi (RGI service)")
lines.append(mrg('Egypt',        'AIN SOKHNA',                    2200, 2400))
lines.append(mrg('Saudi Arabia', 'JEDDAH',                        2100, 2300))
lines.append("")

# ============================================================
# WEW — EUROPE (01-15 Jun 2026)
# ============================================================
lines.append("-- ======== EUROPE / WEW (01-15 Jun 2026) ========")
lines.append("-- OBS USD 117/TEU | EES USD 95/TEU | EFS USD 120/240 | ISL USD 32/ctr | SLF USD 10/ctr")
lines.append("-- HEA: USD 300/20' for net weight >= 16MT (marked where applicable)")
lines.append("")

lines.append("-- Belgium")
lines.append(eur('Belgium',     'ANTWERP',                       1170,  935))
lines.append("")
lines.append("-- Germany")
lines.append(eur('Germany',     'HAMBURG',                       1170,  935))
lines.append("")
lines.append("-- Denmark")
lines.append(eur('Denmark',     'AALBORG',                       1595, 1510))
lines.append(eur('Denmark',     'AARHUS',                        1370, 1135))
lines.append(eur('Denmark',     'COPENHAGEN',                    1370, 1135))
lines.append(eur('Denmark',     'FREDERICIA',                    1370, 1135, 'HAMBURG'))
lines.append("")
lines.append("-- Estonia")
lines.append(eur('Estonia',     'TALLINN',                       1420, 1235))
lines.append("")
lines.append("-- Spain (Atlantic) — no HEA")
lines.append(eur('Spain',       'BILBAO',                        2095, 1985, hea=False))
lines.append(eur('Spain',       'GIJON',                         2095, 1985, hea=False))
lines.append(eur('Spain',       'VIGO',                          2095, 1985, hea=False))
lines.append("")
lines.append("-- Finland")
lines.append(eur('Finland',     'HELSINKI',                      1320, 1135))
lines.append(eur('Finland',     'KOTKA',                         1320, 1135))
lines.append(eur('Finland',     'OULU',                          2530, 2535))
lines.append(eur('Finland',     'RAUMA',                         1320, 1135))
lines.append("")
lines.append("-- France")
lines.append(eur('France',      'LE HAVRE',                      1220, 1035))
lines.append("")
lines.append("-- United Kingdom")
lines.append(eur('United Kingdom', 'BELFAST',                    1870, 1385))
lines.append(eur('United Kingdom', 'COATBRIDGE',                 1770, 1515))
lines.append(eur('United Kingdom', 'GRANGEMOUTH',                1670, 1615))
lines.append(eur('United Kingdom', 'IMMINGHAM',                  1670, 1735, 'ROTTERDAM'))
lines.append(eur('United Kingdom', 'SOUTHAMPTON',                1170,  935))
lines.append(eur('United Kingdom', 'SOUTH SHIELDS',              1640, 1815))
lines.append(eur('United Kingdom', 'TEESPORT',                   1670, 1615))
lines.append("")
lines.append("-- Ireland")
lines.append(eur('Ireland',     'DUBLIN',                        1570, 1385))
lines.append(eur('Ireland',     'CORK',                          1570, 1385))
lines.append("")
lines.append("-- Lithuania")
lines.append(eur('Lithuania',   'KLAIPEDA',                      1420, 1235))
lines.append("")
lines.append("-- Latvia")
lines.append(eur('Latvia',      'RIGA',                          1420, 1235))
lines.append("")
lines.append("-- Netherlands")
lines.append(eur('Netherlands', 'ROTTERDAM',                     1170,  935))
lines.append("")
lines.append("-- Norway")
lines.append(eur('Norway',      'BERGEN',                        1970, 2435))
lines.append(eur('Norway',      'FREDRIKSTAD',                   1895, 1935))
lines.append(eur('Norway',      'KRISTIANSAND',                  1920, 2135))
lines.append(eur('Norway',      'LARVIK',                        1870, 2060))
lines.append(eur('Norway',      'OSLO',                          2120, 1935))
lines.append("")
lines.append("-- Poland")
lines.append(eur('Poland',      'GDANSK',                        1220, 1035))
lines.append(eur('Poland',      'GDYNIA',                        1220, 1035))
lines.append("")
lines.append("-- Portugal")
lines.append(eur('Portugal',    'LEIXOES',                       1320, 1235))
lines.append(eur('Portugal',    'LISBON',                        1320, 1235))
lines.append("")
lines.append("-- Sweden")
lines.append(eur('Sweden',      'AAHUS',                         1670, 1485))
lines.append(eur('Sweden',      'GOTHENBURG',                    1220, 1035))
lines.append(eur('Sweden',      'GAVLE',                         1470, 1385))
lines.append(eur('Sweden',      'HELSINGBORG',                   1370, 1185))
lines.append(eur('Sweden',      'NORRKOPING',                    2420, 2585))
lines.append(eur('Sweden',      'SODERTALJE',                    1620, 1635))
lines.append(eur('Sweden',      'STOCKHOLM',                     2370, 2635))
lines.append("")

# ============================================================
# WMW — MEDITERRANEAN (01-15 Jun 2026)
# ============================================================
lines.append("-- ======== MEDITERRANEAN / WMW (01-15 Jun 2026) ========")
lines.append("-- OBS USD 119/TEU | EES USD 182/TEU | EFS USD 120/240 | ISL USD 32/ctr | SLF USD 10/ctr")
lines.append("")

lines.append("-- Albania")
lines.append(med('Albania',     'DURRES',                        1800, 1800))
lines.append("")
lines.append("-- Bulgaria")
lines.append(med('Bulgaria',    'BOURGAS',                       2345, 2485))
lines.append(med('Bulgaria',    'VARNA',                         2710, 2400, notes='20ft>40ft on source sheet'))
lines.append("")
lines.append("-- Egypt")
lines.append(med('Egypt',       'ALEXANDRIA',                    1945, 1685))
lines.append(med('Egypt',       'DAMIETTA',                      1845, 1485))
lines.append("")
lines.append("-- Spain (Med)")
lines.append(med('Spain',       'ALGECIRAS',                     1845, 1485))
lines.append(med('Spain',       'BARCELONA',                     1845, 1485))
lines.append(med('Spain',       'VALENCIA',                      1845, 1485))
lines.append("")
lines.append("-- France")
lines.append(med('France',      'FOS-SUR-MER',                   1845, 1485))
lines.append("")
lines.append("-- Greece")
lines.append(med('Greece',      'PIRAEUS',                       1845, 1485))
lines.append(med('Greece',      'THESSALONIKI',                  1945, 1685))
lines.append("")
lines.append("-- Croatia")
lines.append(med('Croatia',     'RIJEKA',                        2295, 2385))
lines.append("")
lines.append("-- Israel")
lines.append(med('Israel',      'ASHDOD',                        2045, 1885))
lines.append(med('Israel',      'HAIFA',                         2045, 1885))
lines.append("")
lines.append("-- Italy")
lines.append(med('Italy',       'ANCONA',                        1895, 1585))
lines.append(med('Italy',       'GENOA',                         1845, 1485))
lines.append(med('Italy',       'LIVORNO',                       2045, 1885))
lines.append(med('Italy',       'RAVENNA',                       2245, 2185))
lines.append(med('Italy',       'LA SPEZIA',                     1845, 1485))
lines.append(med('Italy',       'TRIESTE',                       2295, 2285))
lines.append(med('Italy',       'VENICE',                        1945, 1685))
lines.append("")
lines.append("-- Lebanon")
lines.append(med('Lebanon',     'BEIRUT',                        1995, 1785))
lines.append("")
lines.append("-- Morocco")
lines.append(med('Morocco',     'CASABLANCA',                    3440, 4540))
lines.append(med('Morocco',     'TANGIER',                       2940, 3540))
lines.append("")
lines.append("-- Romania")
lines.append(med('Romania',     'CONSTANTA',                     2345, 2485))
lines.append("")
lines.append("-- Slovenia")
lines.append(med('Slovenia',    'KOPER',                         1895, 1585))
lines.append("")
lines.append("-- Turkey")
lines.append(med('Turkey',      'ALIAGA',                        1895, 1585))
lines.append(med('Turkey',      'GEMLIK',                        2095, 1985))
lines.append(med('Turkey',      'ISKENDERUN',                    1945, 1685))
lines.append(med('Turkey',      'ISTANBUL',                      1895, 1585))
lines.append(med('Turkey',      'IZMIT',                         1895, 1585))
lines.append(med('Turkey',      'MERSIN',                        1895, 1585))
lines.append("")

# ============================================================
# AUS — AUSTRALIA (01-14 Jun 2026)
# ============================================================
lines.append("-- ======== AUSTRALIA / AUS (01-14 Jun 2026) ========")
lines.append("")
lines.append(aus('Australia',   'ADELAIDE',                      1000, 2000))
lines.append(aus('Australia',   'MELBOURNE',                     1000, 2000))
lines.append(aus('Australia',   'BRISBANE',                      1000, 2000))
lines.append(aus('Australia',   'FREMANTLE',                     1000, 2000, 'SINGAPORE'))
lines.append(aus('Australia',   'SYDNEY',                        1000, 2000))
lines.append("")

# ============================================================
# NZS — NEW ZEALAND (01-14 Jun 2026)
# ============================================================
lines.append("-- ======== NEW ZEALAND / NZS (01-14 Jun 2026) ========")
lines.append("")
lines.append(nzs('New Zealand', 'AUCKLAND',                       925, 1750))
lines.append(nzs('New Zealand', 'NZ BASE PORTS',                  925, 1750, notes='NZ base ports group rate'))
lines.append("")

# ============================================================
# CSE — CARIBBEAN / CENTRAL AMERICA (01-07 Jun 2026)
# ============================================================
lines.append("-- ======== CSE CARIBBEAN / CENTRAL AMERICA (01-07 Jun 2026) ========")
lines.append("-- Incl: MBS, OBS, EFS, PSS | PCT USD 40/TEU | CSS USD 15/ctr | SLF USD 10/ctr")
lines.append("")
lines.append(cse('Aruba',             'BARCADERA (ORANJESTAD)',    7000, 7000))
lines.append(cse('Barbados',          'BRIDGETOWN',               7000, 7000))
lines.append(cse('Brazil',            'MANAUS',                   7200, 7200))
lines.append(cse('Brazil',            'VILA DO CONDE',            7200, 7200))
lines.append(cse('Colombia',          'BARRANQUILLA',             5000, 5000))
lines.append(cse('Colombia',          'CARTAGENA',                5000, 5000))
lines.append(cse('Colombia',          'SANTA MARTA',              5000, 5000))
lines.append(cse('Costa Rica',        'MOIN',                     5300, 5300))
lines.append(cse('Curacao',           'WILLEMSTAD',               8000, 8000))
lines.append(cse('Dominican Republic','CAUCEDO',                   5000, 5000))
lines.append(cse('Dominican Republic','RIO HAINA',                 5500, 5500))
lines.append(cse('Guatemala',         'SANTO TOMAS DE CASTILLA',  5300, 5300))
lines.append(cse('Guyana',            'GEORGETOWN',               7000, 7000))
lines.append(cse('Honduras',          'PUERTO CORTES',            5000, 5000))
lines.append(cse('Haiti',             'PORT AU PRINCE',           5700, 5700))
lines.append(cse('Jamaica',           'KINGSTON',                 5500, 5500))
lines.append(cse('Panama',            'COLON FREE ZONE',          4600, 4600, notes='Door delivery'))
lines.append(cse('Panama',            'MANZANILLO',               4500, 4500))
lines.append(cse('Puerto Rico',       'SAN JUAN',                 5500, 5500))
lines.append(cse('Suriname',          'PARAMARIBO',               7000, 7000))
lines.append(cse('Trinidad and Tobago','PORT OF SPAIN',           5000, 5000))
lines.append(cse('Venezuela',         'LA GUAIRA',                6000, 6000))
lines.append(cse('Venezuela',         'PUERTO CABELLO',           6000, 6000))
lines.append("")

# ============================================================
# LEW — LAEC (EAST COAST SOUTH AMERICA)
# LUX service: 01-14 Jun (via ALGECIRAS or ROTTERDAM)
# Direct service: 01-07 Jun
# ============================================================
lines.append("-- ======== LEW / LAEC — EAST COAST SOUTH AMERICA ========")
lines.append("-- LUX service via ALGECIRAS/ROTTERDAM: 01-14 Jun | Direct: 01-07 Jun")
lines.append("")

lines.append("-- LUX via ALGECIRAS (01-14 Jun)")
lines.append(lew_lux('Argentina',  'BUENOS AIRES',  1500, 1700, 'ALGECIRAS'))
lines.append(lew_lux('Brazil',     'ITAJAI',        1500, 1700, 'ALGECIRAS'))
lines.append(lew_lux('Brazil',     'PARANAGUA',     1500, 1700, 'ALGECIRAS'))
lines.append(lew_lux('Brazil',     'RIO DE JANEIRO',1500, 1700, 'ALGECIRAS'))
lines.append(lew_lux('Brazil',     'SANTOS',        1500, 1700, 'ALGECIRAS'))
lines.append(lew_lux('Paraguay',   'ASUNCION',      3200, 3400, 'ALGECIRAS'))
lines.append(lew_lux('Uruguay',    'MONTEVIDEO',    1500, 1700, 'ALGECIRAS'))
lines.append("")

lines.append("-- LUX via ROTTERDAM (01-14 Jun)")
lines.append(lew_lux('Argentina',  'BUENOS AIRES',  1500, 1700, 'ROTTERDAM'))
lines.append(lew_lux('Brazil',     'ITAJAI',        1500, 1700, 'ROTTERDAM'))
lines.append(lew_lux('Brazil',     'PARANAGUA',     1500, 1700, 'ROTTERDAM'))
lines.append(lew_lux('Brazil',     'RIO DE JANEIRO',1500, 1700, 'ROTTERDAM'))
lines.append(lew_lux('Brazil',     'SANTOS',        1500, 1700, 'ROTTERDAM'))
lines.append(lew_lux('Paraguay',   'ASUNCION',      3200, 3400, 'ROTTERDAM'))
lines.append(lew_lux('Uruguay',    'MONTEVIDEO',    1500, 1700, 'ROTTERDAM'))
lines.append("")

lines.append("-- Direct service (01-07 Jun)")
lines.append(lew_dir('Argentina',  'BUENOS AIRES',  6200, 6300))
lines.append(lew_dir('Brazil',     'ITAPOA',        6200, 6300))
lines.append(lew_dir('Brazil',     'NAVEGANTES',    6200, 6300))
lines.append(lew_dir('Brazil',     'PARANAGUA',     6200, 6300))
lines.append(lew_dir('Brazil',     'PECEM',         7600, 7800))
lines.append(lew_dir('Brazil',     'RIO GRANDE',    6200, 6300))
lines.append(lew_dir('Brazil',     'RIO DE JANEIRO',6200, 6300))
lines.append(lew_dir('Brazil',     'SALVADOR',      7600, 7800))
lines.append(lew_dir('Brazil',     'SANTOS',        6200, 6300))
lines.append(lew_dir('Brazil',     'SUAPE',         7600, 7800))
lines.append(lew_dir('Paraguay',   'ASUNCION',      7500, 8000))
lines.append(lew_dir('Uruguay',    'MONTEVIDEO',    6200, 6300))
lines.append("")

# ============================================================
# LWE — LAWC (WEST COAST SOUTH AMERICA) (01-14 Jun 2026)
# ============================================================
lines.append("-- ======== LWE / LAWC — WEST COAST SOUTH AMERICA (01-14 Jun 2026) ========")
lines.append("-- Incl: MBS, OBS, BAF, BRS, EFS, PSS | HEA conditional | CSS USD 15/ctr | SLF USD 10/ctr")
lines.append("")
lines.append(lwe('Chile',        'ARICA',           4875, 5750))
lines.append(lwe('Chile',        'CORONEL',         4575, 4950))
lines.append(lwe('Chile',        'IQUIQUE',         4775, 5650))
lines.append(lwe('Chile',        'LIRQUEN',         4575, 4950))
lines.append(lwe('Chile',        'PUERTO ANGAMOS',  4775, 5650))
lines.append(lwe('Chile',        'SAN ANTONIO',     4475, 4850))
lines.append(lwe('Chile',        'SAN VICENTE',     4575, 4950))
lines.append(lwe('Chile',        'VALPARAISO',      4475, 4850))
lines.append(lwe('Colombia',     'BUENAVENTURA',    4475, 4850))
lines.append(lwe('Costa Rica',   'PUERTO CALDERA',  4875, 5650))
lines.append(lwe('Ecuador',      'GUAYAQUIL',       4475, 4850))
lines.append(lwe('Ecuador',      'POSORJA',         4275, 4650))
lines.append(lwe('Guatemala',    'PUERTO QUETZAL',  4775, 5650))
lines.append(lwe('Mexico',       'ENSENADA',        4775, 5650))
lines.append(lwe('Mexico',       'LAZARO CARDENAS', 4475, 4850))
lines.append(lwe('Mexico',       'MANZANILLO',      4475, 4850))
lines.append(lwe('Nicaragua',    'CORINTO',         4875, 5650))
lines.append(lwe('Panama',       'PANAMA CITY',     5025, 5900, notes='Door delivery; IFD applicable'))
lines.append(lwe('Panama',       'RODMAN',          4875, 5850))
lines.append(lwe('Peru',         'CALLAO',          4475, 4850))
lines.append(lwe('El Salvador',  'ACAJUTLA',        4875, 5650))
lines.append("")

# ============================================================
# EFW — EAST AFRICA (01-14 Jun 2026)
# ============================================================
lines.append("-- ======== EFW — EAST AFRICA (01-14 Jun 2026) ========")
lines.append("-- Incl: MBS, OBS, BAF, BRS, AMS, CGD, HEA, LSF, WRC | EFS USD 120/240 | CSS USD 15/ctr | SLF USD 10/ctr")
lines.append("")
lines.append(efw('Kenya',    'MOMBASA',        1400, 1500))
lines.append(efw('Tanzania', 'DAR ES SALAAM',  1500, 1600))
lines.append("")

# ============================================================
# WFW — WEST AFRICA (01-14 Jun 2026)
# ============================================================
lines.append("-- ======== WFW — WEST AFRICA (01-14 Jun 2026) ========")
lines.append("-- Incl: MBS, OBS, BAF, BRS, AMS, CGD, EPH, HEA, LSF, WRC | EFS USD 120/240 | CSS USD 15/ctr | SLF USD 10/ctr")
lines.append("")
lines.append(wfw('Benin',       'COTONOU',     3200, 4200))
lines.append(wfw("Ivory Coast", 'ABIDJAN',     1600, 2000))
lines.append(wfw('Ghana',       'TEMA',        1500, 1900))
lines.append(wfw('Nigeria',     'APAPA',       1900, 2100))
lines.append(wfw('Nigeria',     'LEKKI',       2400, 2800))
lines.append(wfw('Nigeria',     'ONNE',        3800, 5000))
lines.append(wfw('Nigeria',     'TIN CAN',     1900, 2100))
lines.append(wfw('Senegal',     'DAKAR',       2100, 3000))
lines.append(wfw('Togo',        'LOME',        3200, 4200))
lines.append("")

full_text = '\n'.join(lines)
total = full_text.count('\nINSERT ') + (1 if full_text.startswith('INSERT ') else 0)
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
