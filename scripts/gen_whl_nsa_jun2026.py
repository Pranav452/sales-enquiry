import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'WHL'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://www.wanhai.com'
VF      = '2026-06-01'
VT      = '2026-06-15'

# Rates inclusive of WBS, PRS
# EBS: Far East USD 25/20' USD 50/40' collect | WCSA USD 30/20' USD 60/40' collect
S_FE   = 'WBS:incl;PRS:incl;EBS:25/20-50/40'
S_WCSA = 'WBS:incl;PRS:incl;EBS:30/20-60/40'

CL_FE = (
    "Wan Hai Lines | Nhava Sheva origin | Far East / SE Asia rates"
    "|Validity: 01-15 Jun 2026"
    "|Rates inclusive of: WBS, PRS | EBS USD 25/20' USD 50/40' collect"
    "|Subject to local charges both ends | Space and equipment subject to availability"
    "|Not applicable for Black Commodities (Cinnamon, Charcoal, Carbon, Masterbatch, Scrap, Used Goods)"
    "|5% GST on OFT and WBS"
)
CL_WCSA = (
    "Wan Hai Lines | Nhava Sheva origin | West Coast South America rates"
    "|Validity: 01-15 Jun 2026"
    "|Rates inclusive of: WBS, PRS | EBS USD 30/20' USD 60/40' collect"
    "|Subject to local charges both ends | Space and equipment subject to availability"
    "|MX & GT ICD rates valid up to 28.99 MT cargo+tare; over 29 MT not acceptable"
)
CL_IPI = (
    "Wan Hai Lines | Nhava Sheva origin | WCSA Inland Point Intermodal (IPI) rates"
    "|Validity: 01-15 Jun 2026"
    "|Total door rate inclusive of ocean + inland transport | WBS, PRS incl | EBS USD 30/20' USD 60/40'"
    "|Valid up to 28.99 MT cargo+tare (cargo + tare); over 29 MT not acceptable"
)

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, via, surch, clauses, notes=''):
    v = f"'{esc(via)}'" if via else 'NULL'
    n = f"'{esc(notes)}'" if notes else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{esc(dc)}','{esc(dp)}',"
        f"'USD',{r20},{r40},'{VF}','{VT}',{v},'{esc(surch)}',{n},'{esc(clauses)}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

def fe(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, via, S_FE, CL_FE, notes)

def wcsa(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, via, S_WCSA, CL_WCSA, notes)

def ipi(dc, dp, r20, r40, via, notes=''):
    return row(dc, dp, r20, r40, via, S_WCSA, CL_IPI, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- Wan Hai Lines (WHL) — NHAVA SHEVA Rates 01-15 Jun 2026")
lines.append("-- Far East / SE Asia / Japan / Korea / WCSA")
lines.append("-- General rates only (DG rates skipped — subject to DG desk approval)")
lines.append("-- WBS + PRS incl | EBS Far East USD 25/50 collect | WCSA USD 30/60 collect")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# CHINA
# ============================================================
lines.append("-- ======== CHINA (01-15 Jun 2026) ========")
lines.append("")

lines.append("-- South China / Guangdong (via Shekou)")
lines.append(fe('China', 'BEIJIAO',                        150,  350, 'SHEKOU'))
lines.append(fe('China', 'GAO MING',                       150,  300, 'SHEKOU'))
lines.append(fe('China', 'GAOSHA',                         150,  150, 'SHEKOU',   notes='40GP USD 250'))
lines.append(fe('China', 'GAOLAN',                         175,  250, 'SHEKOU'))
lines.append(fe('China', 'DONGGUAN CONTAINER TERMINAL',    175,  300, 'SHEKOU'))
lines.append(fe('China', 'FOSHAN JIUJIANG',                150,  250, 'SHEKOU'))
lines.append(fe('China', 'HONGWAN',                        125,  250, 'SHEKOU'))
lines.append(fe('China', 'HUANGPU',                        125,  250, 'SHEKOU'))
lines.append(fe('China', 'HUADU',                          175,  250, 'SHEKOU',   notes='40GP USD 350'))
lines.append(fe('China', 'JIAOXIN',                        125,  300, 'SHEKOU'))
lines.append(fe('China', 'JIANGMEN NEW PORT',              225,  450, 'SHEKOU',   notes='40GP USD 650'))
lines.append(fe('China', 'LIAN HUA SHAN',                  125,  300, 'SHEKOU',   notes='40GP USD 350'))
lines.append(fe('China', 'PSA DONGGUAN',                   175,  350, 'SHEKOU'))
lines.append(fe('China', 'QINGYUAN',                       225,  450, 'SHEKOU'))
lines.append(fe('China', 'SANSHAN',                        125,  250, 'SHEKOU'))
lines.append(fe('China', 'SANSHUI NEW PORT',               125,  250, 'SHEKOU'))
lines.append(fe('China', 'SHATIAN',                        175,  350, 'SHEKOU'))
lines.append(fe('China', 'SHUNDE NEW PORT',                125,  225, 'SHEKOU'))
lines.append(fe('China', 'SI HUI (MA FANG)',               175,  250, 'SHEKOU'))
lines.append(fe('China', 'XINHUI',                         125,  250, 'SHEKOU'))
lines.append(fe('China', 'XIAOLAN',                        125,  250, 'SHEKOU'))
lines.append(fe('China', 'YANGPU PT',                      375,  650, 'SHEKOU'))
lines.append(fe('China', 'ZHAOQING',                       175,  250, 'SHEKOU'))
lines.append(fe('China', 'ZHAOQING NEW PORT',              125,  250, 'SHEKOU'))
lines.append(fe('China', 'ZHONGSHAN',                      125,  175, 'SHEKOU'))
lines.append("")

lines.append("-- South China (via Hong Kong)")
lines.append(fe('China', 'BEICUN',                         175,  350, 'HONG KONG', notes='40GP USD 550'))
lines.append(fe('China', 'CHIWAN (SHEKOU)',                 125,  250, 'HONG KONG'))
lines.append(fe('China', 'DALIAN',                         175,  225, 'HONG KONG'))
lines.append(fe('China', 'DOU MEN (ZHUHAI)',               125,  250, 'HONG KONG'))
lines.append(fe('China', 'GAO YAO',                        175,  350, 'HONG KONG'))
lines.append(fe('China', 'NANCHANG',                       275,  450, 'HONG KONG'))
lines.append(fe('China', 'SHUNDE LELIU WHARF',             125,  250, 'HONG KONG'))
lines.append(fe('China', 'WU ZHOU',                        225,  450, 'HONG KONG'))
lines.append(fe('China', 'YANTIAN',                        275,  350, 'HONG KONG'))
lines.append(fe('China', 'JINZHOU',                        325,  650, 'HONG KONG', notes='via Hong Kong then Dalian feeder'))
lines.append("")

lines.append("-- South China / Fujian (via Kaohsiung)")
lines.append(fe('China', 'MAWEI (FUZHOU)',                  100,  150, 'KAOHSIUNG', notes='40GP USD 250'))
lines.append(fe('China', 'JIANGYIN (FUJIAN)',               125,  250, 'KAOHSIUNG'))
lines.append(fe('China', 'LIANYUNGANG',                    185,  210, 'KAOHSIUNG'))
lines.append(fe('China', 'TIANJIN (XINGANG)',               125,  175, 'KAOHSIUNG'))
lines.append(fe('China', 'XIAMEN',                         125,  200, 'KAOHSIUNG'))
lines.append("")

lines.append("-- Central/East China (via Shanghai)")
lines.append(fe('China', 'CHANGSHA',                       325,  750, 'SHANGHAI',  notes='40GP USD 850'))
lines.append(fe('China', 'CHANGZHOU',                      325,  650, 'SHANGHAI'))
lines.append(fe('China', 'CHONGQING',                      375,  850, 'SHANGHAI',  notes='40GP USD 950'))
lines.append(fe('China', 'HEFEI',                          225,  350, 'SHANGHAI'))
lines.append(fe('China', 'JING ZHOU',                      375,  750, 'SHANGHAI'))
lines.append(fe('China', 'JIUJIANG',                       325,  650, 'SHANGHAI'))
lines.append(fe('China', 'LUZHOU',                         525,  850, 'SHANGHAI'))
lines.append(fe('China', 'NANJING',                        150,  200, 'SHANGHAI',  notes='40GP USD 250'))
lines.append(fe('China', 'NANTONG',                        225,  450, 'SHANGHAI'))
lines.append(fe('China', 'TAICANG',                        225,  400, 'SHANGHAI'))
lines.append(fe('China', 'WUHU',                           225,  450, 'SHANGHAI'))
lines.append(fe('China', 'WUHAN',                          225,  450, 'SHANGHAI'))
lines.append(fe('China', 'WUXI',                           225,  450, 'SHANGHAI'))
lines.append(fe('China', 'YANG ZHOU',                      175,  250, 'SHANGHAI',  notes='40GP USD 350'))
lines.append(fe('China', 'YICHANG',                        375,  750, 'SHANGHAI',  notes='40GP USD 850'))
lines.append(fe('China', 'YUEYANG',                        275,  500, 'SHANGHAI'))
lines.append(fe('China', 'ZHANGJIAGANG',                   175,  250, 'SHANGHAI',  notes='40GP USD 350'))
lines.append("")

lines.append("-- Central/East China (via Ningbo)")
lines.append(fe('China', 'WENZHOU',                        225,  450, 'NINGBO'))
lines.append(fe('China', 'ZHAPU',                          125,  200, 'NINGBO'))
lines.append("")

lines.append("-- China direct / multiple service")
lines.append(fe('China', 'NINGBO',                           5,   10))
lines.append(fe('China', 'SHANGHAI',                         5,   10))
lines.append(fe('China', 'SHEKOU (SHENZHEN)',                 5,   10))
lines.append(fe('China', 'QINGDAO',                         15,   30))
lines.append(fe('China', 'YANTIAN (SHENZHEN)',              275,  350))
lines.append(fe('China', 'NANSHA NEW PORT',                 175,  300, notes='DG: 275/500/500'))
lines.append(fe('China', 'QINZHOU',                        325,  550, 'PORT KLANG'))
lines.append(fe('China', 'ZHANJIANG',                      225,  400, 'PORT KLANG'))
lines.append(fe('China', 'HAIKOU',                         275,  450, 'SHEKOU'))
lines.append("")

# ============================================================
# HONG KONG
# ============================================================
lines.append("-- ======== HONG KONG ========")
lines.append("")
lines.append(fe('Hong Kong', 'HONG KONG', 5, 10))
lines.append("")

# ============================================================
# INDONESIA
# ============================================================
lines.append("-- ======== INDONESIA ========")
lines.append("")
lines.append(fe('Indonesia', 'JAKARTA',       60,  100))
lines.append(fe('Indonesia', 'SURABAYA',      50,  100))
lines.append(fe('Indonesia', 'SEMARANG',     125,  250, 'SHEKOU'))
lines.append(fe('Indonesia', 'PANJANG',      275,  550, 'JAKARTA'))
lines.append(fe('Indonesia', 'PALEMBANG',    325,  650, 'SINGAPORE'))
lines.append(fe('Indonesia', 'BATAM',        525, 1050, 'SINGAPORE'))
lines.append(fe('Indonesia', 'PONTIANAK',    525, 1050, 'SINGAPORE'))
lines.append(fe('Indonesia', 'BALIKPAPAN',   975, 1650, 'JAKARTA'))
lines.append(fe('Indonesia', 'TARAKAN',      725, 1450, 'SURABAYA'))
lines.append("")

# ============================================================
# JAPAN
# ============================================================
lines.append("-- ======== JAPAN ========")
lines.append("")
lines.append(fe('Japan', 'KOBE',          50,  100, 'PORT KLANG'))
lines.append(fe('Japan', 'OSAKA',         50,  100, 'PORT KLANG'))
lines.append(fe('Japan', 'NAGOYA',        50,  100, 'KAOHSIUNG'))
lines.append(fe('Japan', 'TOKYO',         50,  100, 'PORT KLANG'))
lines.append(fe('Japan', 'YOKOHAMA',      50,  100, 'PORT KLANG'))
lines.append(fe('Japan', 'YOKKAICHI',     50,  100, 'PORT KLANG'))
lines.append(fe('Japan', 'SHIMIZU',       50,  100, 'PORT KLANG'))
lines.append(fe('Japan', 'KAWASAKI',     125,  200, 'PORT KLANG'))
lines.append(fe('Japan', 'HAKATA',        50,  100, 'KAOHSIUNG'))
lines.append(fe('Japan', 'MOJI',          50,  100, 'KAOHSIUNG'))
lines.append(fe('Japan', 'TOKUYAMA',      50,  100, 'KAOHSIUNG'))
lines.append(fe('Japan', 'HIROSHIMA',     50,  100, 'SHEKOU'))
lines.append(fe('Japan', 'FUKUYAMA',      50,  100, 'SHEKOU'))
lines.append(fe('Japan', 'MIZUSHIMA',     75,  150, 'SHEKOU'))
lines.append(fe('Japan', 'MATSUYAMA',    675, 1050, 'KAOHSIUNG'))
lines.append(fe('Japan', 'NAHA (OKINAWA)',575, 1050, 'KAOHSIUNG'))
lines.append(fe('Japan', 'SENDAI',       725, 1050, 'PORT KLANG'))
lines.append("")

# ============================================================
# CAMBODIA
# ============================================================
lines.append("-- ======== CAMBODIA ========")
lines.append("")
lines.append(fe('Cambodia', 'PHNOM PENH',      175, 300, 'PORT KLANG', notes='Feeder via Cat Lai'))
lines.append(fe('Cambodia', 'SIHANOUKVILLE',   175, 300, 'SHEKOU',     notes='40GP USD 400'))
lines.append("")

# ============================================================
# KOREA
# ============================================================
lines.append("-- ======== SOUTH KOREA ========")
lines.append("")
lines.append(fe('South Korea', 'PUSAN',      15,  30, 'KAOHSIUNG'))
lines.append(fe('South Korea', 'ULSAN',      30,  60, 'KAOHSIUNG'))
lines.append(fe('South Korea', 'KWANGYANG', 125, 200, 'KAOHSIUNG'))
lines.append(fe('South Korea', 'INCHON',    150, 250, 'KAOHSIUNG'))
lines.append("")

# ============================================================
# MALAYSIA
# ============================================================
lines.append("-- ======== MALAYSIA ========")
lines.append("")
lines.append(fe('Malaysia', 'PORT KLANG',        5,   10))
lines.append(fe('Malaysia', 'PENANG',           10,   20, 'PORT KLANG'))
lines.append(fe('Malaysia', 'PASIR GUDANG',     15,   30, 'PORT KLANG'))
lines.append(fe('Malaysia', 'BINTULU',        1025, 1550, 'PORT KLANG'))
lines.append(fe('Malaysia', 'KUCHING',        1025, 1550, 'PORT KLANG'))
lines.append(fe('Malaysia', 'MIRI',           1025, 1550, 'PORT KLANG'))
lines.append(fe('Malaysia', 'SIBU',           1025, 1550, 'PORT KLANG'))
lines.append(fe('Malaysia', 'SANDAKAN',       1025, 1550, 'KAOHSIUNG'))
lines.append(fe('Malaysia', 'TAWAU',          1025, 1550, 'KAOHSIUNG'))
lines.append(fe('Malaysia', 'KOTA KINABALU',  1175, 1700, 'PORT KLANG'))
lines.append("")

# ============================================================
# PHILIPPINES
# ============================================================
lines.append("-- ======== PHILIPPINES ========")
lines.append("")
lines.append(fe('Philippines', 'MANILA NORTH', 50,  100, 'KAOHSIUNG'))
lines.append(fe('Philippines', 'MANILA SOUTH', 50,  100, 'SHEKOU'))
lines.append(fe('Philippines', 'CEBU',          50,  100, 'KAOHSIUNG'))
lines.append(fe('Philippines', 'DAVAO',         50,  100, 'KAOHSIUNG'))
lines.append(fe('Philippines', 'SUBIC BAY',    100,  200, 'KAOHSIUNG'))
lines.append("")

# ============================================================
# SINGAPORE
# ============================================================
lines.append("-- ======== SINGAPORE ========")
lines.append("")
lines.append(fe('Singapore', 'SINGAPORE', 5, 10))
lines.append("")

# ============================================================
# THAILAND
# ============================================================
lines.append("-- ======== THAILAND ========")
lines.append("")
lines.append(fe('Thailand', 'LAEM CHABANG',  25,  50))
lines.append(fe('Thailand', 'BANGKOK (PAT)', 25,  50, 'KAOHSIUNG'))
lines.append(fe('Thailand', 'LAT KRABANG',  150, 250, 'LAEM CHABANG'))
lines.append("")

# ============================================================
# TAIWAN
# ============================================================
lines.append("-- ======== TAIWAN ========")
lines.append("")
lines.append(fe('Taiwan', 'KAOHSIUNG',  50,  75))
lines.append(fe('Taiwan', 'TAICHUNG',   75, 100, 'PORT KLANG'))
lines.append(fe('Taiwan', 'TAIPEI',     50, 100, 'PORT KLANG'))
lines.append(fe('Taiwan', 'KEELUNG',   200, 250, 'PORT KLANG', notes='Feeder via Taipei'))
lines.append(fe('Taiwan', 'TAOYUAN',   125, 250, 'PORT KLANG', notes='Feeder via Taipei'))
lines.append("")

# ============================================================
# VIETNAM
# ============================================================
lines.append("-- ======== VIETNAM ========")
lines.append("")
lines.append(fe('Vietnam', 'CAT LAI (HCMC)',       50,  75))
lines.append(fe('Vietnam', 'HOCHIMINH (VICT)',     125, 200, 'PORT KLANG', notes='Feeder via Cat Lai'))
lines.append(fe('Vietnam', 'TAN CAN (HCMC)',       150, 250, 'PORT KLANG', notes='Feeder via Cat Lai'))
lines.append(fe('Vietnam', 'CAI MEP',              175, 350))
lines.append(fe('Vietnam', 'ICD PHUOC LONG 1',     175, 350, 'PORT KLANG', notes='Feeder via Cat Lai'))
lines.append(fe('Vietnam', 'ICD PHUOC LONG 3',     175, 350, 'PORT KLANG', notes='Feeder via Cat Lai'))
lines.append(fe('Vietnam', 'HAIPHONG',              50,  75, 'PORT KLANG'))
lines.append(fe('Vietnam', 'DANANG',               225, 450, 'SHEKOU'))
lines.append(fe('Vietnam', 'QUY NHON',             530, 850, 'SINGAPORE', notes='40GP USD 1000'))
lines.append("")

# ============================================================
# WCSA — WEST COAST SOUTH AMERICA (01-15 Jun 2026)
# ============================================================
lines.append("-- ======== WCSA — WEST COAST SOUTH AMERICA (01-15 Jun 2026) ========")
lines.append("-- EBS USD 30/20' USD 60/40' collect | MX/GT: valid up to 28.99 MT cargo+tare")
lines.append("")
lines.append(wcsa('Mexico',   'MANZANILLO',       2600, 2900, 'KAOHSIUNG'))
lines.append(wcsa('Mexico',   'LAZARO CARDENAS',  2600, 2900, 'KAOHSIUNG'))
lines.append(wcsa('Mexico',   'ENSENADA',         2700, 3100, 'QINGDAO'))
lines.append(wcsa('Colombia', 'BUENAVENTURA',     2600, 2900, 'KAOHSIUNG'))
lines.append(wcsa('Ecuador',  'GUAYAQUIL',        2600, 2900, 'KAOHSIUNG'))
lines.append(wcsa('Peru',     'CALLAO',           2600, 2900, 'KAOHSIUNG'))
lines.append(wcsa('Guatemala','PUERTO QUETZAL',   4100, 4400, 'KAOHSIUNG'))
lines.append(wcsa('Chile',    'SAN ANTONIO',      2600, 2900, 'KAOHSIUNG'))
lines.append("")

# ============================================================
# IPI — INLAND POINT INTERMODAL (Mexico / Guatemala)
# Total door rates (ocean + inland); valid 01-15 Jun 2026
# ============================================================
lines.append("-- ======== IPI — INLAND MEXICO / GUATEMALA (01-15 Jun 2026) ========")
lines.append("-- Total door rates inclusive of ocean + inland transport")
lines.append("-- Valid up to 28.99 MT cargo+tare; over 29 MT not acceptable")
lines.append("")

lines.append("-- Mexico City via Manzanillo")
lines.append(ipi('Mexico', 'MEXICO CITY', 6680, 6500, 'MANZANILLO', notes='IPI Truck via Manzanillo; 40GP USD 7300'))
lines.append(ipi('Mexico', 'MEXICO CITY', 4355, 4590, 'MANZANILLO', notes='IPI Rail via Manzanillo; 40GP USD 5240'))
lines.append(ipi('Mexico', 'MEXICO CITY', 5135, 5370, 'MANZANILLO', notes='IPI Rail+Truck via Manzanillo; 40GP USD 6020'))
lines.append("")

lines.append("-- Mexico City via Lazaro Cardenas")
lines.append(ipi('Mexico', 'MEXICO CITY', 7560, 7700, 'LAZARO CARDENAS', notes='IPI Truck via Lazaro Cardenas; 40GP USD 8500'))
lines.append(ipi('Mexico', 'MEXICO CITY', 4485, 5045, 'LAZARO CARDENAS', notes='IPI Rail via Lazaro Cardenas; 40GP USD 5695'))
lines.append(ipi('Mexico', 'MEXICO CITY', 5135, 5695, 'LAZARO CARDENAS', notes='IPI Rail+Truck via Lazaro Cardenas; 40GP USD 6345'))
lines.append("")

lines.append("-- Monterrey via Manzanillo")
lines.append(ipi('Mexico', 'MONTERREY', 7880, 8020, 'MANZANILLO', notes='IPI Truck via Manzanillo; 40GP USD 8820'))
lines.append(ipi('Mexico', 'MONTERREY', 4940, 5500, 'MANZANILLO', notes='IPI Rail via Manzanillo; 40GP USD 6150'))
lines.append(ipi('Mexico', 'MONTERREY', 5655, 6215, 'MANZANILLO', notes='IPI Rail+Truck via Manzanillo; 40GP USD 6865'))
lines.append("")

lines.append("-- Monterrey via Lazaro Cardenas")
lines.append(ipi('Mexico', 'MONTERREY', 9480, 9780, 'LAZARO CARDENAS', notes='IPI Truck via Lazaro Cardenas; 40GP USD 10580'))
lines.append(ipi('Mexico', 'MONTERREY', 4810, 5630, 'LAZARO CARDENAS', notes='IPI Rail via Lazaro Cardenas; 40GP USD 6280'))
lines.append(ipi('Mexico', 'MONTERREY', 5460, 6280, 'LAZARO CARDENAS', notes='IPI Rail+Truck via Lazaro Cardenas; 40GP USD 6930'))
lines.append("")

lines.append("-- Guatemala City via Puerto Quetzal")
lines.append(ipi('Guatemala', 'GUATEMALA CITY', 5280, 5630, 'PUERTO QUETZAL', notes='IPI Truck via Puerto Quetzal'))
lines.append("")

full_text = '\n'.join(lines)
total = full_text.count('\nINSERT ') + (1 if full_text.startswith('INSERT ') else 0)
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
