import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'WHL'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://www.wanhai.com'

VF_FE = '2026-06-15'; VT_FE = '2026-06-30'   # Far East
VF_WC = '2026-06-16'; VT_WC = '2026-06-30'   # WCSA + IPI

S_FE   = 'WBS:incl;PRS:incl;EBS:25/20-50/40'
S_WCSA = 'WBS:incl;PRS:incl;EBS:30/20-60/40'

CL_FE = (
    "Wan Hai Lines | Nhava Sheva origin | Far East rates"
    "|Validity: 15-30 Jun 2026"
    "|WBS and PRS inclusive | EBS USD 25/20 USD 50/40 collect"
    "|5% GST on OFT and WBS | DG excluded (DG desk approval required)"
    "|Black commodities not accepted: Cinnamon/Charcoal/Carbon/Masterbatch/Scrap/Used Goods"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_WCSA = (
    "Wan Hai Lines | Nhava Sheva origin | WCSA rates"
    "|Validity: 16-30 Jun 2026"
    "|WBS and PRS inclusive | EBS USD 30/20 USD 60/40 collect"
    "|5% GST on OFT and WBS | Max weight cargo+tare 28.99 MT"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_IPI = (
    "Wan Hai Lines | Nhava Sheva origin | Mexico/Guatemala IPI inland rates"
    "|Validity: 16-30 Jun 2026"
    "|WBS and PRS inclusive | EBS USD 30/20 USD 60/40 collect"
    "|Max weight cargo+tare 28.99 MT -- over 29 MT not acceptable"
    "|DEST_PORT = inland city | VIA_PORT = loading seaport"
    "|Rates include all-in inland transport to destination"
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

def fe(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_FE, VT_FE, via, S_FE, CL_FE, notes)

def wc(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_WC, VT_WC, via, S_WCSA, CL_WCSA, notes)

def ipi(dc, dp, r20, r40, via, notes=''):
    return row(dc, dp, r20, r40, VF_WC, VT_WC, via, S_WCSA, CL_IPI, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- Wan Hai Lines (WHL) -- NHAVA SHEVA Rates Jun 2026 (Second Half)")
lines.append("-- Far East: 15-30 Jun 2026 | WCSA + IPI: 16-30 Jun 2026")
lines.append("-- WBS + PRS incl | EBS Far East $25/20 $50/40 | WCSA $30/20 $60/40")
lines.append("-- DG excluded -- DG desk approval required")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# CHINA (15-30 Jun 2026)
# ============================================================
lines.append("-- ======== CHINA (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('China', 'BEICUN',                  175, 350, 'HONG KONG',          "40'GP USD 550"))
lines.append(fe('China', 'BEIJAO',                  150, 350, 'SHEKOU'))
lines.append(fe('China', 'CHONGQING',               375, 850, 'SHANGHAI',            "40'GP USD 950"))
lines.append(fe('China', 'CHANGSHA',                325, 750, 'SHANGHAI',            "40'GP USD 850"))
lines.append(fe('China', 'CHIWAN / SHEKOU',          125, 250, 'HONG KONG'))
lines.append(fe('China', 'CHANGZHOU',               325, 650, 'SHANGHAI'))
lines.append(fe('China', 'DALIAN',                  175, 225, 'HONG KONG'))
lines.append(fe('China', 'DOU MEN (ZUHAI)',          125, 250, 'HONG KONG'))
lines.append(fe('China', 'MAWEI (FUZHOU)',           100, 150, 'KAOHSIUNG',           "40'GP USD 250"))
lines.append(fe('China', 'GAOSHA',                  150, 150, 'SHEKOU',              "40'GP USD 250"))
lines.append(fe('China', 'GAOLAN (ZUHAI)',           175, 250, 'SHEKOU'))
lines.append(fe('China', 'GAO MING',                150, 300, 'SHEKOU'))
lines.append(fe('China', 'GAO YAO',                 175, 350, 'HONG KONG'))
lines.append(fe('China', 'HAIKOU',                  275, 450, 'SHEKOU'))
lines.append(fe('China', 'HEFEI',                   225, 350, 'SHANGHAI'))
lines.append(fe('China', 'HONGWAN (ZUHAI)',          125, 250, 'SHEKOU'))
lines.append(fe('China', 'TIANJIN / XINGANG',        125, 175, 'KAOHSIUNG'))
lines.append(fe('China', 'DONGGUAN CONTAINER TML',  175, 300, 'SHEKOU'))
lines.append(fe('China', 'HUANGPU',                 125, 250, 'SHEKOU'))
lines.append(fe('China', 'HUADU',                   175, 250, 'SHEKOU',              "40'GP USD 350"))
lines.append(fe('China', 'JING ZHOU',               375, 750, 'SHANGHAI'))
lines.append(fe('China', 'JIANGYIN (FUJIAN)',        125, 250, 'KAOHSIUNG'))
lines.append(fe('China', 'FOSHAN JIUJIANG',          150, 250, 'SHEKOU'))
lines.append(fe('China', 'JIUJIANG',                325, 650, 'SHANGHAI'))
lines.append(fe('China', 'JIANGMEN NEW PORT',        225, 450, 'SHEKOU',             "40'GP USD 650"))
lines.append(fe('China', 'JINZHOU',                 325, 650, 'HONG KONG / DALIAN',  'T/S via Hong Kong then Dalian feeder'))
lines.append(fe('China', 'JIAOXIN',                 125, 300, 'SHEKOU'))
lines.append(fe('China', 'NANCHANG',                275, 450, 'SHANGHAI'))
lines.append(fe('China', 'LIAN HUA SHAN',            125, 300, 'SHEKOU',             "40'GP USD 350"))
lines.append(fe('China', 'LUZHOU',                  525, 850, 'SHANGHAI'))
lines.append(fe('China', 'LIANYUNGANG',             185, 210, 'KAOHSIUNG'))
lines.append(fe('China', 'SI HUI (MA FANG)',         175, 250, 'SHEKOU'))
lines.append(fe('China', 'NINGBO',                    5,  10))
lines.append(fe('China', 'NANJING',                 150, 200, 'SHANGHAI',            "40'GP USD 250"))
lines.append(fe('China', 'NANSHA NEW PORT',          175, 300))
lines.append(fe('China', 'NANTONG',                 225, 450, 'SHANGHAI'))
lines.append(fe('China', 'SHUNDE LELIU',             125, 250, 'HONG KONG'))
lines.append(fe('China', 'PSA DONGGUAN',             175, 350, 'SHEKOU'))
lines.append(fe('China', 'QINGYUAN',                225, 450, 'SHEKOU'))
lines.append(fe('China', 'QINZHOU',                 325, 550, 'PORT KELANG'))
lines.append(fe('China', 'SHANGHAI',                  5,  10))
lines.append(fe('China', 'SHEKOU (SHENZHEN)',          5,  10))
lines.append(fe('China', 'SANSHAN',                 125, 250, 'SHEKOU'))
lines.append(fe('China', 'SANSHUI NEW PORT',         125, 250, 'SHEKOU'))
lines.append(fe('China', 'SHATIAN',                 175, 350, 'SHEKOU'))
lines.append(fe('China', 'SHUNDE NEW PORT',          125, 225, 'SHEKOU'))
lines.append(fe('China', 'TAICANG',                 225, 400, 'SHANGHAI'))
lines.append(fe('China', 'QINGDAO',                  15,  30))
lines.append(fe('China', 'WUHU',                    225, 450, 'SHANGHAI'))
lines.append(fe('China', 'WUHAN',                   225, 450, 'SHANGHAI'))
lines.append(fe('China', 'WENZHOU',                 225, 450, 'NINGBO'))
lines.append(fe('China', 'WU ZHOU',                 225, 450, 'HONG KONG'))
lines.append(fe('China', 'WUXI',                    225, 450, 'SHANGHAI'))
lines.append(fe('China', 'XINHUI',                  125, 250, 'SHEKOU'))
lines.append(fe('China', 'XIAOLAN',                 125, 250, 'SHEKOU'))
lines.append(fe('China', 'XIAMEN',                  125, 200, 'KAOHSIUNG'))
lines.append(fe('China', 'YICHANG',                 375, 750, 'SHANGHAI',            "40'GP USD 850"))
lines.append(fe('China', 'YANGPU',                  375, 650, 'SHEKOU'))
lines.append(fe('China', 'YANTIAN (SHENZHEN)',       275, 350, 'HONG KONG'))
lines.append(fe('China', 'YUEYANG',                 275, 500, 'SHANGHAI'))
lines.append(fe('China', 'YANG ZHOU',               175, 250, 'SHANGHAI',            "40'GP USD 350"))
lines.append(fe('China', 'ZHAPU',                   125, 200, 'NINGBO'))
lines.append(fe('China', 'ZHANJIANG',               225, 400, 'PORT KELANG'))
lines.append(fe('China', 'ZHAOQING',                175, 250, 'SHEKOU'))
lines.append(fe('China', 'ZHAOQING NEW PORT',        125, 250, 'SHEKOU'))
lines.append(fe('China', 'ZHONGSHAN',               125, 175, 'SHEKOU'))
lines.append(fe('China', 'ZHANGJIAGANG',            175, 250, 'SHANGHAI',            "40'GP USD 350"))
lines.append("")

# ============================================================
# HONG KONG
# ============================================================
lines.append("-- ======== HONG KONG (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('Hong Kong', 'HONG KONG', 5, 10))
lines.append("")

# ============================================================
# INDONESIA
# ============================================================
lines.append("-- ======== INDONESIA (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('Indonesia', 'BALIKPAPAN',   975, 1650, 'JAKARTA'))
lines.append(fe('Indonesia', 'BATAM',        525, 1050, 'SINGAPORE'))
lines.append(fe('Indonesia', 'JAKARTA',       60,  100))
lines.append(fe('Indonesia', 'PANJANG',      275,  550, 'JAKARTA'))
lines.append(fe('Indonesia', 'PALEMBANG',    325,  650, 'SINGAPORE'))
lines.append(fe('Indonesia', 'PONTIANAK',    525, 1050, 'SINGAPORE'))
lines.append(fe('Indonesia', 'SEMARANG',     125,  250, 'SHEKOU'))
lines.append(fe('Indonesia', 'SURABAYA',      50,  100))
lines.append(fe('Indonesia', 'TARAKAN',      725, 1450, 'SURABAYA'))
lines.append("")

# ============================================================
# JAPAN
# ============================================================
lines.append("-- ======== JAPAN (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('Japan', 'FUKUYAMA',          50,  100, 'SHEKOU'))
lines.append(fe('Japan', 'HIROSHIMA',          50,  100, 'SHEKOU'))
lines.append(fe('Japan', 'HAKATA',             50,  100, 'KAOHSIUNG'))
lines.append(fe('Japan', 'KAWASAKI',          125,  200, 'PORT KELANG'))
lines.append(fe('Japan', 'MIZUSHIMA',          75,  150, 'SHEKOU'))
lines.append(fe('Japan', 'MOJI',               50,  100, 'KAOHSIUNG'))
lines.append(fe('Japan', 'MATSUYAMA',         675, 1050, 'KAOHSIUNG'))
lines.append(fe('Japan', 'NAHA (OKINAWA)',    575, 1050, 'KAOHSIUNG'))
lines.append(fe('Japan', 'NAGOYA',             50,  100, 'KAOHSIUNG'))
lines.append(fe('Japan', 'OSAKA',              50,  100, 'PORT KELANG'))
lines.append(fe('Japan', 'SENDAI',            725, 1050, 'PORT KELANG'))
lines.append(fe('Japan', 'SHIMIZU',            50,  100, 'PORT KELANG'))
lines.append(fe('Japan', 'TOKUYAMA',           50,  100, 'KAOHSIUNG'))
lines.append(fe('Japan', 'TOKYO',              50,  100, 'PORT KELANG'))
lines.append(fe('Japan', 'KOBE',               50,  100, 'PORT KELANG'))
lines.append(fe('Japan', 'YOKKAICHI',          50,  100, 'PORT KELANG'))
lines.append(fe('Japan', 'YOKOHAMA',           50,  100, 'PORT KELANG'))
lines.append("")

# ============================================================
# CAMBODIA
# ============================================================
lines.append("-- ======== CAMBODIA (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('Cambodia', 'PHNOM PENH',    175, 300, 'PORT KELANG', 'Inland river connection via Phnom Penh terminal'))
lines.append(fe('Cambodia', 'SIHANOUKVILLE', 175, 300, 'SHEKOU',      "40'GP USD 400"))
lines.append("")

# ============================================================
# KOREA
# ============================================================
lines.append("-- ======== KOREA (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('South Korea', 'INCHON',    150, 250, 'KAOHSIUNG / PORT KELANG'))
lines.append(fe('South Korea', 'KWANGYANG', 125, 200, 'KAOHSIUNG / PORT KELANG'))
lines.append(fe('South Korea', 'PUSAN',      15,  30, 'KAOHSIUNG / PORT KELANG'))
lines.append(fe('South Korea', 'ULSAN',      30,  60, 'KAOHSIUNG / PORT KELANG'))
lines.append("")

# ============================================================
# MALAYSIA
# ============================================================
lines.append("-- ======== MALAYSIA (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('Malaysia', 'KOTA KINABALU', 1175, 1700, 'PORT KELANG'))
lines.append(fe('Malaysia', 'BINTULU',       1025, 1550, 'PORT KELANG'))
lines.append(fe('Malaysia', 'KUCHING',       1025, 1550, 'PORT KELANG'))
lines.append(fe('Malaysia', 'MIRI',          1025, 1550, 'PORT KELANG'))
lines.append(fe('Malaysia', 'PENANG',           10,   20, 'PORT KELANG'))
lines.append(fe('Malaysia', 'PASIR GUDANG',     15,   30, 'PORT KELANG'))
lines.append(fe('Malaysia', 'PORT KELANG',       5,   10))
lines.append(fe('Malaysia', 'SIBU',          1025, 1550, 'PORT KELANG'))
lines.append(fe('Malaysia', 'SANDAKAN',      1025, 1550, 'KAOHSIUNG'))
lines.append(fe('Malaysia', 'TAWAO',         1025, 1550, 'KAOHSIUNG'))
lines.append("")

# ============================================================
# PHILIPPINES
# ============================================================
lines.append("-- ======== PHILIPPINES (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('Philippines', 'CEBU',         50, 100, 'KAOHSIUNG'))
lines.append(fe('Philippines', 'DAVAO',         50, 100, 'KAOHSIUNG'))
lines.append(fe('Philippines', 'MANILA NORTH',  50, 100, 'KAOHSIUNG'))
lines.append(fe('Philippines', 'MANILA SOUTH',  50, 100, 'SHEKOU'))
lines.append(fe('Philippines', 'SUBIC BAY',    100, 200, 'KAOHSIUNG'))
lines.append("")

# ============================================================
# SINGAPORE
# ============================================================
lines.append("-- ======== SINGAPORE (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('Singapore', 'SINGAPORE', 5, 10))
lines.append("")

# ============================================================
# THAILAND
# ============================================================
lines.append("-- ======== THAILAND (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('Thailand', 'BANGKOK (PAT)',  25,  50, 'KAOHSIUNG'))
lines.append(fe('Thailand', 'LAEM CHABANG',   25,  50))
lines.append(fe('Thailand', 'LAT KRABANG',   150, 250, 'LAEM CHABANG'))
lines.append("")

# ============================================================
# TAIWAN
# ============================================================
lines.append("-- ======== TAIWAN (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('Taiwan', 'KEELUNG',   200, 250, 'PORT KELANG', 'Feeder connection via Taipei'))
lines.append(fe('Taiwan', 'KAOHSIUNG',  50,  75))
lines.append(fe('Taiwan', 'TAOYUAN',   125, 250, 'PORT KELANG', 'Feeder connection via Taipei'))
lines.append(fe('Taiwan', 'TAIPEI',     50, 100, 'PORT KELANG'))
lines.append(fe('Taiwan', 'TAICHUNG',   75, 100, 'PORT KELANG'))
lines.append("")

# ============================================================
# VIETNAM
# ============================================================
lines.append("-- ======== VIETNAM (15-30 Jun 2026) ========")
lines.append("")
lines.append(fe('Vietnam', 'CAT LAI (HCMC)',       50,  75, 'PORT KELANG'))
lines.append(fe('Vietnam', 'DANANG',              225, 450, 'SHEKOU'))
lines.append(fe('Vietnam', 'HAIPHONG',             50,  75, 'PORT KELANG'))
lines.append(fe('Vietnam', 'TAN CAN (HCMC)',      150, 250, 'PORT KELANG', 'Inland connection to Tan Can terminal'))
lines.append(fe('Vietnam', 'ICD PHUOC LONG 3',   175, 350, 'PORT KELANG', 'Inland connection to ICD Phuoc Long 3'))
lines.append(fe('Vietnam', 'ICD PHUOC LONG 1',   175, 350, 'PORT KELANG', 'Inland connection to ICD Phuoc Long 1'))
lines.append(fe('Vietnam', 'CAI MEP',             175, 350))
lines.append(fe('Vietnam', 'QUY NHON',            530, 850, 'SINGAPORE',  "40'GP USD 1000"))
lines.append(fe('Vietnam', 'HOCHIMINH (VICT)',    125, 200, 'PORT KELANG', 'Inland connection to VICT terminal'))
lines.append("")

# ============================================================
# WCSA (16-30 Jun 2026)
# ============================================================
lines.append("-- ======== WCSA (16-30 Jun 2026) ========")
lines.append("-- EBS USD 30/20 USD 60/40 collect | Max weight cargo+tare 28.99 MT")
lines.append("")
lines.append(wc('Mexico',   'MANZANILLO',      3300, 3700, 'KAOHSIUNG / SHEKOU / QINGDAO'))
lines.append(wc('Mexico',   'LAZARO CARDENAS', 3300, 3700, 'KAOHSIUNG / SHEKOU / QINGDAO'))
lines.append(wc('Mexico',   'ENSENADA',        3500, 3900, 'QINGDAO'))
lines.append(wc('Colombia', 'BUENAVENTURA',    3300, 3700, 'KAOHSIUNG / QINGDAO'))
lines.append(wc('Ecuador',  'GUAYAQUIL',       3300, 3700, 'KAOHSIUNG / SHEKOU / SHANGHAI'))
lines.append(wc('Peru',     'CALLAO',          3300, 3700, 'KAOHSIUNG / SHEKOU / QINGDAO'))
lines.append(wc('Guatemala','PUERTO QUETZAL',  4800, 5200, 'KAOHSIUNG / QINGDAO'))
lines.append(wc('Chile',    'SAN ANTONIO',     3300, 3700, 'HONG KONG / QINGDAO'))
lines.append("")

# ============================================================
# IPI INLAND RATES (16-30 Jun 2026)
# ============================================================
lines.append("-- ======== MEXICO / GUATEMALA IPI INLAND (16-30 Jun 2026) ========")
lines.append("-- DEST_PORT = inland city | VIA_PORT = loading seaport | RATE_40 = 40'HC (HQ)")
lines.append("")

lines.append("-- Mexico City via Manzanillo")
lines.append(ipi('Mexico', 'MEXICO CITY', 7380, 7300, 'MANZANILLO',       "Inland TRUCK; 40'GP USD 8100"))
lines.append(ipi('Mexico', 'MEXICO CITY', 5055, 5390, 'MANZANILLO',       "Inland RAIL via Pantaco; 40'GP USD 6040"))
lines.append(ipi('Mexico', 'MEXICO CITY', 5835, 6170, 'MANZANILLO',       "Inland RAIL+TRUCK; 40'GP USD 6820"))
lines.append("")
lines.append("-- Mexico City via Lazaro Cardenas")
lines.append(ipi('Mexico', 'MEXICO CITY', 8260,  8500, 'LAZARO CARDENAS', "Inland TRUCK; 40'GP USD 9300"))
lines.append(ipi('Mexico', 'MEXICO CITY', 5185,  5845, 'LAZARO CARDENAS', "Inland RAIL via Pantaco; 40'GP USD 6495"))
lines.append(ipi('Mexico', 'MEXICO CITY', 5835,  6495, 'LAZARO CARDENAS', "Inland RAIL+TRUCK; 40'GP USD 7145"))
lines.append("")
lines.append("-- Monterrey via Manzanillo")
lines.append(ipi('Mexico', 'MONTERREY',   8580,  8820, 'MANZANILLO',       "Inland TRUCK; 40'GP USD 9620"))
lines.append(ipi('Mexico', 'MONTERREY',   5640,  6300, 'MANZANILLO',       "Inland RAIL; 40'GP USD 6950"))
lines.append(ipi('Mexico', 'MONTERREY',   6355,  7015, 'MANZANILLO',       "Inland RAIL+TRUCK; 40'GP USD 7665"))
lines.append("")
lines.append("-- Monterrey via Lazaro Cardenas")
lines.append(ipi('Mexico', 'MONTERREY',  10180, 10580, 'LAZARO CARDENAS',  "Inland TRUCK; 40'GP USD 11380"))
lines.append(ipi('Mexico', 'MONTERREY',   5510,  6430, 'LAZARO CARDENAS',  "Inland RAIL; 40'GP USD 7080"))
lines.append(ipi('Mexico', 'MONTERREY',   6160,  7080, 'LAZARO CARDENAS',  "Inland RAIL+TRUCK; 40'GP USD 7730"))
lines.append("")
lines.append("-- Guatemala City via Puerto Quetzal")
lines.append(ipi('Guatemala', 'GUATEMALA CITY', 5980, 6430, 'PUERTO QUETZAL', 'Inland TRUCK'))
lines.append("")

full_text = '\n'.join(lines)
total = full_text.count('\nINSERT ') + (1 if full_text.startswith('INSERT ') else 0)
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
