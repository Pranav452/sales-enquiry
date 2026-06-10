import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'MSC'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://www.msc.com'

# Start dates
VF_01 = '2026-06-01'  # Red Sea, West Africa, Middle East
VF_02 = '2026-06-02'  # SAEC, SAWC
VF_03 = '2026-06-03'  # EA, SA, IO, AUS/NZ, North Africa, USA
VF_04 = '2026-06-04'  # Central America, Caribbean, Canada, Mexico
VF_05 = '2026-06-05'  # Red Sea (most ports)

# End dates
VT_14 = '2026-06-14'  # West Africa, EA, SA, IO, AUS/NZ, CA, CAR, Canada, MX, USWC, Mogadishu, Salalah
VT_15 = '2026-06-15'  # Middle East (non-ISC)
VT_28 = '2026-06-28'  # USEC
VT_30 = '2026-06-30'  # SAEC, SAWC, North Africa, Colombo/Chattogram/Male

# ================================================================
# Surcharge strings per trade
# ================================================================
S_RS        = 'EFS:82/teu'                           # Red Sea (ETS/FUEL/OCC port-specific in NOTES)
S_RS_MOG    = 'EFS:155/teu;EOS:incl'                 # Mogadishu (different EFS + EOS incl)
S_WA        = 'EFS:230/teu'
S_SAEC      = 'EFS:242/teu;ETS:68/teu;FUE:15/teu'
S_SAWC      = 'EFS:238/teu;ETS:100/teu;FUE:22/teu'
S_CA_H      = 'EFS:238/teu;PCS:40/teu'              # Corinto/Acajutla/PCaldera/PQuetzal/Rodman
S_CA_L      = 'EFS:211/teu'                          # PCortes/Moin/PBarrios/Cristobal
S_CAR       = 'EFS:211/teu'
S_CAN       = 'EFS:211/teu'
S_VAN       = 'EFS:418/teu;FUE:18/teu'
S_MEX_L     = 'EFS:211/teu'                          # Veracruz, Altamira
S_MEX_H     = 'EFS:238/teu;PCS:40/teu'              # Manzanillo, Lazaro Cardenas
S_NAF       = 'EFS:167/teu;ETS:74/teu;FUE:16/teu'
S_EA        = 'EFS:155/teu;EOS:incl'
S_SA        = 'EFS:125/teu'
S_IO        = 'EFS:125/teu;EOS:incl'
S_AUS       = 'EFS:100/teu'
S_USWC      = 'EFS:418/teu;CUC:110/box'
S_USEC      = 'EFS:211/teu;CUC:110/box'
S_ME        = 'EFS:38/teu'

# ================================================================
# Clauses
# ================================================================
CL_RS = (
    "MSC | Nhava Sheva origin | Red Sea / East Africa rates"
    "|Validity: 05-30 Jun 2026 (Mogadishu 01-14 Jun; Salalah 01-14 Jun)"
    "|EFS and ETS/FUEL where applicable — see port notes | Local charges both ends"
    "|Space and equipment subject to availability | Rates subject to commodity acceptance"
)
CL_WA = (
    "MSC | Nhava Sheva origin | West Africa rates"
    "|Validity: 01-14 Jun 2026"
    "|EFS USD 230/TEU collect | Port-specific surcharges noted per port"
    "|Flexi Bag surcharge FTS USD 14/container (USD 50 additional for Annex B commodities)"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_SAEC = (
    "MSC | Nhava Sheva origin | South America East Coast / SAEC rates"
    "|Validity: 02-30 Jun 2026"
    "|EFS USD 242/TEU | ETS USD 68/TEU | FUE USD 15/TEU — all collect"
    "|RPT/HPT and other port-specific charges noted per port"
    "|Free time options: standard / 14 days (DMG $25/cntr prepaid) / 21 days (DMG $50/cntr prepaid)"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_SAWC = (
    "MSC | Nhava Sheva origin | South America West Coast / SAWC rates"
    "|Validity: 02-30 Jun 2026"
    "|EFS USD 238/TEU | ETS USD 100/TEU | FUE USD 22/TEU — all collect"
    "|Free time: standard / 14 days (DMG $25/cntr prepaid) / 21 days (DMG $50/cntr prepaid)"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_CA = (
    "MSC | Nhava Sheva origin | Central America rates"
    "|Validity: 04-14 Jun 2026"
    "|EFS USD 238/TEU or USD 211/TEU (see port) | ENS+AMS collect | Port-specific surcharges noted"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_CAR = (
    "MSC | Nhava Sheva origin | Caribbean rates"
    "|Validity: 04-14 Jun 2026"
    "|EFS USD 211/TEU collect | ENS+AMS collect | DTHC prepaid where noted"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_CAN = (
    "MSC | Nhava Sheva origin | Canada rates"
    "|Validity: 04-14 Jun 2026"
    "|EFS USD 211/TEU (Vancouver USD 418/TEU + FUE USD 18/TEU) | AMS + SPD collect"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_MEX = (
    "MSC | Nhava Sheva origin | Mexico rates"
    "|Validity: 04-14 Jun 2026"
    "|EFS USD 211/TEU (Veracruz/Altamira) or USD 238/TEU (Manzanillo/LC) | AMS collect"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_NAF = (
    "MSC | Nhava Sheva origin | North Africa rates"
    "|Validity: 03-30 Jun 2026"
    "|EFS USD 167/TEU | ETS USD 74/TEU | FUE USD 16/TEU — all collect"
    "|Port-specific surcharges (PSS/CGS) noted per port"
    "|Free time options: standard / 21 days (DMG $50/cntr prepaid)"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_EA = (
    "MSC | Nhava Sheva origin | East Africa rates"
    "|Validity: 03-14 Jun 2026"
    "|EFS USD 155/TEU collect | EOS inclusive | Local charges both ends"
)
CL_SA = (
    "MSC | Nhava Sheva origin | South Africa rates"
    "|Validity: 03-14 Jun 2026"
    "|EFS USD 125/TEU collect | CDD USD 30/BL collect | Local charges both ends"
)
CL_IO = (
    "MSC | Nhava Sheva origin | Indian Ocean Island / Mozambique rates"
    "|Validity: 03-14 Jun 2026"
    "|EFS USD 125/TEU collect | EOS inclusive | Local charges both ends"
    "|DTHC prepaid for inland cargo (Madagascar/Mozambique)"
)
CL_AUS = (
    "MSC | Nhava Sheva origin | Australia / New Zealand / Pacific rates"
    "|Validity: 03-14 Jun 2026"
    "|EFS USD 100/TEU collect | HAZ Packing Group I not accepted"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_USWC = (
    "MSC | Nhava Sheva origin | USA West Coast (USWC) rates"
    "|Validity: 03-14 Jun 2026"
    "|EFS USD 418/TEU | CUC USD 110/box | AMS + OTHC + local charges collect"
    "|Non-HAZ cargo only (HAZ case by case)"
)
CL_USEC = (
    "MSC | Nhava Sheva origin | USA East/Gulf Coast (USEC) rates"
    "|Validity: 03-28 Jun 2026"
    "|EFS USD 211/TEU | CUC USD 110/box | AMS + OTHC + local charges collect"
    "|Non-HAZ cargo only (HAZ case by case)"
)
CL_ME = (
    "MSC | Nhava Sheva origin | Middle East / Indian Sub-Continent rates"
    "|Validity: 01-15 Jun 2026 (Colombo/Chattogram/Male: 01-30 Jun)"
    "|EFS USD 38/TEU collect | Port-specific surcharges (OCC/PAD/EBS/ECL) noted per port"
    "|Local charges both ends | Space and equipment subject to availability"
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

def rs(dc, dp, r20, r40, surch=None, notes='', vf=None, vt=None):
    s = surch if surch else S_RS
    f = vf if vf else VF_05
    t = vt if vt else VT_30
    return row(dc, dp, r20, r40, f, t, '', s, CL_RS, notes)

def wa(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_14, '', S_WA, CL_WA, notes)

def saec(dc, dp, r20, r40, notes='', currency='USD'):
    return row(dc, dp, r20, r40, VF_02, VT_30, '', S_SAEC, CL_SAEC, notes, currency)

def sawc(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_02, VT_30, '', S_SAWC, CL_SAWC, notes)

def ca(dc, dp, r20, r40, high_efs=True, notes=''):
    s = S_CA_H if high_efs else S_CA_L
    return row(dc, dp, r20, r40, VF_04, VT_14, '', s, CL_CA, notes)

def car(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_04, VT_14, '', S_CAR, CL_CAR, notes)

def can(dc, dp, r20, r40, surch=None, notes=''):
    s = surch if surch else S_CAN
    return row(dc, dp, r20, r40, VF_04, VT_14, '', s, CL_CAN, notes)

def mex(dc, dp, r20, r40, surch=None, notes=''):
    s = surch if surch else S_MEX_L
    return row(dc, dp, r20, r40, VF_04, VT_14, '', s, CL_MEX, notes)

def naf(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_03, VT_30, '', S_NAF, CL_NAF, notes)

def ea(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_03, VT_14, '', S_EA, CL_EA, notes)

def sa(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_03, VT_14, '', S_SA, CL_SA, notes)

def io(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_03, VT_14, '', S_IO, CL_IO, notes)

def aus(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_03, VT_14, '', S_AUS, CL_AUS, notes)

def uswc(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_03, VT_14, '', S_USWC, CL_USWC, notes)

def usec(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_03, VT_28, '', S_USEC, CL_USEC, notes)

def me(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_15, '', S_ME, CL_ME, notes)

def me30(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_30, '', S_ME, CL_ME, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- MSC — NHAVA SHEVA (Mumbai pickup) Rates June 2026")
lines.append("-- Trades: Red Sea | West Africa | SAEC | SAWC | Central America | Caribbean")
lines.append("--         Canada | Mexico | North Africa | East Africa | South Africa")
lines.append("--         Indian Ocean | Australia/NZ | USWC | USEC | Middle East")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# RED SEA / HORN OF AFRICA (05-30 Jun 2026; Mogadishu/Salalah 01-14)
# ============================================================
lines.append("-- ======== RED SEA / HORN OF AFRICA (05-30 Jun 2026; Mogadishu/Salalah 01-14 Jun) ========")
lines.append("-- EFS USD 82/teu (Mogadishu $155/teu) | ETS/FUEL/OCC/WAR port-specific")
lines.append("")
lines.append(rs('Saudi Arabia', 'KING ABDULLAH PORT (KAP)', 2513, 3313, notes='ETS USD 74/teu; FUEL USD 16/teu; OCC USD 86/20 USD 129/40 collect'))
lines.append(rs('Saudi Arabia', 'JEDDAH',                   2613, 3413, notes='ETS USD 74/teu; FUEL USD 16/teu; OCC USD 86/20 USD 129/40 collect'))
lines.append(row('Sudan', 'PORT SUDAN', 2713, 3713, VF_05, VT_30, '', S_RS, CL_RS,
                 'EUR currency; ETS EUR 63/teu; FUEL EUR 14/teu; DTHC prepaid; WAR EUR 300/teu prepaid; EFS EUR 70/teu',
                 currency='EUR'))
lines.append(rs('Egypt',        'AL SOKHNA',                2713, 3513, notes='ETS USD 74/teu; FUEL USD 16/teu'))
lines.append(rs('Jordan',       'AQABA',                    2713, 3513, notes='PAD on collect; ETS USD 69/teu; FUEL USD 16/teu; JIS inclusive'))
lines.append(rs('Djibouti',     'DJIBOUTI',                 1813, 2713, notes='OCC USD 175/20 USD 245/40 prepaid; CER USD 30/teu prepaid'))
lines.append(rs('Somalia',      'MOGADISHU',                1445, 1790, S_RS_MOG, notes='PSS USD 300/cntr; EOS inclusive', vf=VF_01, vt=VT_14))
lines.append(rs('Somalia',      'BERBERA',                  1100, 1900, notes='OCC and CAC inclusive; standard free time OR 21 days (DMG USD 100/box prepaid)'))
lines.append(rs('Oman',         'SALALAH',                  3250, 4000, vf=VF_01, vt=VT_14))
lines.append(rs('Yemen',        'ADEN',                     2713, 4013, notes='OCC USD 299/20 USD 477/40 (CGS+WRS incl); GST on WRS/CGS/OCC'))
lines.append(rs('Yemen',        'MUKALLA',                  4613, 4913, notes='OCC USD 335/20 USD 525/40 collect; GST on WRS/CGS/OCC'))
lines.append("")

# ============================================================
# WEST AFRICA (01-14 Jun 2026)
# ============================================================
lines.append("-- ======== WEST AFRICA (01-14 Jun 2026) ========")
lines.append("-- EFS USD 230/TEU collect | Port-specific surcharges noted per port")
lines.append("")
lines.append(wa('Ivory Coast',           'ABIDJAN',           2000, 2700))
lines.append(wa('Gambia',                'BANJUL',            2700, 3900))
lines.append(wa('Guinea',                'CONAKRY',           3800, 5800, notes='CUS USD 75/20 USD 105/40 prepaid; CGS USD 1000/cntr'))
lines.append(wa('Benin',                 'COTONOU',           2000, 2700))
lines.append(wa('Senegal',               'DAKAR',             2400, 3600, notes='PSS USD 230/cntr'))
lines.append(wa('Cameroon',              'DOUALA',            2600, 3600, notes='SCC USD 25/teu inclusive'))
lines.append(wa('Sierra Leone',          'FREETOWN',          2800, 4000))
lines.append(wa('Gabon',                 'LIBREVILLE',        3100, 4100, notes='Carbon Emission Reduction Fee USD 15/teu on collect'))
lines.append(wa('Angola',                'LOBITO',            3550, 4700, notes='AOA USD 75/box collect'))
lines.append(wa('Togo',                  'LOME',              2000, 2700))
lines.append(wa('Angola',                'LUANDA',            2700, 3900, notes='AOA USD 75/box collect'))
lines.append(wa('Cape Verde',            'MINDELO / PRAIA',   3950, 5200))
lines.append(wa('Liberia',               'MONROVIA',          2800, 4100))
lines.append(wa('Angola',                'NAMIBE',            3750, 4900))
lines.append(wa('Mauritania',            'NOUADHIBOU',        3600, 4700))
lines.append(wa('Mauritania',            'NOUAKCHOTT',        3600, 4100))
lines.append(wa('Nigeria',               'ONNE',              2700, 4100))
lines.append(wa('Ivory Coast',           'SAN-PEDRO',         3650, 4700))
lines.append(wa('Ghana',                 'TAKORADI',          3650, 4700))
lines.append(wa('Ghana',                 'TEMA',              2000, 2700, notes='PAD on collect for port-to-port shipments'))
lines.append(wa('Nigeria',               'TIN CAN ISLAND',    2300, 2800))
lines.append(wa('Nigeria',               'APAPA',             2300, 2800))
lines.append(wa('Republic of Congo',     'POINTE NOIRE',      2900, 3900, notes='CUI USD 160/20 USD 210/40 prepaid'))
lines.append(wa('DR Congo',              'MATADI',            3450, 4300, notes='CGS USD 210/box'))
lines.append(wa('Guinea-Bissau',         'BISSAU',            3300, 4400))
lines.append(wa('Namibia',               'WALVIS BAY',        3213, 4313))
lines.append(wa('Cameroon',              'KRIBI',             3100, 4000, notes='SCC USD 25/teu inclusive'))
lines.append("")

# ============================================================
# SAEC — SOUTH AMERICA EAST COAST (02-30 Jun 2026)
# ============================================================
lines.append("-- ======== SAEC — EAST COAST SOUTH AMERICA (02-30 Jun 2026) ========")
lines.append("-- EFS USD 242/teu | ETS USD 68/teu | FUE USD 15/teu | free time options: std/14d/21d")
lines.append("-- La Guaira + Puerto Cabello in EUR | DTHC EUR 600/cntr prepaid for VEN ports")
lines.append("")
lines.append(saec('Argentina', 'BUENOS AIRES',   2400, 2500, notes='RPT USD 175/cntr additional'))
lines.append(saec('Paraguay',  'ASUNCION',        3400, 3500, notes='CAACUPEMI service; HPT USD 30/cntr'))
lines.append(saec('Paraguay',  'PILAR',           3400, 3500, notes='CAACUPEMI service; HPT USD 30/cntr'))
lines.append(saec('Brazil',    'ITAJAI',          2400, 2500))
lines.append(saec('Brazil',    'ITAPOA',          2400, 2500))
lines.append(saec('Venezuela', 'LA GUAIRA',       3900, 3900, notes='EUR currency; DTHC EUR 600/cntr prepaid (SCS+WAR incl); ACD', currency='EUR'))
lines.append(saec('Brazil',    'MANAUS',          3900, 3900, notes='ACD applies'))
lines.append(saec('Uruguay',   'MONTEVIDEO',      2400, 2500))
lines.append(saec('Brazil',    'NAVEGANTES',      2500, 2650))
lines.append(saec('Brazil',    'PARANAGUA',       2400, 2500))
lines.append(saec('Brazil',    'PECEM',           3400, 3500))
lines.append(saec('Venezuela', 'PUERTO CABELLO',  3900, 3900, notes='EUR currency; DTHC EUR 600/cntr prepaid (SCS+WAR incl); ACD', currency='EUR'))
lines.append(saec('Brazil',    'RIO DE JANEIRO',  2400, 2500))
lines.append(saec('Brazil',    'RIO GRANDE',      2400, 2500))
lines.append(saec('Argentina', 'ROSARIO',         3400, 3500))
lines.append(saec('Brazil',    'SALVADOR (DE BAHIA)', 2400, 2500))
lines.append(saec('Brazil',    'SANTOS',          2400, 2500))
lines.append(saec('Brazil',    'SUAPE',           2400, 2500, notes='ACD applies'))
lines.append(saec('Brazil',    'VILA DO CONDE',   3800, 3900, notes='ACD applies'))
lines.append(saec('Brazil',    'VITORIA',         3400, 3500))
lines.append(saec('Argentina', 'ZARATE',          3400, 3500))
lines.append("")

# ============================================================
# SAWC — SOUTH AMERICA WEST COAST (02-30 Jun 2026)
# ============================================================
lines.append("-- ======== SAWC — WEST COAST SOUTH AMERICA (02-30 Jun 2026) ========")
lines.append("-- EFS USD 238/teu | ETS USD 100/teu | FUE USD 22/teu | free time options: std/14d/21d")
lines.append("")
lines.append(sawc('Chile',     'ARICA',           4200, 4800, notes='ACD applies'))
lines.append(sawc('Colombia',  'BUENAVENTURA',    3200, 3300, notes='ISPS USD 12/cntr; ACD'))
lines.append(sawc('Peru',      'CALLAO',          3200, 3300, notes='ACD applies'))
lines.append(sawc('Colombia',  'CARTAGENA',       3200, 3300, notes='ISPS USD 12/cntr; ACD'))
lines.append(sawc('Chile',     'CORONEL',         3200, 3300, notes='ACD applies'))
lines.append(sawc('Ecuador',   'GUAYAQUIL',       3200, 3300, notes='DTHC prepaid; ACD'))
lines.append(sawc('Chile',     'IQUIQUE',         4200, 4800, notes='ACD applies'))
lines.append(sawc('Peru',      'PAITA',           4400, 5000, notes='ACD applies'))
lines.append(sawc('Chile',     'SAN ANTONIO',     3200, 3300, notes='ACD applies'))
lines.append("")

# ============================================================
# CENTRAL AMERICA (04-14 Jun 2026)
# ============================================================
lines.append("-- ======== CENTRAL AMERICA (04-14 Jun 2026) ========")
lines.append("-- EFS USD 238/teu + PCS USD 40/teu: Corinto/Acajutla/PCaldera/PQuetzal/Rodman")
lines.append("-- EFS USD 211/teu: Puerto Cortes/Moin/Puerto Barrios/Cristobal")
lines.append("")
lines.append(ca('Nicaragua',  'CORINTO',                4200, 4600, True,  notes='ENS+AMS collect'))
lines.append(ca('El Salvador','ACAJUTLA',               3200, 3300, True,  notes='ENS+AMS collect; WHA USD 50/teu; PAD USD 130/box'))
lines.append(ca('Costa Rica', 'PUERTO CALDERA',         3200, 3300, True,  notes='ENS+AMS collect; ACD'))
lines.append(ca('Guatemala',  'PUERTO QUETZAL',         3200, 3300, True,  notes='ENS+AMS collect; PAD USD 130/box; SPD USD 12/box'))
lines.append(ca('Panama',     'RODMAN',                 3200, 3300, True,  notes='ENS+AMS collect; SPD USD 15/box'))
lines.append(ca('Honduras',   'PUERTO CORTES',          3200, 3300, False, notes='PAD USD 185/box; SPD USD 25/box; ENS+AMS collect'))
lines.append(ca('Costa Rica', 'MOIN',                   3200, 3300, False, notes='ENS+AMS collect; CUS USD 60/BL'))
lines.append(ca('Guatemala',  'PUERTO BARRIOS',         3200, 3300, False, notes='PAD USD 130/box; SPD USD 12/box; ENS+AMS collect'))
lines.append(ca('Panama',     'CRISTOBAL',              3200, 3300, False, notes='ENS+AMS collect; SPD USD 8/box'))
lines.append("")

# ============================================================
# CARIBBEAN (04-14 Jun 2026)
# ============================================================
lines.append("-- ======== CARIBBEAN (04-14 Jun 2026) ========")
lines.append("-- EFS USD 211/teu | ENS+AMS collect | DTHC prepaid where noted")
lines.append("")
lines.append(car('Haiti',                'PORT AU PRINCE',     3500, 3700, notes='ENS+AMS collect; DTHC prepaid; standard free time'))
lines.append(car('Dominican Republic',   'CAUCEDO',            3200, 3300, notes='AMS+ENS collect; SPD USD 7/box; THC collect'))
lines.append(car('Trinidad and Tobago',  'PORT OF SPAIN',      3600, 3800, notes='ENS+AMS collect; DTHC prepaid; standard free time'))
lines.append(car('Jamaica',              'KINGSTON',           3600, 3800, notes='AMS+ENS collect; CUI USD 10/box; DTHC collect'))
lines.append(car('Dominican Republic',   'RIO HAINA',          3900, 4000, notes='AMS+ENS collect; SPD USD 7/box; DTHC collect'))
lines.append(car('Bahamas',              'NASSAU',             3900, 4000, notes='AMS+ENS collect; SPD USD 100/box; DTHC collect; WHA USD 5/ton; TUG USD 35/box'))
lines.append(car('Bahamas',              'FREEPORT',           3900, 4000, notes='AMS+ENS collect; SPD USD 25/box; DTHC collect'))
lines.append(car('Barbados',             'BRIDGETOWN',         4900, 5200, notes='AMS+ENS collect; PAD USD 100/teu; LOF USD 10/box'))
lines.append(car('Suriname',             'PARAMARIBO',         4900, 5200, notes='ENS collect; WHA USD 92/teu; AMS collect; THC collect; DRT'))
lines.append(car('Guyana',               'GEORGETOWN',         4600, 5000, notes='ENS collect; SPD USD 6/20 USD 8/40; THC collect; PAD USD 90/20 USD 150/40; AMS collect'))
lines.append("")

# ============================================================
# CANADA (04-14 Jun 2026)
# ============================================================
lines.append("-- ======== CANADA (04-14 Jun 2026) ========")
lines.append("")
lines.append(can('Canada', 'MONTREAL',  3300, 3400, notes='AMS+SPD collect'))
lines.append(can('Canada', 'HALIFAX',   3300, 3400, notes='AMS+SPD collect'))
lines.append(can('Canada', 'TORONTO',   3400, 3500, notes='AMS+SPD collect; max weight 47900LBS/20 60000LBS/40HC (without OVW); 55000LBS/20 65000LBS/40HC (with OVW)'))
lines.append(can('Canada', 'VANCOUVER', 3220, 4100, S_VAN, notes='AMS+SPD collect; FUE USD 18/teu'))
lines.append("")

# ============================================================
# MEXICO (04-14 Jun 2026)
# ============================================================
lines.append("-- ======== MEXICO (04-14 Jun 2026) ========")
lines.append("")
lines.append(mex('Mexico', 'VERACRUZ',         2700, 2900, S_MEX_L, notes='AMS collect'))
lines.append(mex('Mexico', 'ALTAMIRA',         2700, 2900, S_MEX_L, notes='AMS collect'))
lines.append(mex('Mexico', 'MANZANILLO',       2800, 3000, S_MEX_H, notes='AMS collect; PCS USD 40/teu'))
lines.append(mex('Mexico', 'LAZARO CARDENAS',  2800, 3000, S_MEX_H, notes='AMS collect; PCS USD 40/teu'))
lines.append("")

# ============================================================
# NORTH AFRICA (03-30 Jun 2026)
# ============================================================
lines.append("-- ======== NORTH AFRICA (03-30 Jun 2026) ========")
lines.append("-- EFS USD 167/teu | ETS USD 74/teu | FUEL USD 16/teu | PSS/CGS port-specific")
lines.append("")
lines.append(naf('Morocco',  'AGADIR',      4200, 4300, notes='DMG $50/cntr prepaid for 21 days free time'))
lines.append(naf('Algeria',  'ALGIERS',     3700, 3800, notes='PSS USD 150/cntr; CGS USD 400/cntr; DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Algeria',  'ANNABA',      3700, 3800, notes='PSS USD 150/cntr; CGS USD 400/cntr; DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Algeria',  'BEJAIA',      3700, 3800, notes='PSS USD 150/cntr; CGS USD 400/cntr; DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Libya',    'BENGHAZI',    3750, 3850, notes='WRS inclusive; CGS USD 400/cntr; DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Morocco',  'CASABLANCA',  3700, 3800, notes='PSS USD 150/cntr; DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Libya',    'KHOMS',       3750, 3850, notes='WRS inclusive; DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Libya',    'MISURATA',    3750, 3850, notes='WRS inclusive; DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Morocco',  'NADOR',       4400, 4500, notes='DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Algeria',  'ORAN',        3700, 3800, notes='PSS USD 150/cntr; CGS USD 400/cntr; DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Algeria',  'SKIKDA',      3700, 3800, notes='PSS USD 150/cntr; CGS USD 400/cntr; DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Libya',    'TRIPOLI',     3700, 3800, notes='DMG $50/cntr prepaid for 21 days'))
lines.append(naf('Tunisia',  'TUNIS',       3700, 3800, notes='PSS USD 150/cntr; DMG $50/cntr prepaid for 21 days'))
lines.append("")

# ============================================================
# EAST AFRICA (03-14 Jun 2026)
# ============================================================
lines.append("-- ======== EAST AFRICA (03-14 Jun 2026) ========")
lines.append("")
lines.append(ea('Kenya',   'MOMBASA',       1645, 1790, notes='SPD USD 6/cntr; EOS inclusive'))
lines.append(ea('Tanzania','DAR ES SALAAM', 1745, 1890, notes='TCFB collect additional; EOS inclusive'))
lines.append(ea('Tanzania','TANGA',         2345, 2690, notes='TCFB collect additional; EOS inclusive'))
lines.append(ea('Tanzania','ZANZIBAR',      2645, 3490, notes='PSS USD 700/cntr prepaid; EOS inclusive'))
lines.append("")

# ============================================================
# SOUTH AFRICA (03-14 Jun 2026)
# ============================================================
lines.append("-- ======== SOUTH AFRICA (03-14 Jun 2026) ========")
lines.append("-- EFS USD 125/teu | CDD USD 30/BL collect")
lines.append("")
lines.append(sa('South Africa', 'DURBAN',    2113, 3013, notes='CDD USD 30/BL collect'))
lines.append(sa('South Africa', 'CAPE TOWN', 2413, 3413, notes='CDD USD 30/BL collect'))
lines.append(sa('South Africa', 'COEGA',     2413, 3413, notes='CDD USD 30/BL collect'))
lines.append("")

# ============================================================
# INDIAN OCEAN / MOZAMBIQUE (03-14 Jun 2026)
# ============================================================
lines.append("-- ======== INDIAN OCEAN / MOZAMBIQUE (03-14 Jun 2026) ========")
lines.append("-- EFS USD 125/teu | EOS inclusive | DTHC prepaid for inland cargo")
lines.append("")
lines.append(io('Madagascar', 'TAMATAVE',          1575, 1950, notes='PAD additional; EOS inclusive'))
lines.append(io('Mauritius',  'PORT LOUIS',         1475, 1850, notes='EOS inclusive'))
lines.append(io('Madagascar', 'MAJUNGA',            2475, 3050, notes='EOS inclusive'))
lines.append(io('Madagascar', 'DIEGO SUAREZ',       2475, 3050, notes='CDD USD 30/BL collect; EOS inclusive'))
lines.append(io('France',     'POINTE DE GALETS (REUNION)', 2375, 3350, notes='CDD USD 30/BL collect; EOS inclusive'))
lines.append(io('Comoros',    'MORONI',             2825, 4050, notes='CUI and SPD collect; EOS inclusive'))
lines.append(io('Mayotte',    'LONGONI',            2475, 3050, notes='CDD USD 30/BL collect; EOS inclusive'))
lines.append(io('Mozambique', 'BEIRA',              1945, 2390, notes='EOS USD 500/teu; CGS inclusive'))
lines.append(io('Mozambique', 'NACALA',             1945, 2390, notes='EOS USD 500/teu'))
lines.append(io('Mozambique', 'MAPUTO',             1895, 2290, notes='SPD USD 10/cntr; EOS USD 500/teu'))
lines.append("")

# ============================================================
# AUSTRALIA / NEW ZEALAND / PACIFIC (03-14 Jun 2026)
# ============================================================
lines.append("-- ======== AUSTRALIA / NEW ZEALAND / PACIFIC (03-14 Jun 2026) ========")
lines.append("-- EFS USD 100/teu | HAZ Packing Group I not accepted")
lines.append("")
lines.append(aus('Australia',      'ADELAIDE',       1150, 2100))
lines.append(aus('Australia',      'BELL BAY',       2050, 3900))
lines.append(aus('Australia',      'BRISBANE',       2000, 3100))
lines.append(aus('Australia',      'MELBOURNE',      1150, 2100))
lines.append(aus('Australia',      'FREMANTLE',      1150, 2100))
lines.append(aus('Australia',      'SYDNEY',         1150, 2100))
lines.append(aus('New Zealand',    'AUCKLAND',       1150, 2100))
lines.append(aus('New Zealand',    'BLUFF',          1150, 2100))
lines.append(aus('New Zealand',    'LYTTLETON',      1150, 2100))
lines.append(aus('New Zealand',    'NAPIER',         1150, 2100))
lines.append(aus('New Zealand',    'NELSON',         1950, 3700))
lines.append(aus('New Zealand',    'PORT CHALMERS',  1150, 2100))
lines.append(aus('New Zealand',    'TAURANGA',       1300, 2400))
lines.append(aus('New Zealand',    'WELLINGTON',     1150, 2100))
lines.append(aus('New Caledonia',  'NOUMEA',         2250, 3900))
lines.append(aus('Fiji',           'LAUTOKA',        2250, 3900))
lines.append(aus('Fiji',           'SUVA',           2250, 3900))
lines.append("")

# ============================================================
# USA WEST COAST (03-14 Jun 2026)
# ============================================================
lines.append("-- ======== USA WEST COAST (03-14 Jun 2026) ========")
lines.append("-- EFS USD 418/teu | CUC USD 110/box | Non-HAZ only")
lines.append("")
lines.append(uswc('United States', 'LONG BEACH / LOS ANGELES', 3245, 4050, notes='OTHC + local charges + docs + AMS collect'))
lines.append(uswc('United States', 'SEATTLE',                   3245, 4050, notes='OTHC + local charges + docs + AMS collect'))
lines.append(uswc('United States', 'OAKLAND',                   3245, 4050, notes='OTHC + local charges + docs + AMS collect'))
lines.append("")

# ============================================================
# USA EAST/GULF COAST (03-28 Jun 2026)
# ============================================================
lines.append("-- ======== USA EAST/GULF COAST (03-28 Jun 2026) ========")
lines.append("-- EFS USD 211/teu | CUC USD 110/box | Non-HAZ only")
lines.append("")
lines.append(usec('United States', 'NEW YORK',       3200, 3240, notes='OTHC+locals+docs+AMS collect; CFC USD 14.05/teu'))
lines.append(usec('United States', 'NORFOLK',        3200, 3240, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'CHARLESTON',     3200, 3240, notes='OTHC+locals+docs+AMS collect; CFC USD 14.05/teu; LCF USD 13.39/cntr'))
lines.append(usec('United States', 'SAVANNAH',       3200, 3240, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'HOUSTON',        3800, 4100, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'BALTIMORE',      3800, 4100, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'NEW ORLEANS',    4000, 4250, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'PORT EVERGLADES',3800, 4100, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'PHILADELPHIA',   4200, 4450, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'BOSTON',         4200, 4450, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'MOBILE',         4000, 4250, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'JACKSONVILLE',   4000, 4250, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append("")

# ============================================================
# MIDDLE EAST / INDIAN SUB-CONTINENT
# Most: 01-15 Jun | Colombo/Chattogram/Male: 01-30 Jun
# ============================================================
lines.append("-- ======== MIDDLE EAST / INDIAN SUB-CONTINENT ========")
lines.append("-- 01-15 Jun (Colombo/Chattogram/Male: 01-30 Jun) | EFS USD 38/teu")
lines.append("")
lines.append(me('Oman',                 'SOHAR',            2200, 2850, notes='PAD and SPD collect'))
lines.append(me('United Arab Emirates', 'KHOR AL FAKKAN',   3100, 3800))
lines.append(me('United Arab Emirates', 'JEBEL ALI',        3400, 4300))
lines.append(me('United Arab Emirates', 'ABU DHABI',        3400, 4300))
lines.append(me('United Arab Emirates', 'SHARJAH',          3400, 4300))
lines.append(me('United Arab Emirates', 'RAS AL KHAIMAH',   3400, 4300))
lines.append(me('United Arab Emirates', 'AJMAN',            3700, 4500))
lines.append(me('United Arab Emirates', 'UMM AL QUWAIN',    3700, 4500, notes='EBS additional on collect'))
lines.append(me('Saudi Arabia',         'DAMMAM',           3900, 4700, notes='OCC additional on collect'))
lines.append(me('Bahrain',              'BAHRAIN',          5200, 6000, notes='EBS and ECL additional on collect'))
lines.append(me('Qatar',                'HAMAD',            5200, 6000, notes='OCC additional on collect'))
lines.append(me('Kuwait',               'SHUWAIKH',         5200, 6000))
lines.append(me('Kuwait',               'SHUAIBA',          5200, 6000))
lines.append(me('Iraq',                 'UMM QASR',         5500, 6500, notes='DTHC inclusive'))
lines.append("")
lines.append("-- ISC (01-30 Jun 2026)")
lines.append(me30('Sri Lanka',  'COLOMBO',    750,  650, notes='20ft>40ft on source sheet; DTHC and PAD inclusive'))
lines.append(me30('Bangladesh', 'CHATTOGRAM', 800, 1000, notes='DTHC inclusive'))
lines.append(me30('Maldives',   'MALE',      1650, 1900, notes='PAD and DOF inclusive'))
lines.append("")

full_text = '\n'.join(lines)
total = full_text.count('\nINSERT ') + (1 if full_text.startswith('INSERT ') else 0)
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
