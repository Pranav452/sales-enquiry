import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OC = 'India'
OP = 'NHAVA SHEVA'
SL = 'MSC'

def row(dc, dp, r20, r40, vf, vt, cur='USD', via='', surcharges='', notes='', clauses=''):
    v = f"'{via}'" if via else 'NULL'
    s = surcharges.replace("'", "''") if surcharges else 'NULL'
    if s != 'NULL':
        s = f"'{s}'"
    n = notes.replace("'", "''") if notes else 'NULL'
    if n != 'NULL':
        n = f"'{n}'"
    cl = clauses.replace("'", "''") if clauses else 'NULL'
    if cl != 'NULL':
        cl = f"'{cl}'"
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{dc}','{dp}',"
        f"'{cur}',{r20},{r40},'{vf}','{vt}',{v},{s},{n},{cl},1,'SYSTEM',GETDATE(),GETDATE());"
    )

lines = []
lines.append("-- ============================================================")
lines.append("-- MSC (Mediterranean Shipping Company) - April 2026 Rate Sheet")
lines.append("-- Updated: 20-Apr-2026 | Origin: Mumbai Pickup / Nhava Sheva Loading")
lines.append("-- Covers: Red Sea, West Africa, SAEC, SAWC, Central America,")
lines.append("--         Caribbean, Canada, Mexico, North Africa, East Africa,")
lines.append("--         South Africa, Indian Ocean, Australia/NZ/Pacific,")
lines.append("--         USWC, USEC, Middle East/ISC")
lines.append("-- Notes: EFS = VATOS; all surcharges subject to change")
lines.append("--        Flexi Bag Surcharge FTS $14/cntr applicable")
lines.append("--        USD 50 additional for Annex B commodities")
lines.append("-- ============================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

GLOBAL_CLAUSES = "FAK rates from Nhava Sheva (Mumbai pickup)|All surcharges VATOS and subject to change|Flexi Bag Surcharge FTS $14/cntr|USD 50 additional for Annex B commodities|EFS on VATOS"

# ============================================================
# RED SEA  (11 Apr - 30 Apr 2026, except Mogadishu/Berbera 1 Apr)
# ============================================================
lines.append("-- ======== RED SEA (RA: per MSC rate sheet) ========")
lines.append("")
VF_RS = '2026-04-11'; VT_RS = '2026-04-30'
VF_RS1 = '2026-04-01'  # Mogadishu/Berbera

RS_CLAUSES = GLOBAL_CLAUSES + "|Red Sea trade; subject to Red Sea surcharges"

# King Abdullah Port
lines.append(row('Saudi Arabia','KING ABDULLAH PORT',2613,3613,VF_RS,VT_RS,
    surcharges='ETS:75/teu;FUEL:16/teu;OCC:86/20-129/40;EFS:55/teu',
    notes='OCC $86/20\' $129/40\'',
    clauses=RS_CLAUSES))

# Jeddah
lines.append(row('Saudi Arabia','JEDDAH',2613,3613,VF_RS,VT_RS,
    surcharges='ETS:75/teu;FUEL:16/teu;OCC:86/20-129/40;EFS:55/teu',
    notes='OCC $86/20\' $129/40\'',
    clauses=RS_CLAUSES))

# Port Sudan (EUR)
lines.append(row('Sudan','PORT SUDAN',2813,3813,VF_RS,VT_RS,cur='EUR',
    surcharges='ETS:75/teu;FUEL:16/teu;DTHC:collect;WAR:300/cntr;EFS:55/teu',
    notes='EUR rates; DTHC collect; WAR surcharge EUR 300/cntr',
    clauses=RS_CLAUSES))

# Al Sokhna
lines.append(row('Egypt','AL SOKHNA',2813,3813,VF_RS,VT_RS,
    surcharges='ETS:75/teu;FUEL:16/teu;EFS:55/teu',
    clauses=RS_CLAUSES))

# Aqaba
lines.append(row('Jordan','AQABA',2813,3813,VF_RS,VT_RS,
    surcharges='PAD:collect;ETS:75/teu;FUEL:16/teu;JIS:incl;EFS:55/teu',
    notes='PAD collect; JIS inclusive',
    clauses=RS_CLAUSES))

# Djibouti
lines.append(row('Djibouti','DJIBOUTI',2013,3013,VF_RS,VT_RS,
    surcharges='OCC:175/20-245/40;CER:30/teu;EFS:55/teu',
    notes='OCC $175/20\' $245/40\'',
    clauses=RS_CLAUSES))

# Mogadishu (1 Apr)
lines.append(row('Somalia','MOGADISHU',2013,2313,VF_RS1,VT_RS,
    surcharges='PSS:300/teu;EOS:500/teu;EFS:155/teu',
    clauses=RS_CLAUSES))

# Berbera (1 Apr) - two RA options; using single row with notes
lines.append(row('Somalia','BERBERA',1100,1900,VF_RS1,VT_RS,
    surcharges='EFS:51/teu',
    notes='Incl OCC, CAC; EFS $51/teu',
    clauses=RS_CLAUSES))

# Aden
lines.append(row('Yemen','ADEN',2813,4013,VF_RS,VT_RS,
    surcharges='OCC:299/20-477/40;EFS:55/teu',
    notes='OCC $299/20\' $477/40\'; CGS/WRS incl',
    clauses=RS_CLAUSES))

# Mukalla
lines.append(row('Yemen','MUKALLA',4613,4913,VF_RS,VT_RS,
    surcharges='OCC:335/20-525/40;EFS:55/teu',
    notes='OCC $335/20\' $525/40\'',
    clauses=RS_CLAUSES))

lines.append("")

# ============================================================
# WEST AFRICA  (1 Apr - 30 Apr 2026)
# RA R36321010000629 except Walvis Bay/Kribi R36321010000651
# All + EFS $230/TEU
# ============================================================
lines.append("-- ======== WEST AFRICA (RA R36321010000629 / R36321010000651) ========")
lines.append("")
VF_WA = '2026-04-01'; VT_WA = '2026-04-30'
WA_CLAUSES = GLOBAL_CLAUSES + "|West Africa trade; RA R36321010000629|EFS $230/TEU"
WA_CLAUSES_651 = GLOBAL_CLAUSES + "|West Africa trade; RA R36321010000651|EFS $230/TEU"
WA_EFS = 'EFS:230/teu'

wa_ports = [
    ('Ivory Coast','ABIDJAN',2600,3000,'R36321010000629'),
    ('Gambia','BANJUL',3400,4400,'R36321010000629'),
    ('Guinea-Bissau','BISSAU',3600,4600,'R36321010000629'),
    ('Guinea','CONAKRY',3800,5800,'R36321010000629'),
    ('Benin','COTONOU',2600,3000,'R36321010000629'),
    ('Senegal','DAKAR',2800,3700,'R36321010000629'),
    ('Cameroon','DOUALA',2950,3600,'R36321010000629'),
    ('Sierra Leone','FREETOWN',3100,4300,'R36321010000629'),
    ('Gabon','LIBREVILLE',3600,4100,'R36321010000629'),
    ('Angola','LOBITO',3550,4700,'R36321010000629'),
    ('Togo','LOME',2600,3000,'R36321010000629'),
    ('Angola','LUANDA',3050,4100,'R36321010000629'),
    ('Cape Verde','MINDELO',3950,5200,'R36321010000629'),
    ('Cape Verde','PRAIA',3950,5200,'R36321010000629'),
    ('Liberia','MONROVIA',3100,4100,'R36321010000629'),
    ('Angola','NAMIBE',3750,4800,'R36321010000629'),
    ('Mauritania','NOUADHIBOU',3650,4700,'R36321010000629'),
    ('Mauritania','NOUAKCHOTT',3650,4500,'R36321010000629'),
    ('Nigeria','ONNE',3500,4200,'R36321010000629'),
    ('Ivory Coast','SAN-PEDRO',3650,4600,'R36321010000629'),
    ('Ghana','TAKORADI',3650,4600,'R36321010000629'),
    ('Ghana','TEMA',2600,3000,'R36321010000629'),
    ('Nigeria','TINCAN ISLAND',3100,3000,'R36321010000629'),
    ('Nigeria','APAPA',3100,3000,'R36321010000629'),
    ('Congo','POINTE NOIRE',3250,3900,'R36321010000629'),
    ('Congo (DRC)','MATADI',3450,4300,'R36321010000629'),
    ('Namibia','WALVIS BAY',3513,4313,'R36321010000651'),
    ('Cameroon','KRIBI',3350,4000,'R36321010000651'),
]

for dc, dp, r20, r40, ra in wa_ports:
    cl = WA_CLAUSES if ra == 'R36321010000629' else WA_CLAUSES_651
    lines.append(row(dc,dp,r20,r40,VF_WA,VT_WA,surcharges=WA_EFS,clauses=cl))

lines.append("")

# ============================================================
# SAEC - South America East Coast  (1 Apr - 30 Apr 2026)
# All + EFS $242/TEU; La Guaira + Puerto Cabello = EUR
# ============================================================
lines.append("-- ======== SAEC - South America East Coast ========")
lines.append("")
VF_SAEC = '2026-04-01'; VT_SAEC = '2026-04-30'
SAEC_CLAUSES = GLOBAL_CLAUSES + "|SAEC trade|EFS $242/TEU"
SAEC_EFS = 'EFS:242/teu'

saec_ports = [
    ('Argentina','BUENOS AIRES',1400,1500,'USD'),
    ('Paraguay','ASUNCION',2400,2500,'USD'),
    ('Paraguay','PILAR',2400,2500,'USD'),
    ('Brazil','ITAJAI',1400,1500,'USD'),
    ('Brazil','ITAPOA',1400,1500,'USD'),
    ('Venezuela','LA GUAIRA',2900,2900,'EUR'),
    ('Brazil','MANAUS',2900,2900,'USD'),
    ('Uruguay','MONTEVIDEO',1400,1500,'USD'),
    ('Brazil','NAVEGANTES',1500,1650,'USD'),
    ('Brazil','PARANAGUA',1400,1500,'USD'),
    ('Brazil','PECEM',2400,2500,'USD'),
    ('Venezuela','PUERTO CABELLO',2900,2900,'EUR'),
    ('Brazil','RIO DE JANEIRO',1400,1500,'USD'),
    ('Brazil','RIO GRANDE',1400,1500,'USD'),
    ('Argentina','ROSARIO',2400,2500,'USD'),
    ('Brazil','SALVADOR',1400,1500,'USD'),
    ('Brazil','SANTOS',1400,1500,'USD'),
    ('Brazil','SUAPE',1400,1500,'USD'),
    ('Brazil','VILA DO CONDE',2800,2900,'USD'),
    ('Brazil','VITORIA',2400,2500,'USD'),
    ('Argentina','ZARATE',2400,2500,'USD'),
]

for dc, dp, r20, r40, cur in saec_ports:
    n = 'EUR rates' if cur == 'EUR' else ''
    lines.append(row(dc,dp,r20,r40,VF_SAEC,VT_SAEC,cur=cur,surcharges=SAEC_EFS,
        notes=n if n else None, clauses=SAEC_CLAUSES))

lines.append("")

# ============================================================
# SAWC - South America West Coast  (1 Apr - 30 Apr 2026)
# All + EFS $238/TEU
# ============================================================
lines.append("-- ======== SAWC - South America West Coast ========")
lines.append("")
VF_SAWC = '2026-04-01'; VT_SAWC = '2026-04-30'
SAWC_CLAUSES = GLOBAL_CLAUSES + "|SAWC trade|EFS $238/TEU"
SAWC_EFS = 'EFS:238/teu'

sawc_ports = [
    ('Chile','ARICA',2700,2800),
    ('Colombia','BUENAVENTURA',1700,1800),
    ('Peru','CALLAO',1700,1800),
    ('Colombia','CARTAGENA',1700,1800),
    ('Chile','CORONEL',1700,1800),
    ('Ecuador','GUAYAQUIL',1700,1800),
    ('Chile','IQUIQUE',2700,2800),
    ('Peru','PAITA',2900,3000),
    ('Chile','SAN ANTONIO',1700,1800),
]

for dc, dp, r20, r40 in sawc_ports:
    lines.append(row(dc,dp,r20,r40,VF_SAWC,VT_SAWC,surcharges=SAWC_EFS,clauses=SAWC_CLAUSES))

lines.append("")

# ============================================================
# CENTRAL AMERICA  (10 Apr - 30 Apr 2026, RA R36320090000323)
# ============================================================
lines.append("-- ======== CENTRAL AMERICA (RA R36320090000323) ========")
lines.append("")
VF_CA = '2026-04-10'; VT_CA = '2026-04-30'
CA_CLAUSES = GLOBAL_CLAUSES + "|Central America trade; RA R36320090000323"

ca_ports = [
    ('Nicaragua','CORINTO',3800,4200),
    ('El Salvador','ACAJUTLA',2900,3100),
    ('Costa Rica','PUERTO CALDERA',2900,3100),
    ('Guatemala','PUERTO QUETZAL',2900,3100),
    ('Panama','RODMAN',2900,3100),
    ('Honduras','PUERTO CORTES',2900,3100),
    ('Costa Rica','MOIN',2900,3100),
    ('Guatemala','PUERTO BARRIOS',2900,3100),
    ('Panama','CRISTOBAL',2900,3100),
]

for dc, dp, r20, r40 in ca_ports:
    lines.append(row(dc,dp,r20,r40,VF_CA,VT_CA,clauses=CA_CLAUSES))

lines.append("")

# ============================================================
# CARIBBEAN  (10 Apr - 30 Apr 2026, RA R36320090000323)
# ============================================================
lines.append("-- ======== CARIBBEAN (RA R36320090000323) ========")
lines.append("")
VF_CB = '2026-04-10'; VT_CB = '2026-04-30'
CB_CLAUSES = GLOBAL_CLAUSES + "|Caribbean trade; RA R36320090000323"

cb_ports = [
    ('Haiti','PORT AU PRINCE',3300,3700),
    ('Dominican Republic','CAUCEDO',2800,3100),
    ('Trinidad and Tobago','PORT OF SPAIN',3200,3400),
    ('Jamaica','KINGSTON',3200,3400),
    ('Dominican Republic','RIO HAINA',3600,3700),
    ('Bahamas','NASSAU',3600,3700),
    ('Bahamas','FREEPORT',3600,3700),
    ('Barbados','BRIDGETOWN',4600,5200),
    ('Suriname','PARAMARIBO',4600,5200),
    ('Guyana','GEORGETOWN',4300,4700),
]

for dc, dp, r20, r40 in cb_ports:
    lines.append(row(dc,dp,r20,r40,VF_CB,VT_CB,clauses=CB_CLAUSES))

lines.append("")

# ============================================================
# CANADA  (10 Apr - 30 Apr 2026, RA R36320060000719)
# Vancouver validity from 16 Apr
# ============================================================
lines.append("-- ======== CANADA (RA R36320060000719) ========")
lines.append("")
CAN_CLAUSES = GLOBAL_CLAUSES + "|Canada trade; RA R36320060000719"

lines.append(row('Canada','MONTREAL',3300,3400,'2026-04-10','2026-04-30',clauses=CAN_CLAUSES))
lines.append(row('Canada','HALIFAX',3300,3400,'2026-04-10','2026-04-30',clauses=CAN_CLAUSES))
lines.append(row('Canada','TORONTO',3400,3500,'2026-04-10','2026-04-30',clauses=CAN_CLAUSES))
lines.append(row('Canada','VANCOUVER',2600,2900,'2026-04-16','2026-04-30',clauses=CAN_CLAUSES))

lines.append("")

# ============================================================
# MEXICO  (10 Apr - 30 Apr 2026, RA R36320060000719)
# ============================================================
lines.append("-- ======== MEXICO (RA R36320060000719) ========")
lines.append("")
MEX_CLAUSES = GLOBAL_CLAUSES + "|Mexico trade; RA R36320060000719"

mex_ports = [
    ('Mexico','VERACRUZ',2400,2500),
    ('Mexico','ALTAMIRA',2400,2500),
    ('Mexico','MANZANILLO',2400,2600),
    ('Mexico','LAZARO CARDENAS',2400,2600),
]
for dc, dp, r20, r40 in mex_ports:
    lines.append(row(dc,dp,r20,r40,'2026-04-10','2026-04-30',clauses=MEX_CLAUSES))

lines.append("")

# ============================================================
# NORTH AFRICA  (6 Apr - 30 Apr 2026)
# GRI +$300/cntr eff 10 Apr → split rows: 6-9 Apr base, 10-30 Apr base+300
# Benghazi/Khoms/Misurata incl WRS
# ============================================================
lines.append("-- ======== NORTH AFRICA (6-9 Apr base; 10-30 Apr +GRI $300/cntr) ========")
lines.append("")
NA_CLAUSES_A = GLOBAL_CLAUSES + "|North Africa trade; validity 6-9 Apr 2026 (pre-GRI)"
NA_CLAUSES_B = GLOBAL_CLAUSES + "|North Africa trade; validity 10-30 Apr 2026 (incl GRI +$300/cntr eff 10 Apr)"

na_ports = [
    ('Morocco','AGADIR',3000,3100),
    ('Algeria','ALGIERS',2500,2600),
    ('Algeria','ANNABA',2500,2600),
    ('Algeria','BEJAIA',2500,2600),
    ('Libya','BENGHAZI',2550,2650),  # incl WRS
    ('Morocco','CASABLANCA',2500,2600),
    ('Libya','KHOMS',2550,2650),     # incl WRS
    ('Libya','MISURATA',2550,2650),  # incl WRS
    ('Morocco','NADOR',3200,3300),
    ('Algeria','ORAN',2500,2600),
    ('Algeria','SKIKDA',2500,2600),
    ('Libya','TRIPOLI',2500,2600),
    ('Tunisia','TUNIS',2500,2600),
]
wrs_ports = {'BENGHAZI','KHOMS','MISURATA'}

for dc, dp, r20, r40 in na_ports:
    n = 'WRS incl' if dp in wrs_ports else None
    # Pre-GRI row
    lines.append(row(dc,dp,r20,r40,'2026-04-06','2026-04-09',
        notes=n, clauses=NA_CLAUSES_A))
    # Post-GRI row (+300 per cntr)
    lines.append(row(dc,dp,r20+300,r40+300,'2026-04-10','2026-04-30',
        notes=('GRI +$300/cntr; ' + n) if n else 'GRI +$300/cntr',
        clauses=NA_CLAUSES_B))

lines.append("")

# ============================================================
# EAST AFRICA  (1 Apr - 30 Apr 2026, RA R36321010000651)
# ============================================================
lines.append("-- ======== EAST AFRICA (RA R36321010000651) ========")
lines.append("")
EA_CLAUSES = GLOBAL_CLAUSES + "|East Africa trade; RA R36321010000651"

ea_ports = [
    ('Kenya','MOMBASA',1513,2013),
    ('Tanzania','DAR ES SALAAM',1613,2113),
    ('Tanzania','TANGA',2513,3013),
    ('Tanzania','ZANZIBAR',3013,4013),
]
for dc, dp, r20, r40 in ea_ports:
    lines.append(row(dc,dp,r20,r40,'2026-04-01','2026-04-30',clauses=EA_CLAUSES))

lines.append("")

# ============================================================
# SOUTH AFRICA  (1 Apr - 30 Apr 2026, RA R36321010000651)
# ============================================================
lines.append("-- ======== SOUTH AFRICA (RA R36321010000651) ========")
lines.append("")
SA_CLAUSES = GLOBAL_CLAUSES + "|South Africa trade; RA R36321010000651"

sa_ports = [
    ('South Africa','DURBAN',1613,2013),
    ('South Africa','CAPE TOWN',1913,2413),
    ('South Africa','COEGA',1913,2413),
]
for dc, dp, r20, r40 in sa_ports:
    lines.append(row(dc,dp,r20,r40,'2026-04-01','2026-04-30',clauses=SA_CLAUSES))

lines.append("")

# ============================================================
# INDIAN OCEAN  (1 Apr - 30 Apr 2026, RA R36321010000651)
# ============================================================
lines.append("-- ======== INDIAN OCEAN (RA R36321010000651) ========")
lines.append("")
IO_CLAUSES = GLOBAL_CLAUSES + "|Indian Ocean trade; RA R36321010000651"

io_ports = [
    ('Madagascar','TAMATAVE',1463,1913),
    ('Mauritius','PORT LOUIS',1413,1813),
    ('Madagascar','MAJUNGA',2313,2913),
    ('Madagascar','DIEGO SUAREZ',2313,2913),
    ('Reunion','POINTE DE GALETS',2213,3213),
    ('Comoros','MORONI',2663,3913),
    ('Mayotte','LONGONI',2313,2913),
    ('Mozambique','BEIRA',2213,2913),
    ('Mozambique','NACALA',2163,3213),
    ('Mozambique','MAPUTO',2063,3113),
]
for dc, dp, r20, r40 in io_ports:
    lines.append(row(dc,dp,r20,r40,'2026-04-01','2026-04-30',clauses=IO_CLAUSES))

lines.append("")

# ============================================================
# AUSTRALIA / NEW ZEALAND / PACIFIC  (1 Apr - 30 Apr 2026, RA R36321010000263)
# ============================================================
lines.append("-- ======== AUSTRALIA / NEW ZEALAND / PACIFIC (RA R36321010000263) ========")
lines.append("")
ANZ_CLAUSES = GLOBAL_CLAUSES + "|Australia/NZ/Pacific trade; RA R36321010000263"

anz_ports = [
    ('Australia','ADELAIDE',1150,2100),
    ('Australia','BELL BAY',2050,3900),
    ('Australia','BRISBANE',2000,3100),
    ('Australia','MELBOURNE',1150,2100),
    ('Australia','FREMANTLE',1150,2100),
    ('Australia','SYDNEY',1150,2100),
    ('New Zealand','AUCKLAND',1150,2100),
    ('New Zealand','BLUFF',1150,2100),
    ('New Zealand','LYTTLETON',1150,2100),
    ('New Zealand','NAPIER',1150,2100),
    ('New Zealand','NELSON',1950,3700),
    ('New Zealand','PORT CHALMERS',1150,2100),
    ('New Zealand','TAURANGA',1300,2400),
    ('New Zealand','WELLINGTON',1150,2100),
    ('New Caledonia','NOUMEA',2250,3900),
    ('Fiji','LAUTOKA',2250,3900),
    ('Fiji','SUVA',2250,3900),
]
for dc, dp, r20, r40 in anz_ports:
    lines.append(row(dc,dp,r20,r40,'2026-04-01','2026-04-30',clauses=ANZ_CLAUSES))

lines.append("")

# ============================================================
# USWC  (14 Apr - 30 Apr 2026, RA R36320100000386)
# ============================================================
lines.append("-- ======== USWC (RA R36320100000386) ========")
lines.append("")
USWC_CLAUSES = GLOBAL_CLAUSES + "|USWC trade; RA R36320100000386"

uswc_ports = [
    ('USA','LONG BEACH',1900,2200),
    ('USA','LOS ANGELES',1900,2200),
    ('USA','SEATTLE',1900,2200),
    ('USA','OAKLAND',1900,2200),
]
for dc, dp, r20, r40 in uswc_ports:
    lines.append(row(dc,dp,r20,r40,'2026-04-14','2026-04-30',clauses=USWC_CLAUSES))

lines.append("")

# ============================================================
# USEC  (1 Apr - 30 Apr 2026, RA R36320100000386)
# EFS: till 7 Apr $100-$110; eff 8 Apr $211-$237 — using effective 8 Apr rates
# ============================================================
lines.append("-- ======== USEC (RA R36320100000386) ========")
lines.append("-- Note: EFS revised eff 8 Apr 2026 (pre-8 Apr: $100-$110/teu)")
lines.append("")
USEC_CLAUSES = GLOBAL_CLAUSES + "|USEC trade; RA R36320100000386|EFS revised eff 8 Apr 2026; pre-8 Apr EFS was $100-$110/teu"

usec_ports = [
    ('USA','NEW YORK',2750,2975,'EFS:237/teu'),
    ('USA','NORFOLK',2750,2975,'EFS:237/teu'),
    ('USA','CHARLESTON',2750,2975,'EFS:237/teu'),
    ('USA','SAVANNAH',2750,2975,'EFS:237/teu'),
    ('USA','HOUSTON',2950,3175,'EFS:211/teu'),
    ('USA','BALTIMORE',2950,3175,'EFS:211/teu'),
    ('USA','NEW ORLEANS',3150,3375,'EFS:211/teu'),
    ('USA','PORT EVERGLADES',3050,3275,'EFS:211/teu'),
    ('USA','PHILADELPHIA',3150,3375,'EFS:211/teu'),
    ('USA','BOSTON',3150,3375,'EFS:211/teu'),
    ('USA','MOBILE',3150,3375,'EFS:211/teu'),
    ('USA','JACKSONVILLE',3050,3275,'EFS:211/teu'),
]
for dc, dp, r20, r40, efs in usec_ports:
    lines.append(row(dc,dp,r20,r40,'2026-04-01','2026-04-30',surcharges=efs,clauses=USEC_CLAUSES))

lines.append("")

# ============================================================
# MIDDLE EAST / ISC  (16 Apr - 30 Apr 2026, RA R36322080002389)
# Only Colombo, Chattogram, Male have rates; others = check with sales
# ============================================================
lines.append("-- ======== MIDDLE EAST / ISC (RA R36322080002389) ========")
lines.append("-- Note: Sohar/KAF/Jebel Ali/Abu Dhabi/Sharjah/RAK/Ajman/UAQ/Dammam/Bahrain/Hamad/Shuwaikh/Shuaiba/Umm Qasr = check with sales person (not loaded)")
lines.append("")
ISC_CLAUSES = GLOBAL_CLAUSES + "|Middle East/ISC trade; RA R36322080002389"

lines.append(row('Sri Lanka','COLOMBO',650,650,'2026-04-16','2026-04-30',
    surcharges='EFS:25/teu',
    notes='Incl DTHC, PAD',
    clauses=ISC_CLAUSES))

lines.append(row('Bangladesh','CHATTOGRAM',800,1000,'2026-04-16','2026-04-30',
    surcharges='EFS:25/teu',
    notes='Incl DTHC',
    clauses=ISC_CLAUSES))

lines.append(row('Maldives','MALE',1650,1900,'2026-04-16','2026-04-30',
    surcharges='EFS:25/teu',
    notes='Incl PAD, DOF',
    clauses=ISC_CLAUSES))

lines.append("")

# Summary
total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
