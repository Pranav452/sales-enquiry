import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OC = 'India'
OP = 'NHAVA SHEVA'
SL = 'ONE'
VF = '2026-05-01'
VT = '2026-05-15'
PDF_URL = 'https://www.one-line.com/en/advanced-page/one-quote'

CLAUSES = (
    "FAK CY/CY non-haz rates; Freight prepaid"
    "|Rates incl EBS/ISPS/PSS/ECA (ECA for Europe only)"
    "|HEA: USD 300/20GP (net wt >= 16T, Europe/MED); USD 600/20GP (net wt >= 18T, MED only)"
    "|USD 50/TEU for 14 days freetime detention at destination"
    "|FGP USD 100/cntr for food grade containers only"
    "|DET/booking cancellation charges apply for returned/empty offloaded containers"
    "|Rates applicable as per Gate In date of container"
    "|Sub to inventory and space availability"
    "|IOX-Europe / IOM-MED service via ONE-LINE"
    "|https://www.one-line.com/en/advanced-page/one-quote"
)

NOTES_EUR = "Incl EBS/ISPS/PSS/ECA; OBS $117/teu; EES $95/teu; SLF $10; EFS $160/teu; ESD $35/BL; THC+BL+HEA extra; IOX service"
NOTES_MED = "Incl EBS/ISPS/PSS (no ECA); OBS $119/teu; EES $182/teu; SLF $10; EFS $160/teu; ESD $35/BL; THC+BL+HEA extra; IOM service"

SURCH_EUR = "OBS:117/teu;EES:95/teu;SLF:10/cntr;EFS:160/teu;ESD:35/bl;THC:collect;BL:collect;HEA:collect"
SURCH_MED = "OBS:119/teu;EES:182/teu;SLF:10/cntr;EFS:160/teu;ESD:35/bl;THC:collect;BL:collect;HEA:collect"

def row(dc, dp, r20, r40, surcharges, notes):
    cl = CLAUSES.replace("'", "''")
    s  = surcharges.replace("'", "''")
    n  = notes.replace("'", "''")
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{dc}','{dp}',"
        f"'USD',{r20},{r40},'{VF}','{VT}',NULL,'{s}','{n}','{cl}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());"
    )

lines = []
lines.append("-- ============================================================")
lines.append("-- ONE (Ocean Network Express) - Europe & MED Rates May 1H 2026")
lines.append("-- Validity: 01-15 May 2026 (NSA Handover / Gate In date)")
lines.append("-- Origin: Nhava Sheva | Route: IOX (Europe) / IOM (MED)")
lines.append("-- Inclusive: EBS, ISPS, PSS, ECA (Europe only)")
lines.append("-- Surcharges extra: OBS, EES, SLF, EFS, ESD, THC, BL, HEA")
lines.append("-- HEA: $300/20GP >=16T (Europe/MED); $600/20GP >=18T (MED)")
lines.append("-- FGP: $100/cntr food grade only")
lines.append("-- DET freetime: $50/TEU for 14-day detention at destination")
lines.append("-- ============================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

lines.append("-- ======== EUROPE (IOX service) - AMS / HAM / RTM ========")
lines.append("")
lines.append(row('Netherlands', 'ROTTERDAM', 1435, 1160, SURCH_EUR, NOTES_EUR))
lines.append(row('Belgium',     'ANTWERP',   1435, 1160, SURCH_EUR, NOTES_EUR))
lines.append(row('Germany',     'HAMBURG',   1435, 1160, SURCH_EUR, NOTES_EUR))
lines.append("")

lines.append("-- ======== MED (IOM service) - BCN / VLC / GOA ========")
lines.append("")
lines.append(row('Spain', 'BARCELONA', 1645, 1285, SURCH_MED, NOTES_MED))
lines.append(row('Spain', 'VALENCIA',  1645, 1285, SURCH_MED, NOTES_MED))
lines.append(row('Italy', 'GENOVA',    1645, 1285, SURCH_MED, NOTES_MED))
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
