import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL = 'MSC'
OC = 'India'
OP = 'NHAVA SHEVA'

GLOBAL_CLAUSES = (
    "MSC rate sheet updated 30-Apr-2026; Mumbai pickup and Nhava Sheva loading only"
    "|All surcharges VATOS and subject to change; EFS on VATOS"
    "|Flexi Bag Surcharge FTS USD 14/cntr"
    "|USD 50 additional for all Annex B commodities (vegetal fibers/carbon/seed cakes/soya/animal feed/rubber etc.)"
    "|Freight components/ancillaries subject to GST as applicable"
    "|Validity as per Gate In date"
)

def row(dc, dp, r20, r40, vf, vt, cur='USD', via='', surcharges='', notes='', extra_clauses=''):
    cl = (GLOBAL_CLAUSES + ('|' + extra_clauses if extra_clauses else '')).replace("'", "''")
    v  = f"'{via}'" if via else 'NULL'
    s  = f"'{surcharges.replace(chr(39), chr(39)+chr(39))}'" if surcharges else 'NULL'
    n  = f"'{notes.replace(chr(39), chr(39)+chr(39))}'" if notes else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{dc}','{dp}',"
        f"'{cur}',{r20},{r40},'{vf}','{vt}',{v},{s},{n},'{cl}',1,'SYSTEM',GETDATE(),GETDATE());"
    )

lines = []
lines.append("-- ================================================================")
lines.append("-- MSC - May 2026 Rate Sheet (Updated 30-Apr-2026)")
lines.append("-- Origin: Mumbai Pickup / Nhava Sheva Loading")
lines.append("-- Covers: Red Sea, West Africa, SAEC, SAWC, Central America,")
lines.append("--         Caribbean, Canada, Mexico, North Africa, East Africa,")
lines.append("--         South Africa, Indian Ocean, Australia/NZ/Pacific,")
lines.append("--         USWC, USEC")
lines.append("-- Note: Red Sea ports without base rates (KAP/Jeddah/Port Sudan/")
lines.append("--       Al Sokhna/Aqaba/Djibouti/Aden/Mukalla) skipped - no rate")
lines.append("--       shown in source; check with MSC sales for current rates.")
lines.append("-- Note: Vancouver (Canada) skipped - no base rate shown.")
lines.append("-- Note: Middle East/ISC ports - all 'check with sales person'.")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# RED SEA
# Only Mogadishu and Berbera have explicit base rates
# ============================================================
lines.append("-- ======== RED SEA ========")
lines.append("-- Note: KAP/Jeddah/Port Sudan/Al Sokhna/Aqaba/Djibouti/Aden/Mukalla")
lines.append("--       have no base rates in source sheet - skipped, check with MSC sales")
lines.append("")

RS_CL = "Red Sea trade; RA R36321010000651"

lines.append(row('Somalia','MOGADISHU',1445,1790,'2026-05-01','2026-05-15',
    surcharges='PSS:300/cntr;EOS:incl;EFS:155/teu',
    notes='Incl EOS; PSS $300/cntr prepaid; EFS $155/teu',
    extra_clauses=RS_CL))

lines.append(row('Somalia','BERBERA',1100,1900,'2026-05-01','2026-05-31',
    surcharges='OCC:incl;CAC:incl;EFS:83/teu',
    notes='Incl OCC and CAC; std freetime at POD (RA R36325010001274); 21 days freetime + DMG $100/box prepaid (RA R36321010000651); EFS $83/teu',
    extra_clauses="Red Sea trade; RA R36325010001274 (std freetime) / R36321010000651 (21 days + DMG $100/box)"))

lines.append("")

# ============================================================
# WEST AFRICA (1-15 May 2026)
# All + EFS $230/TEU
# R36321010000629 (most) | R36321010000651 (Walvis Bay, Kribi)
# ============================================================
lines.append("-- ======== WEST AFRICA (1-15 May 2026) ========")
lines.append("")
VF_WA='2026-05-01'; VT_WA='2026-05-15'
WA_CL_629 = "West Africa trade; RA R36321010000629; 1 May-15 May 2026|EFS $230/TEU"
WA_CL_651 = "West Africa trade; RA R36321010000651; 1 May-15 May 2026|EFS $230/TEU"

wa = [
    ('Ivory Coast','ABIDJAN',2600,3000,'EFS:230/teu','','629'),
    ('Gambia','BANJUL',3400,4400,'EFS:230/teu','','629'),
    ('Guinea-Bissau','BISSAU',3600,4600,'EFS:230/teu','','629'),
    ('Guinea','CONAKRY',3800,5800,'CUS:75/20-105/40;CGS:1000/cntr;EFS:230/teu','CUS $75/20 $105/40 prepaid; CGS $1000/cntr','629'),
    ('Benin','COTONOU',2600,3000,'EFS:230/teu','','629'),
    ('Senegal','DAKAR',2800,3700,'PSS:230/cntr;EFS:230/teu','PSS $230/cntr','629'),
    ('Cameroon','DOUALA',2950,3600,'SCC:25/teu;EFS:230/teu','SCC $25/teu incl in rate','629'),
    ('Sierra Leone','FREETOWN',3100,4300,'EFS:230/teu','','629'),
    ('Gabon','LIBREVILLE',3600,4100,'CER:15/teu;EFS:230/teu','Carbon Emission Reduction Fee $15/teu on collect','629'),
    ('Angola','LOBITO',3550,4700,'AOA:75/box;EFS:230/teu','AOA $75/box','629'),
    ('Togo','LOME',2600,3000,'EFS:230/teu','','629'),
    ('Angola','LUANDA',3050,4100,'AOA:75/box;EFS:230/teu','AOA $75/box','629'),
    ('Cape Verde','MINDELO',3950,5200,'EFS:230/teu','','629'),
    ('Cape Verde','PRAIA',3950,5200,'EFS:230/teu','','629'),
    ('Liberia','MONROVIA',3100,4100,'EFS:230/teu','','629'),
    ('Angola','NAMIBE',3750,4800,'EFS:230/teu','','629'),
    ('Mauritania','NOUADHIBOU',3650,4700,'EFS:230/teu','','629'),
    ('Mauritania','NOUAKCHOTT',3650,4500,'EFS:230/teu','','629'),
    ('Nigeria','ONNE',3500,4200,'EFS:230/teu','','629'),
    ('Ivory Coast','SAN-PEDRO',3650,4600,'EFS:230/teu','','629'),
    ('Ghana','TAKORADI',3650,4600,'EFS:230/teu','','629'),
    ('Ghana','TEMA',2600,3000,'PAD:collect;EFS:230/teu','PAD on collect for port-to-port shipments','629'),
    ('Nigeria','TINCAN ISLAND',3100,3000,'EFS:230/teu','','629'),
    ('Nigeria','APAPA',3100,3000,'EFS:230/teu','','629'),
    ('Congo','POINTE NOIRE',3250,3900,'CUI:160/20-210/40;EFS:230/teu','CUI $160/20 $210/40 prepaid','629'),
    ('Congo (DRC)','MATADI',3450,4300,'CGS:210/box;EFS:230/teu','CGS $210/box','629'),
    ('Namibia','WALVIS BAY',3513,4313,'EFS:230/teu','','651'),
    ('Cameroon','KRIBI',3350,4000,'SCC:25/teu;EFS:230/teu','SCC $25/teu incl in rate','651'),
]
for dc,dp,r20,r40,surch,notes,ra in wa:
    cl = WA_CL_629 if ra=='629' else WA_CL_651
    lines.append(row(dc,dp,r20,r40,VF_WA,VT_WA,surcharges=surch,notes=notes,extra_clauses=cl))
lines.append("")

# ============================================================
# SAEC (1-31 May 2026, R36321010000629)
# All + EFS $242/teu (EUR for La Guaira & Puerto Cabello)
# Freetime RAs: R36321010000629=14d / R36324060000564=21d / R36324070000788=std
# ============================================================
lines.append("-- ======== SAEC - South America East Coast (1-31 May 2026) ========")
lines.append("")
VF_SAEC='2026-05-01'; VT_SAEC='2026-05-31'
SAEC_FT = "Freetime RAs: R36321010000629=14 days free at POD ($25/cntr DMG prepaid)|R36324060000564=21 days free at POD ($50/cntr DMG prepaid)|R36324070000788=standard freetime"
SAEC_CL = "SAEC trade; RA R36321010000629|EFS $242/TEU|" + SAEC_FT

saec = [
    ('Argentina','BUENOS AIRES',1400,1500,'USD','RPT:175/cntr;EFS:242/teu','RPT USD 175/cntr additional; DMG prepaid per freetime option'),
    ('Paraguay','ASUNCION',2400,2500,'USD','HPT:30/cntr;EFS:242/teu;EFS:40/teu','Via CAACUPEMI; HPT $30/cntr; EFS $40/teu prepaid eff 15 Apr'),
    ('Paraguay','PILAR',2400,2500,'USD','HPT:30/cntr;EFS:242/teu;EFS:40/teu','Via CAACUPEMI; HPT $30/cntr; EFS $40/teu prepaid eff 15 Apr'),
    ('Brazil','ITAJAI',1400,1500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Brazil','ITAPOA',1400,1500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Venezuela','LA GUAIRA',2900,2900,'EUR','DTHC:345/cntr;EFS:242/teu','EUR rates; all charges prepaid; DTHC EUR 345/cntr non-haz (incl SCS/WAR); ACD applicable; DMG prepaid per freetime option'),
    ('Brazil','MANAUS',2900,2900,'USD','EFS:242/teu','ACD applicable; DMG prepaid per freetime option'),
    ('Uruguay','MONTEVIDEO',1400,1500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Brazil','NAVEGANTES',1500,1650,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Brazil','PARANAGUA',1400,1500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Brazil','PECEM',2400,2500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Venezuela','PUERTO CABELLO',2900,2900,'EUR','DTHC:345/cntr;EFS:242/teu','EUR rates; all charges prepaid; DTHC EUR 345/cntr non-haz (incl SCS/WAR); ACD applicable; DMG prepaid per freetime option'),
    ('Brazil','RIO DE JANEIRO',1400,1500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Brazil','RIO GRANDE',1400,1500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Argentina','ROSARIO',2400,2500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Brazil','SALVADOR (DE BAHIA)',1400,1500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Brazil','SANTOS',1400,1500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Brazil','SUAPE',1400,1500,'USD','ETS:63/teu;FUEL:15/teu;EFS:242/teu','ETS $63/teu; Fuel EU $15/teu; ACD applicable; DMG prepaid per freetime option'),
    ('Brazil','VILA DO CONDE',2800,2900,'USD','ETS:63/teu;FUEL:15/teu;EFS:242/teu','ETS $63/teu; Fuel EU $15/teu; ACD applicable; DMG prepaid per freetime option'),
    ('Brazil','VITORIA',2400,2500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
    ('Argentina','ZARATE',2400,2500,'USD','EFS:242/teu','DMG prepaid per freetime option'),
]
for dc,dp,r20,r40,cur,surch,notes in saec:
    lines.append(row(dc,dp,r20,r40,VF_SAEC,VT_SAEC,cur=cur,surcharges=surch,notes=notes,extra_clauses=SAEC_CL))
lines.append("")

# ============================================================
# SAWC (1-31 May 2026, R36321010000629)
# All + EFS $238/teu; ACD applicable
# Freetime RAs same as SAEC
# ============================================================
lines.append("-- ======== SAWC - South America West Coast (1-31 May 2026) ========")
lines.append("")
VF_SAWC='2026-05-01'; VT_SAWC='2026-05-31'
SAWC_CL = "SAWC trade; RA R36321010000629|EFS $238/TEU|ACD applicable|" + SAEC_FT

sawc = [
    ('Chile','ARICA',2700,2800,'EFS:238/teu','ACD applicable; DMG prepaid per freetime option'),
    ('Colombia','BUENAVENTURA',1700,1800,'ISPS:12/cntr;EFS:238/teu','ISPS $12/cntr; ACD applicable; DMG prepaid per freetime option'),
    ('Peru','CALLAO',1700,1800,'EFS:238/teu','ACD applicable; DMG prepaid per freetime option'),
    ('Colombia','CARTAGENA',1700,1800,'ISPS:12/cntr;EFS:238/teu','ISPS $12/cntr; ACD applicable; DMG prepaid per freetime option'),
    ('Chile','CORONEL',1700,1800,'EFS:238/teu','ACD applicable; DMG prepaid per freetime option'),
    ('Ecuador','GUAYAQUIL',1700,1800,'DTHC:prepaid;EFS:238/teu','DTHC on prepaid; ACD applicable; DMG prepaid per freetime option'),
    ('Chile','IQUIQUE',2700,2800,'EFS:238/teu','ACD applicable; DMG prepaid per freetime option'),
    ('Peru','PAITA',2900,3000,'EFS:238/teu','ACD applicable; DMG prepaid per freetime option'),
    ('Chile','SAN ANTONIO',1700,1800,'EFS:238/teu','ACD applicable; DMG prepaid per freetime option'),
]
for dc,dp,r20,r40,surch,notes in sawc:
    lines.append(row(dc,dp,r20,r40,VF_SAWC,VT_SAWC,surcharges=surch,notes=notes,extra_clauses=SAWC_CL))
lines.append("")

# ============================================================
# CENTRAL AMERICA (1-31 May 2026, R36320090000323)
# ============================================================
lines.append("-- ======== CENTRAL AMERICA (1-31 May 2026, RA R36320090000323) ========")
lines.append("")
VF_CA='2026-05-01'; VT_CA='2026-05-31'
CA_CL = "Central America trade; RA R36320090000323; 1-31 May 2026"

ca = [
    ('Nicaragua','CORINTO',3700,4200,'ENS:collect;AMS:collect;PCS:40/teu;EFS:238/teu','ENS+AMS; PCS $40/teu; EFS $238/teu'),
    ('El Salvador','ACAJUTLA',2700,2900,'ENS:collect;WHA:50/teu;PAD:130/box;AMS:collect;PCS:40/teu;EFS:238/teu','ENS; WHA $50/teu; PAD $130/box; AMS; PCS $40/teu; EFS $238/teu'),
    ('Costa Rica','PUERTO CALDERA',2700,2900,'ENS:collect;ACD:collect;PCS:40/teu;EFS:238/teu','ENS; ACD; PCS $40/teu; EFS $238/teu'),
    ('Guatemala','PUERTO QUETZAL',2700,2900,'ENS:collect;PAD:130/box;SPD:12/box;AMS:collect;PCS:40/teu;EFS:238/teu','ENS; PAD $130/box; SPD $12/box; AMS; PCS $40/teu; EFS $238/teu'),
    ('Panama','RODMAN',2700,2900,'ENS:collect;SPD:15/box;AMS:collect;PCS:40/teu;EFS:238/teu','ENS; SPD $15/box; AMS; PCS $40/teu; EFS $238/teu'),
    ('Honduras','PUERTO CORTES',2700,2900,'PAD:185/box;SPD:25/box;ENS:collect;AMS:collect;EFS:211/teu','PAD $185/box; SPD $25/box; ENS; AMS; EFS $211/teu'),
    ('Costa Rica','MOIN',2700,2900,'ENS:collect;AMS:collect;CUS:60/bl;EFS:211/teu','ENS; AMS; CUS $60/BL; EFS $211/teu'),
    ('Guatemala','PUERTO BARRIOS',2700,2900,'PAD:130/box;SPD:12/box;ENS:collect;AMS:collect;EFS:211/teu','PAD $130/box; SPD $12/box; ENS; AMS; EFS $211/teu'),
    ('Panama','CRISTOBAL',2700,2900,'ENS:collect;SPD:8/box;AMS:collect;EFS:211/teu','ENS; SPD $8/box; AMS; EFS $211/teu'),
]
for dc,dp,r20,r40,surch,notes in ca:
    lines.append(row(dc,dp,r20,r40,VF_CA,VT_CA,surcharges=surch,notes=notes,extra_clauses=CA_CL))
lines.append("")

# ============================================================
# CARIBBEAN (1-31 May 2026, R36320090000323)
# ============================================================
lines.append("-- ======== CARIBBEAN (1-31 May 2026, RA R36320090000323) ========")
lines.append("")
VF_CB='2026-05-01'; VT_CB='2026-05-31'
CB_CL = "Caribbean trade; RA R36320090000323; 1-31 May 2026"

cb = [
    ('Haiti','PORT AU PRINCE',3200,3500,'ENS:collect;AMS:collect;DTHC:prepaid;EFS:211/teu','ENS; AMS; DTHC prepaid; std freetime at destination; EFS $211/teu'),
    ('Dominican Republic','CAUCEDO',2700,2900,'AMS:collect;ENS:collect;SPD:7/box;THC:collect;EFS:211/teu','AMS; ENS; SPD $7/box; THC collect; EFS $211/teu'),
    ('Trinidad and Tobago','PORT OF SPAIN',3100,3300,'ENS:collect;AMS:collect;DTHC:prepaid;EFS:211/teu','ENS; AMS; DTHC prepaid; std freetime at destination; EFS $211/teu'),
    ('Jamaica','KINGSTON',3100,3300,'AMS:collect;ENS:collect;CUI:10/box;DTHC:collect;EFS:211/teu','AMS; ENS; CUI $10/box; DTHC collect; EFS $211/teu'),
    ('Dominican Republic','RIO HAINA',3500,3600,'AMS:collect;ENS:collect;SPD:7/box;DTHC:collect;EFS:211/teu','AMS; ENS; SPD $7/box; DTHC collect; EFS $211/teu'),
    ('Bahamas','NASSAU',3500,3600,'AMS:collect;ENS:collect;SPD:100/box;DTHC:collect;WHA:5/ton;TUG:35/box;EFS:211/teu','AMS; ENS; SPD $100/box; DTHC collect; WHA $5/ton; TUG $35/box; EFS $211/teu'),
    ('Bahamas','FREEPORT',3500,3600,'AMS:collect;ENS:collect;SPD:25/box;DTHC:collect;EFS:211/teu','AMS; ENS; SPD $25/box; DTHC collect; EFS $211/teu'),
    ('Barbados','BRIDGETOWN',4500,5000,'AMS:collect;ENS:collect;PAD:100/teu;LOF:10/box;EFS:211/teu','AMS; ENS; PAD $100/teu; LOF $10/box; EFS $211/teu'),
    ('Suriname','PARAMARIBO',4500,5000,'ENS:collect;WHA:92/teu;AMS:collect;THC:collect;DRT:collect;EFS:211/teu','ENS; WHA $92/teu; AMS; THC collect; DRT collect; EFS $211/teu'),
    ('Guyana','GEORGETOWN',4200,4600,'ENS:collect;SPD:6/20-8/40;THC:collect;PAD:90/20-150/40;AMS:collect;EFS:211/teu','ENS; SPD $6/20 $8/40; THC collect; PAD $90/20 $150/40; AMS; EFS $211/teu'),
]
for dc,dp,r20,r40,surch,notes in cb:
    lines.append(row(dc,dp,r20,r40,VF_CB,VT_CB,surcharges=surch,notes=notes,extra_clauses=CB_CL))
lines.append("")

# ============================================================
# CANADA (1-31 May 2026, R36320060000719)
# Vancouver skipped - no base rate in source
# ============================================================
lines.append("-- ======== CANADA (1-31 May 2026, RA R36320060000719) ========")
lines.append("-- Note: Vancouver skipped - no base rate shown; additionals: AMS+SPD+FUE $18/teu+EFS $418/teu")
lines.append("")
VF_CAN='2026-05-01'; VT_CAN='2026-05-31'
CAN_CL = "Canada trade; RA R36320060000719; 1-31 May 2026"

lines.append(row('Canada','MONTREAL',3150,3100,VF_CAN,VT_CAN,
    surcharges='AMS:collect;SPD:collect;LWS:150/teu;EFS:211/teu',
    notes='AMS; SPD collect; Low Water Surcharge LWS $150/teu for Montreal; EFS $211/teu',
    extra_clauses=CAN_CL))
lines.append(row('Canada','HALIFAX',3150,3100,VF_CAN,VT_CAN,
    surcharges='AMS:collect;SPD:collect;EFS:211/teu',
    notes='AMS; SPD collect; EFS $211/teu',
    extra_clauses=CAN_CL))
lines.append(row('Canada','TORONTO',3250,3200,VF_CAN,VT_CAN,
    surcharges='AMS:collect;SPD:collect;LWS:150/teu;EFS:211/teu',
    notes='AMS; SPD collect; Max wt 47900LBS/20 60000LBS/40HC (without OVW); max permissible 55000LBS/20 65000LBS/40HC (with OVW); LWS $150/teu if routed via Montreal; EFS $211/teu',
    extra_clauses=CAN_CL))
lines.append("")

# ============================================================
# MEXICO (1-31 May 2026, R36320060000719)
# ============================================================
lines.append("-- ======== MEXICO (1-31 May 2026, RA R36320060000719) ========")
lines.append("")
VF_MEX='2026-05-01'; VT_MEX='2026-05-31'
MEX_CL = "Mexico trade; RA R36320060000719; 1-31 May 2026"

mex = [
    ('Mexico','VERACRUZ',2300,2400,'AMS:collect;EFS:211/teu','AMS; EFS $211/teu'),
    ('Mexico','ALTAMIRA',2300,2400,'AMS:collect;EFS:211/teu','AMS; EFS $211/teu'),
    ('Mexico','MANZANILLO',2300,2500,'AMS:collect;PCS:40/teu;EFS:238/teu','AMS; PCS $40/teu; EFS $238/teu'),
    ('Mexico','LAZARO CARDENAS',2300,2500,'AMS:collect;PCS:40/teu;EFS:238/teu','AMS; PCS $40/teu; EFS $238/teu'),
]
for dc,dp,r20,r40,surch,notes in mex:
    lines.append(row(dc,dp,r20,r40,VF_MEX,VT_MEX,surcharges=surch,notes=notes,extra_clauses=MEX_CL))
lines.append("")

# ============================================================
# NORTH AFRICA (1-31 May 2026)
# All: ETS $69/teu + FUEL EU $16/teu + EFS $167/teu
# Freetime: R36324060000564=21 days free + DMG $50/cntr prepaid | R36324070000788=std
# ============================================================
lines.append("-- ======== NORTH AFRICA (1-31 May 2026) ========")
lines.append("")
VF_NA='2026-05-01'; VT_NA='2026-05-31'
NA_FT = "Freetime: R36324060000564=21 days free at POD + DMG $50/cntr prepaid|R36324070000788=standard freetime"
NA_CL = "North Africa trade; 1-31 May 2026|ETS $69/teu; Fuel EU $16/teu; EFS $167/teu|" + NA_FT

na = [
    ('Morocco','AGADIR',3200,3300,'ETS:69/teu;FUEL:16/teu;EFS:167/teu','ETS $69/teu; Fuel EU $16/teu; EFS $167/teu',''),
    ('Algeria','ALGIERS',2700,2800,'ETS:69/teu;PSS:150/cntr;CGS:400/cntr;FUEL:16/teu;EFS:167/teu','ETS $69/teu; PSS $150/cntr; CGS $400/cntr; Fuel EU $16/teu; EFS $167/teu',''),
    ('Algeria','ANNABA',2700,2800,'ETS:69/teu;PSS:150/cntr;CGS:400/cntr;FUEL:16/teu;EFS:167/teu','ETS $69/teu; PSS $150/cntr; CGS $400/cntr; Fuel EU $16/teu; EFS $167/teu',''),
    ('Algeria','BEJAIA',2700,2800,'ETS:69/teu;PSS:150/cntr;CGS:400/cntr;FUEL:16/teu;EFS:167/teu','ETS $69/teu; PSS $150/cntr; CGS $400/cntr; Fuel EU $16/teu; EFS $167/teu',''),
    ('Libya','BENGHAZI',2750,2850,'ETS:69/teu;CGS:400/cntr;FUEL:16/teu;EFS:167/teu','WRS incl in rate; ETS $69/teu; CGS $400/cntr; Fuel EU $16/teu; EFS $167/teu','WRS inclusive'),
    ('Morocco','CASABLANCA',2700,2800,'ETS:69/teu;PSS:150/cntr;FUEL:16/teu;EFS:167/teu','ETS $69/teu; PSS $150/cntr; Fuel EU $16/teu; EFS $167/teu',''),
    ('Libya','KHOMS',2750,2850,'ETS:69/teu;FUEL:16/teu;EFS:167/teu','WRS incl in rate; ETS $69/teu; Fuel EU $16/teu; EFS $167/teu','WRS inclusive'),
    ('Libya','MISURATA',2750,2850,'ETS:69/teu;FUEL:16/teu;EFS:167/teu','WRS incl in rate; ETS $69/teu; Fuel EU $16/teu; EFS $167/teu','WRS inclusive'),
    ('Morocco','NADOR',3400,3500,'ETS:69/teu;FUEL:16/teu;EFS:167/teu','ETS $69/teu; Fuel EU $16/teu; EFS $167/teu',''),
    ('Algeria','ORAN',2700,2800,'ETS:69/teu;PSS:150/cntr;CGS:400/cntr;FUEL:16/teu;EFS:167/teu','ETS $69/teu; PSS $150/cntr; CGS $400/cntr; Fuel EU $16/teu; EFS $167/teu',''),
    ('Algeria','SKIKDA',2700,2800,'ETS:69/teu;PSS:150/cntr;CGS:400/cntr;FUEL:16/teu;EFS:167/teu','ETS $69/teu; PSS $150/cntr; CGS $400/cntr; Fuel EU $16/teu; EFS $167/teu',''),
    ('Libya','TRIPOLI',2700,2800,'ETS:69/teu;FUEL:16/teu;EFS:167/teu','ETS $69/teu; Fuel EU $16/teu; EFS $167/teu',''),
    ('Tunisia','TUNIS',2700,2800,'ETS:69/teu;PSS:150/cntr;FUEL:16/teu;EFS:167/teu','ETS $69/teu; PSS $150/cntr; Fuel EU $16/teu; EFS $167/teu',''),
]
for dc,dp,r20,r40,surch,notes,xtra in na:
    cl = NA_CL + ('|' + xtra if xtra else '')
    lines.append(row(dc,dp,r20,r40,VF_NA,VT_NA,surcharges=surch,notes=notes,extra_clauses=cl))
lines.append("")

# ============================================================
# EAST AFRICA (1-15 May 2026, R36321010000651)
# ============================================================
lines.append("-- ======== EAST AFRICA (1-15 May 2026, RA R36321010000651) ========")
lines.append("")
VF_EA='2026-05-01'; VT_EA='2026-05-15'
EA_CL = "East Africa trade; RA R36321010000651; 1-15 May 2026|EOS inclusive"

ea = [
    ('Kenya','MOMBASA',1645,1790,'SPD:6/cntr;EOS:incl;EFS:155/teu','SPD $6/cntr; Incl EOS; EFS $155/teu'),
    ('Tanzania','DAR ES SALAAM',1745,1890,'TCFB:collect;EOS:incl;EFS:155/teu','TCFB collect additional; Incl EOS; EFS $155/teu'),
    ('Tanzania','TANGA',2345,2690,'TCFB:collect;EOS:incl;EFS:155/teu','TCFB collect additional; Incl EOS; EFS $155/teu'),
    ('Tanzania','ZANZIBAR',2645,3490,'PSS:700/cntr;EOS:incl;EFS:155/teu','PSS $700/cntr prepaid; Incl EOS; EFS $155/teu'),
]
for dc,dp,r20,r40,surch,notes in ea:
    lines.append(row(dc,dp,r20,r40,VF_EA,VT_EA,surcharges=surch,notes=notes,extra_clauses=EA_CL))
lines.append("")

# ============================================================
# SOUTH AFRICA (1-15 May 2026, R36321010000651)
# ============================================================
lines.append("-- ======== SOUTH AFRICA (1-15 May 2026, RA R36321010000651) ========")
lines.append("")
SA_CL = "South Africa trade; RA R36321010000651; 1-15 May 2026"

sa = [
    ('South Africa','DURBAN',1613,2013,'CDD:30/bl;EFS:125/teu','CDD $30/BL; EFS $125/teu'),
    ('South Africa','CAPE TOWN',1913,2413,'CDD:30/bl;EFS:125/teu','CDD $30/BL; EFS $125/teu'),
    ('South Africa','COEGA',1913,2413,'CDD:30/bl;EFS:125/teu','CDD $30/BL; EFS $125/teu'),
]
for dc,dp,r20,r40,surch,notes in sa:
    lines.append(row(dc,dp,r20,r40,VF_EA,VT_EA,surcharges=surch,notes=notes,extra_clauses=SA_CL))
lines.append("")

# ============================================================
# INDIAN OCEAN (1-15 May 2026, R36321010000651)
# FOR INLAND CARGO: DTHC PREPAID | MOZAMBIQUE: DTHC PREPAID
# ============================================================
lines.append("-- ======== INDIAN OCEAN (1-15 May 2026, R36321010000651) ========")
lines.append("-- Note: For inland cargo DTHC will be prepaid; Mozambique ports: DTHC prepaid")
lines.append("")
IO_CL = "Indian Ocean trade; RA R36321010000651; 1-15 May 2026|For inland cargo DTHC prepaid"
MOZ_CL = IO_CL + "|Mozambique: DTHC prepaid"

io = [
    ('Madagascar','TAMATAVE',1575,1950,'PAD:adtl;EOS:incl;EFS:125/teu','PAD additional; Incl EOS; EFS $125/teu',IO_CL),
    ('Mauritius','PORT LOUIS',1475,1850,'EOS:incl;EFS:125/teu','Incl EOS; EFS $125/teu',IO_CL),
    ('Madagascar','MAJUNGA',2475,3050,'EOS:incl;EFS:125/teu','Incl EOS; EFS $125/teu',IO_CL),
    ('Madagascar','DIEGO SUAREZ',2475,3050,'CDD:30/bl;EOS:incl;EFS:125/teu','CDD $30/BL; Incl EOS; EFS $125/teu',IO_CL),
    ('Reunion','POINTE DE GALETS',2375,3350,'CDD:30/bl;EOS:incl;EFS:125/teu','CDD $30/BL; Incl EOS; EFS $125/teu',IO_CL),
    ('Comoros','MORONI',2825,4050,'CUI:collect;SPD:collect;EOS:incl;EFS:125/teu','CUI collect; SPD collect; Incl EOS; EFS $125/teu',IO_CL),
    ('Mayotte','LONGONI',2475,3050,'CDD:30/bl;EOS:incl;EFS:125/teu','CDD $30/BL; Incl EOS; EFS $125/teu',IO_CL),
    ('Mozambique','BEIRA',1945,2390,'EOS:500/teu;CGS:incl;EFS:155/teu','EOS $500/teu; Incl CGS; EFS $155/teu; DTHC prepaid',MOZ_CL),
    ('Mozambique','NACALA',1945,2390,'EOS:500/teu;EFS:155/teu','EOS $500/teu; EFS $155/teu; DTHC prepaid',MOZ_CL),
    ('Mozambique','MAPUTO',1895,2290,'SPD:10/cntr;EOS:500/teu;EFS:155/teu','SPD $10/cntr; EOS $500/teu; EFS $155/teu; DTHC prepaid',MOZ_CL),
]
for dc,dp,r20,r40,surch,notes,cl in io:
    lines.append(row(dc,dp,r20,r40,VF_EA,VT_EA,surcharges=surch,notes=notes,extra_clauses=cl))
lines.append("")

# ============================================================
# AUSTRALIA / NEW ZEALAND / PACIFIC (1-15 May 2026, R36321010000263)
# HAZ PACKING GROUP I NOT ACCEPTED; all + EFS $100/teu
# ============================================================
lines.append("-- ======== AUSTRALIA / NEW ZEALAND / PACIFIC (1-15 May 2026, R36321010000263) ========")
lines.append("")
ANZ_CL = "Australia/NZ/Pacific trade; RA R36321010000263; 1-15 May 2026|HAZ Packing Group I shipments NOT accepted|EFS $100/TEU"

anz = [
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
for dc,dp,r20,r40 in anz:
    lines.append(row(dc,dp,r20,r40,VF_EA,VT_EA,
        surcharges='EFS:100/teu',
        notes='HAZ Packing Group I NOT accepted; EFS $100/teu',
        extra_clauses=ANZ_CL))
lines.append("")

# ============================================================
# USWC (1-14 May 2026, R36320100000386)
# VALID NON HAZ ONLY; HAZ on case-by-case
# All + CUC $110/box + OTHC + LOCALS + DOCS + AMS + EFS $418/teu
# ============================================================
lines.append("-- ======== USWC (1-14 May 2026, RA R36320100000386) ========")
lines.append("-- VALID FOR NON HAZ CARGO ONLY; HAZ rate case-by-case")
lines.append("")
VF_US='2026-05-01'; VT_US='2026-05-14'
USWC_CL = "USWC trade; RA R36320100000386; 1-14 May 2026|Valid for non-HAZ cargo only; HAZ rate to be checked case-by-case|CUC $110/box; OTHC; LOCALS; DOCS; AMS applicable|EFS $418/TEU"

uswc = [
    ('USA','LOS ANGELES/LONG BEACH',1900,2100,'CUC:110/box;OTHC:collect;AMS:collect;EFS:418/teu','CUC $110/box; OTHC; LOCALS; DOCS; AMS; EFS $418/teu'),
    ('USA','SEATTLE',1900,2100,'CUC:110/box;OTHC:collect;AMS:collect;EFS:418/teu','CUC $110/box; OTHC; LOCALS; DOCS; AMS; EFS $418/teu'),
    ('USA','OAKLAND',1900,2100,'CUC:110/box;OTHC:collect;AMS:collect;EFS:418/teu','CUC $110/box; OTHC; LOCALS; DOCS; AMS; EFS $418/teu'),
]
for dc,dp,r20,r40,surch,notes in uswc:
    lines.append(row(dc,dp,r20,r40,VF_US,VT_US,surcharges=surch,notes=notes,extra_clauses=USWC_CL))
lines.append("")

# ============================================================
# USEC (1-14 May 2026, R36320100000386)
# VALID NON HAZ ONLY; HAZ on case-by-case
# All + CUC $110/box + OTHC + LOCALS + DOCS + AMS + EFS (varies by port)
# ============================================================
lines.append("-- ======== USEC (1-14 May 2026, RA R36320100000386) ========")
lines.append("-- VALID FOR NON HAZ CARGO ONLY; HAZ rate case-by-case")
lines.append("")
USEC_CL = "USEC trade; RA R36320100000386; 1-14 May 2026|Valid for non-HAZ cargo only; HAZ rate to be checked case-by-case|CUC $110/box; OTHC; LOCALS; DOCS; AMS applicable"

usec = [
    ('USA','NEW YORK',2175,2400,'CUC:110/box;CFC:14.05/teu;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; CFC $14.05/teu; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','NORFOLK',2175,2400,'CUC:110/box;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','CHARLESTON',2175,2400,'CUC:110/box;CFC:14.05/teu;LCF:13.39/cntr;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; CFC $14.05/teu; LCF $13.39/cntr; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','SAVANNAH',2175,2400,'CUC:110/box;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','HOUSTON',2775,3050,'CUC:110/box;WHA:collect;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; WHA; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','BALTIMORE',2775,3050,'CUC:110/box;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','NEW ORLEANS',2975,3200,'CUC:110/box;WHA:collect;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; WHA; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','PORT EVERGLADES',2775,3050,'WHA:collect;OTHC:collect;AMS:collect;EFS:211/teu','WHA; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','PHILADELPHIA',3175,3400,'CUC:110/box;WHA:collect;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; WHA; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','BOSTON',3175,3400,'CUC:110/box;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','MOBILE',2975,3200,'CUC:110/box;WHA:collect;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; WHA; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
    ('USA','JACKSONVILLE',2975,3200,'CUC:110/box;WHA:collect;OTHC:collect;AMS:collect;EFS:211/teu','CUC $110/box; WHA; OTHC; LOCALS; DOCS; AMS; EFS $211/teu'),
]
for dc,dp,r20,r40,surch,notes in usec:
    lines.append(row(dc,dp,r20,r40,VF_US,VT_US,surcharges=surch,notes=notes,extra_clauses=USEC_CL))
lines.append("")
lines.append("-- Note: Middle East/ISC - all ports 'check with respective sales person'; no rates inserted.")
lines.append("--   Colombo: incl DTHC+PAD + EFS $46/teu | Chattogram: incl DTHC + EFS $46/teu")
lines.append("--   Male: incl PAD+DOF + EFS $46/teu | RA R36322080002389")
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
