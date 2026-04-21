import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SHIP = 'ONE'
OC = 'India'
OP = 'NHAVA SHEVA'
CUR = 'USD'
CB = 'SYSTEM'

def ins(oc, op, dc, dp, r20, r40, vf, vt, via='', surcharges='', notes='', clauses=''):
    v = f"'{via}'" if via else 'NULL'
    s = f"'{surcharges}'" if surcharges else 'NULL'
    n = notes.replace("'","''")
    c = clauses.replace("'","''")
    r20v = str(r20) if r20 is not None else 'NULL'
    r40v = str(r40) if r40 is not None else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SHIP}','{oc}','{op}','{dc}','{dp}',"
        f"'{CUR}',{r20v},{r40v},'{vf}','{vt}',{v},{s},'{n}','{c}',1,'{CB}',GETDATE(),GETDATE());"
    )

out = []
out.append("-- ============================================================")
out.append("-- ONE (Ocean Network Express) - COMPILED EA+WA+RS MRG April 2026")
out.append("-- Origin: Nhava Sheva (INNSA), India")
out.append("-- Covers: IWE/WEW/WMW/AUS/NZS/CSE/LEW/LWE/EFW/WFW/ZFW trades")
out.append("-- ============================================================")
out.append("")
out.append("USE [manilal];")
out.append("GO")
out.append("")

# ============================================================
# IWE - INTRA-ASIA / WEST ASIA (April 2026, general validity)
# ============================================================
VF_IWE = '2026-04-01'
VT_IWE = '2026-04-30'

IWE_CL = (
    "CY/CY non-haz rates; flexitanks not accepted; bulk in loose stuffing not accepted|"
    "Bookings on feeder space via SIN subject to approval|"
    "Freight under prepaid terms|"
    "NOT applicable for lot shipments of Onion/Soya/Agri products/Raw Cotton|"
    "War Risk Surcharge USD 55/TEU|"
    "EFS USD 80/160 per 20/40 for dry (effective 24-03-2026)|"
    "EIS on collect basis for Manila North USD 402/803 per 20/40|"
    "No offer for Middle East due to restricted service: Jebel Ali/Dammam/Riyadh/Sharjah/Bahrain/Shuaiba/Ajman/Shuwaikh/Sohar/Hamad/Umm Qasr/Abu Dhabi|"
    "SIN T/S HAZ: PSA Group1/1D/2 USD 538/753; PSA Group1S/2S/2A/2B/2F USD 430/591; PSA Group3 USD 0|"
    "DG premium USD 150/300 per TEU (IMO Class 1-9 except Class 3 via SIN)"
)

# (dest_country, dest_port, r20, r40, via, notes, origin_port)
# origin_port allows ICD variants
iwe_rows = [
    # Brunei
    ('Brunei','MUARA',846,1367,'SINGAPORE','Incl: ISL,OBS,PSF,SLF; Subj: ARO,THL,THD,CMC,DOC,DOF',OP),
    # Indonesia
    ('Indonesia','PANJANG TERMINAL',335,745,'SINGAPORE','Incl: ISL,OBS,PSF,SLF; Subj: THL,THD,CFE,DOC,DOF; via JID service',OP),
    ('Indonesia','CIKARANG (DOOR)',740,905,'SINGAPORE','Incl: ISL,OBS,PSF,SLF; Subj: THL,THD,CFE,DOC,DOF; Truck delivery via Jakarta',OP),
    ('Indonesia','PALEMBANG',265,575,'SINGAPORE','Incl: ISL,OBS,PSF,SLF; Subj: THL,THD,CFE,DOC,DOF',OP),
    ('Indonesia','BELAWAN',150,200,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF',OP),
    ('Indonesia','JAKARTA',75,125,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF',OP),
    ('Indonesia','SEMARANG',195,250,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF',OP),
    ('Indonesia','SURABAYA',213,160,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CFE,DOC,DOF',OP),
    ('Indonesia','BALIKPAPAN',750,1375,'JAKARTA','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF; via Jakarta BRG',OP),
    # China - N.PRC
    ('China','DALIAN',260,300,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR',OP),
    ('China','XINGANG',5,5,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR',OP),
    ('China','QINGDAO',5,5,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR',OP),
    ('China','LIANYUNGANG',247,146,'SHANGHAI','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR; via Shanghai BRG',OP),
    # China - C.PRC
    ('China','SHANGHAI',5,5,'','Incl: ISL,PSF,SLF,OBS,PCO; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR',OP),
    ('China','NINGBO',5,5,'','Incl: ISL,PSF,SLF,OBS,PCO; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR',OP),
    ('China','NANTONG',145,50,'SHANGHAI','Incl: ISL,PSF,SLF,OBS,PCO; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR,PSE; via Shanghai BRG',OP),
    ('China','ZHANGJIAGANG',55,200,'SHANGHAI','Incl: ISL,PSF,SLF,OBS,PCO; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR,PSE; via Shanghai BRG',OP),
    ('China','WUHAN',80,300,'SHANGHAI','Incl: ISL,PSF,SLF,OBS,PCO; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR,PSE; via Shanghai BRG; 40HC rate: 25',OP),
    ('China','CHONGQING',685,485,'SHANGHAI','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR; via Shanghai BRG',OP),
    # China - S.PRC Guangdong
    ('China','NANSHA',83,135,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    ('China','GUANGZHOU',585,805,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR; via HKG BRG',OP),
    ('China','HUANGPU',25,50,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    ('China','JIANGMEN',100,75,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    ('China','RONGQI',50,185,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    ('China','SANSHAN',200,225,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    ('China','QINZHOU',206,365,'HONG KONG','Incl: ISL,OBS,PSF,SLF; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR; via HKG BRG; CIP service',OP),
    ('China','GAOLAN',202,445,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    ('China','BEIJIAO',25,50,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    ('China','GONGYI',100,150,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    ('China','XIAOLAN',15,25,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    ('China','ZHONGSHAN',15,25,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    ('China','ZHUHAI',15,25,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF; via HKG BRG',OP),
    # China - S.PRC Fujian
    ('China','FUZHOU',260,240,'HONG KONG','Incl: ISL,PSF,SLF,OBS,PCO; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR,PSE; via HKG BRG',OP),
    ('China','XIAMEN',195,260,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR; via HKG BRG; 40HC rate: 259',OP),
    # China - S.PRC Shenzhen
    ('China','SHEKOU',235,260,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR; via HKG BRG',OP),
    ('China','YANTIAN',215,265,'HONG KONG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,AMA,AMS,DOC,DOF,EIR; via HKG BRG',OP),
    # Hong Kong
    ('Hong Kong','HONG KONG',5,5,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF',OP),
    # Japan
    ('Japan','HAKATA',490,815,'SINGAPORE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD',OP),
    ('Japan','HIROSHIMA',485,306,'KOBE','Incl: ISL,OBS,PSF,SLF,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; via Kobe BRG; 40HC rate: 306',OP),
    ('Japan','KOBE',25,50,'SINGAPORE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD',OP),
    ('Japan','MATSUYAMA',465,480,'KOBE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; via Kobe BRG',OP),
    ('Japan','MIZUSHIMA',365,775,'KOBE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; via Kobe BRG',OP),
    ('Japan','MOJI',200,530,'KOBE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; via Kobe BRG',OP),
    ('Japan','NAGOYA',222,50,'SINGAPORE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; 40HC rate: 50',OP),
    ('Japan','NIIGATA',280,375,'BUSAN','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; via Singapore-Busan',OP),
    ('Japan','OITA',380,950,'','Incl: ISL,OBS,PSF,SLF,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD',OP),
    ('Japan','OSAKA',250,420,'KOBE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; via Kobe Truck',OP),
    ('Japan','SENDAI',690,659,'YOKOHAMA','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; via Yokohama BRG; 40HC rate: 660',OP),
    ('Japan','SHIBUSHI',510,745,'KOBE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; via Kobe BRG',OP),
    ('Japan','SHIMIZU',293,220,'SINGAPORE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; 40HC rate: 220',OP),
    ('Japan','TOMAKOMAI',285,495,'BUSAN','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; via Singapore-Busan',OP),
    ('Japan','TOKYO',205,220,'SINGAPORE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD',OP),
    ('Japan','YOKKAICHI',207,50,'SINGAPORE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; 40HC rate: 50',OP),
    ('Japan','YOKOHAMA',182,50,'SINGAPORE','Incl: ISL,PSF,SLF,OBS,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; 40HC rate: 50',OP),
    ('Japan','HACHINOHE',1052,1503,'BUSAN','Incl: ISL,OBS,PSF,SLF,YAS; Subj: THL,THD,AMA,AMS,DOC,DOF,CMD; via Singapore-Busan',OP),
    # Korea
    ('South Korea','BUSAN',5,10,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,CSC,DOC,DOF,WHA,LSF',OP),
    ('South Korea','INCHEON',75,5,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,CSC,DOC,DOF,WHA,LSF; 40ft rate: 5',OP),
    ('South Korea','KWANGYANG',10139,141,'SHANGHAI','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,CSC,DOC,DOF,WHA,LSF; via CIP-Shanghai-PS6; 20ft rate appears anomalous - verify',OP),
    # Taiwan
    ('Taiwan','KAOHSIUNG',110,255,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF',OP),
    ('Taiwan','KEELUNG',495,680,'KAOHSIUNG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF; via Kaohsiung Truck',OP),
    ('Taiwan','TAICHUNG',210,525,'KAOHSIUNG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF; via Kaohsiung Truck',OP),
    ('Taiwan','TAOYUAN',300,590,'KAOHSIUNG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF; via Kaohsiung Truck',OP),
    # Thailand
    ('Thailand','BANGKOK',99,50,'LAEM CHABANG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,CMC,DOC,DOF,RCR; via Laem Chabang BRG',OP),
    ('Thailand','LAEM CHABANG',20,30,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,CMC,DOC,DOF',OP),
    ('Thailand','LAT KRABANG (DOOR)',25,35,'LAEM CHABANG','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,CMC,DOC,DOF; Truck delivery via Laem Chabang',OP),
    ('Thailand','SONGKHLA',184,125,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,CMC,DOC,DOF',OP),
    # Vietnam
    ('Vietnam','HAIPHONG',70,100,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF,VVN,CCC,CMC',OP),
    ('Vietnam','HO CHI MINH',15,30,'HO CHI MINH (CAI MEP)','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF,VVN; via Cai Mep BRG',OP),
    ('Vietnam','HO CHI MINH (CAI MEP)',5,5,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF,VVN',OP),
    ('Vietnam','DANANG',435,470,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF,VVN',OP),
    # Malaysia
    ('Malaysia','PORT KLANG',5,10,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,DPC,EDI,DOC,DOF',OP),
    ('Malaysia','PENANG',115,150,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,DPC,EDI,DOC,DOF',OP),
    ('Malaysia','PASIR GUDANG',98,100,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,DPC,EDI,DOC,DOF',OP),
    ('Malaysia','KOTA KINABALU',748,1280,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,DPC,EDI,DOC,DOF',OP),
    ('Malaysia','KUCHING',720,1285,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CCC,DPC,EDI,DOC,DOF',OP),
    # Singapore
    ('Singapore','SINGAPORE',17,10,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,CMC,DOC,DOF',OP),
    # Philippines
    ('Philippines','MANILA',249,365,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,EIS,DOC,DOF,CCC; EIS on collect USD 402/803',OP),
    ('Philippines','CEBU',285,365,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,EIS,DOC,DOF,CCC',OP),
    ('Philippines','SUBIC',323,533,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,EIS,DOC,DOF,CCC',OP),
    ('Philippines','GENERAL SANTOS',395,8624,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,EIS,DOC,DOF,CCC; 40HC rate: 8623 - verify',OP),
    ('Philippines','BATANGAS',700,500,'SINGAPORE','Incl: PSF,SLF,OBS; Subj: ARO,THL,THD,EIS,DOC,DOF,CCC; via PS3+FDR',OP),
    # Cambodia
    ('Cambodia','PHNOM PENH',265,670,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF',OP),
    ('Cambodia','SIHANOUKVILLE',228,200,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,THD,DOC,DOF',OP),
    # Bangladesh
    ('Bangladesh','CHITTAGONG',850,1000,'COLOMBO','Incl: ISL,PSF,SLF,OBS,THD,CGD; Subj: THL,DOC,XDD,AMS; via Colombo',OP),
    ('Bangladesh','DHAKA (ICD)',1635,2615,'CHITTAGONG','Incl: ISL,PSF,SLF,OBS,THD,CGD; Subj: THL,DOC,XDD; via Chittagong BRG; 40HC rate: 2150',OP),
    # Sri Lanka
    ('Sri Lanka','COLOMBO',300,400,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,DOC,DOF',OP),
    # Myanmar
    ('Myanmar','YANGON',393,538,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: THL,DOC',OP),
    # Maldives
    ('Maldives','MALE',1367,2160,'COLOMBO','Incl: ISL,PSF,SLF,OBS; Subj: THL,LIO,DOC,DOF,EIR; via Colombo',OP),
    # Egypt
    ('Egypt','SOKHNA',1400,1800,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,DOC,EST,AMA; RGI service',OP),
    # Saudi Arabia - Jeddah only (others no offer)
    ('Saudi Arabia','JEDDAH',1250,1650,'','Incl: ISL,PSF,SLF,OBS; Subj: THL,DOC,FED,OCR,XDD; RGI service',OP),
    # ICD entries - note ICD origin
    ('Philippines','CEBU',90,5,'SINGAPORE','Incl: PSF,SLF,OBS; Subj: ARO,THL,THD,EIS,DOC,DOF,CCC; ICD origin: DEL1','NHAVA SHEVA (ICD DELHI)'),
    ('Philippines','BATANGAS',700,500,'SINGAPORE','Incl: PSF,SLF,OBS; Subj: ARO,THL,THD,EIS,DOC,DOF,CCC; ICD origin: DEL1','NHAVA SHEVA (ICD DELHI)'),
    ('Brunei','MUARA',796,1367,'SINGAPORE','Incl: ISL,OBS,PSF,SLF; Subj: ARO,THL,THD,CMC,DOC,DOF; ICD origin: DEL1','NHAVA SHEVA (ICD DELHI)'),
    ('South Korea','INCHEON',30,5,'SINGAPORE','Incl: ISL,PSF,SLF,OBS; Subj: ARO,THL,THD,CCC,CSC,DOC,DOF,WHA,LSF; ICD origin: DEL1','NHAVA SHEVA (ICD DELHI)'),
    ('Egypt','SOKHNA',1175,1510,'','Incl: ISL,PSF,SLF,OBS; Subj: ARO,THL,DOC,EST,AMA,EMS; ICD origin: ICD2','NHAVA SHEVA (ICD)'),
    ('Saudi Arabia','JEDDAH',1190,1650,'','Incl: ISL,PSF,SLF,OBS; Subj: ARO,THL,DOC,FED,OCR,XDD,EMS; ICD origin: ICD2','NHAVA SHEVA (ICD)'),
]

out.append("-- ============================================================")
out.append("-- IWE - Intra Asia / West Asia  (April 2026)")
out.append("-- ============================================================")
for row in iwe_rows:
    dc,dp,r20,r40,via,notes,op_port = row
    out.append(ins(OC, op_port, dc, dp, r20, r40, VF_IWE, VT_IWE, via=via, notes=notes, clauses=IWE_CL))
out.append("")

# ============================================================
# WEW - WEST EUROPE  (15-30 Apr 2026)
# ============================================================
VF_E = '2026-04-15'
VT_E = '2026-04-30'

WEW_SURCHARGES = 'OBS:117/teu;EES:95/teu;EFS:160/20ft 320/40ft;ESD:35/BL;CAF incl;CSS incl'
WEW_SURCHARGES_UK = 'OBS:117/teu;EFS:160/20ft 320/40ft;ESD:35/BL;CAF incl;CSS incl'
WEW_CL = (
    "WEW service via IOX|"
    "OBS USD 117/TEU subj to (not incl)|"
    "EES USD 95/TEU subj to (not incl, not applicable for UK ports)|"
    "EFS USD 160/320 per 20/40 for dry (eff 24-03-2026)|"
    "HEA: USD 300/20ft for EU (net wt >= 16MT)|"
    "DG surcharge USD 200/TEU|"
    "Food Grade Premium (FGP) USD 100/cntr|"
    "CAF and CSS are inclusive in rate|"
    "Standard freetime as per tariff"
)

# (dest_country, dest_port, r20, r40, via, is_uk)
wew_rows = [
    ('Belgium','ANTWERP',1735,1460,'',''),
    ('Germany','HAMBURG',1735,1460,'',''),
    ('Denmark','AALBORG',2160,2035,'',''),
    ('Denmark','AARHUS',1935,1660,'ANTWERP','via Antwerp SCX feeder'),
    ('Denmark','COPENHAGEN',1935,1660,'ANTWERP','via Antwerp SCX feeder'),
    ('Denmark','FREDERICIA',1935,1660,'HAMBURG','via Hamburg SC2 feeder'),
    ('Estonia','TALLINN',1985,1760,'ROTTERDAM','via Rotterdam FI2 feeder'),
    ('Spain','BILBAO',2275,2255,'ALGECIRAS','via Algeciras feeder; WHA applies'),
    ('Spain','GIJON',2275,2255,'ALGECIRAS','via Algeciras feeder; WHA applies'),
    ('Spain','VIGO',2275,2255,'ALGECIRAS','via Algeciras feeder; WHA applies'),
    ('Finland','HELSINKI',1885,1660,'ROTTERDAM','via Rotterdam FI2 feeder'),
    ('Finland','KOTKA',1885,1660,'ROTTERDAM','via Rotterdam FI2 feeder'),
    ('Finland','OULU',3095,3660,'','40HC rate: 3060'),
    ('Finland','RAUMA',1885,1660,'ANTWERP','via Antwerp SBX feeder'),
    ('France','LE HAVRE',1785,1560,'',''),
    ('United Kingdom','BELFAST',2435,1910,'ROTTERDAM','UK port - EES not applicable; via Rotterdam IRX feeder; LID applies'),
    ('United Kingdom','COATBRIDGE',2335,2040,'','UK port - EES not applicable'),
    ('United Kingdom','GRANGEMOUTH',2235,2140,'ROTTERDAM','UK port - EES not applicable; via Rotterdam UKE feeder'),
    ('United Kingdom','IMMINGHAM',2235,2260,'ROTTERDAM','UK port - EES not applicable; via Rotterdam UKE feeder; T/S NLRTM'),
    ('United Kingdom','SOUTHAMPTON',1735,1460,'','UK port - EES not applicable'),
    ('United Kingdom','SOUTH SHIELDS',2205,2340,'ROTTERDAM','UK port - EES not applicable; via Rotterdam UKE feeder'),
    ('United Kingdom','TEESPORT',2235,2140,'ROTTERDAM','UK port - EES not applicable; via Rotterdam UKE feeder'),
    ('Ireland','DUBLIN',2135,1910,'SOUTHAMPTON','via Southampton IRX feeder; LID applies'),
    ('Ireland','CORK',2135,1910,'SOUTHAMPTON','via Southampton IRX feeder; LID applies'),
    ('Lithuania','KLAIPEDA',1985,1760,'SOUTHAMPTON','via Southampton IBX feeder'),
    ('Latvia','RIGA',1985,1760,'SOUTHAMPTON','via Southampton IBX feeder'),
    ('Netherlands','ROTTERDAM',1735,1460,'',''),
    ('Norway','BERGEN',2535,2960,'',''),
    ('Norway','FREDRIKSTAD',2460,2460,'',''),
    ('Norway','KRISTIANSAND S.',2485,2660,'',''),
    ('Norway','LARVIK',2435,2585,'',''),
    ('Norway','OSLO',2685,2460,'',''),
    ('Poland','GDANSK',1785,1560,'SOUTHAMPTON','via Southampton IBX feeder'),
    ('Poland','GDYNIA',1785,1560,'ANTWERP','via Antwerp SBX feeder'),
    ('Portugal','LEIXOES',1885,1760,'ROTTERDAM','via Rotterdam IBX feeder; DDC applies; T/S NLRTM'),
    ('Portugal','LISBON',1885,1760,'ROTTERDAM','via Rotterdam LUX feeder; DDC applies; T/S NLRTM'),
    ('Sweden','AAHUS',2235,2010,'',''),
    ('Sweden','GOTHENBURG',1785,1560,'ANTWERP','via Antwerp SCX feeder'),
    ('Sweden','GAVLE',2035,2010,'ANTWERP','via Antwerp SBX feeder; 40HC rate: 1910'),
    ('Sweden','HELSINGBORG',1935,1710,'ANTWERP','via Antwerp SCX feeder'),
    ('Sweden','NORRKOPING',2985,3110,'',''),
    ('Sweden','SODERTALJE',2185,2160,'',''),
    ('Sweden','STOCKHOLM',2935,3160,'',''),
]

out.append("-- ============================================================")
out.append("-- WEW - West Europe  (15-30 Apr 2026)")
out.append("-- ============================================================")
for dc,dp,r20,r40,via,xnote in wew_rows:
    is_uk = 'United Kingdom' in dc or 'UK port' in xnote
    surcharges = WEW_SURCHARGES_UK if is_uk else WEW_SURCHARGES
    notes = 'Incl: CAF,CSS; Subj: OBS:117/teu,EES:95/teu(not UK),EFS,ESD,THL,THD,DOC,DOF,CMD'
    if xnote:
        notes += '; ' + xnote
    out.append(ins(OC, OP, dc, dp, r20, r40, VF_E, VT_E, via=via, surcharges=surcharges, notes=notes, clauses=WEW_CL))
out.append("")

# ============================================================
# WMW - MEDITERRANEAN  (15-30 Apr 2026)
# ============================================================
WMW_SURCHARGES = 'OBS:119/teu;EES:182/teu;EFS:160/20ft 320/40ft;ESD:35/BL;CAF incl;CSS incl'
WMW_CL = (
    "WMW service via IOM|"
    "OBS USD 119/TEU subj to|"
    "EES USD 182/TEU subj to|"
    "EFS USD 160/320 per 20/40 for dry (eff 24-03-2026)|"
    "HEA: USD 300/20ft for MED net wt >= 16MT; USD 600/20ft for MED net wt >= 18MT|"
    "DG surcharge USD 200/TEU|"
    "Food Grade Premium (FGP) USD 100/cntr|"
    "CAF and CSS inclusive in rate"
)

wmw_rows = [
    ('Albania','DURRES',1800,1800,'ALGECIRAS','via IOM; HEA applies; 40HC rate: 1800'),
    ('Bulgaria','BOURGAS',2525,2755,'PIRAEUS','via Piraeus-Istanbul-BT1 Black Sea feeder; EES applies'),
    ('Bulgaria','VARNA',2710,2400,'PIRAEUS','via Piraeus-Istanbul-BT1; EES applies'),
    ('Egypt','ALEXANDRIA',2125,1955,'PIRAEUS','via IOM-Piraeus-MD1; HEA applies'),
    ('Egypt','DAMIETTA',2025,1755,'PIRAEUS','via IOM-Piraeus-MD1; HEA applies'),
    ('Spain','ALGECIRAS',2025,1755,'','IOM direct; CCU,LOT,WHA applies'),
    ('Spain','BARCELONA',2025,1755,'','IOM direct; CCU,LOT,WHA applies'),
    ('Spain','VALENCIA',2025,1755,'','IOM direct; CCU,LOT,WHA applies'),
    ('France','FOS-SUR-MER',2025,1755,'GENOA','via IOM-Genoa MS2 feeder'),
    ('Greece','PIRAEUS',2025,1755,'','IOM direct'),
    ('Greece','THESSALONIKI',2125,1955,'PIRAEUS','via Piraeus IGX feeder'),
    ('Croatia','RIJEKA',2475,2655,'','IOM direct'),
    ('Israel','ASHDOD',2225,2155,'PIRAEUS','via IOM-Piraeus-AD1; HEA applies'),
    ('Israel','HAIFA',2225,2155,'PIRAEUS','via IOM-Piraeus-AD1; HEA applies'),
    ('Italy','ANCONA',2075,1855,'PIRAEUS','via IOM-Piraeus-AD1 Adriatic feeder; LID applies'),
    ('Italy','GENOA',2025,1755,'','IOM direct; LID applies'),
    ('Italy','LIVORNO',2225,2155,'',''),
    ('Italy','RAVENNA',2425,2455,'','via IOM; LID applies'),
    ('Italy','LA SPEZIA',2025,1755,'GENOA','via IOM-Genoa MS2 feeder; LID applies'),
    ('Italy','TRIESTE',2475,2555,'','IOM direct; LID applies'),
    ('Italy','VENICE',2125,1955,'PIRAEUS','via IOM-Piraeus-AD1 Adriatic feeder; LID applies'),
    ('Lebanon','BEIRUT',2175,2055,'PIRAEUS','via IOM-Piraeus-Damietta-EL2; HEA applies'),
    ('Morocco','CASABLANCA',3440,4540,'ALGECIRAS','via IOM-Algeciras-IMS feeder; HEA applies'),
    ('Morocco','TANGIER',2940,3540,'VALENCIA','via IOM-Valencia feeder; HEA applies'),
    ('Romania','CONSTANTA',2525,2755,'PIRAEUS','via Piraeus-Istanbul-BT3 Black Sea feeder'),
    ('Slovenia','KOPER',2075,1855,'PIRAEUS','via IOM-Piraeus-AD1 Adriatic feeder'),
    ('Turkey','ALIAGA',2075,1855,'PIRAEUS','via IOM-Piraeus-AEX; HEA applies'),
    ('Turkey','GEBZE',2075,1855,'','IOM direct; HEA applies'),
    ('Turkey','GEMLIK',2275,2255,'ALGECIRAS','via AEX service; 40HC rate: 2255'),
    ('Turkey','ISKENDERUN',2125,1955,'','IOM direct; HEA applies'),
    ('Turkey','ISTANBUL',2075,1855,'PIRAEUS','via IOM-Piraeus-MD1; HEA applies'),
    ('Turkey','IZMIT',2075,1855,'PIRAEUS','via IOM-Piraeus-MD1; HEA applies; T/S MD1'),
    ('Turkey','MERSIN',2075,1855,'PIRAEUS','via IOM-Piraeus-MD1; HEA applies'),
]

out.append("-- ============================================================")
out.append("-- WMW - Mediterranean  (15-30 Apr 2026)")
out.append("-- ============================================================")
for dc,dp,r20,r40,via,xnote in wmw_rows:
    notes = 'Incl: CAF,CSS; Subj: OBS:119/teu,EES:182/teu,EFS,ESD,THL,THD'
    if xnote:
        notes += '; ' + xnote
    out.append(ins(OC, OP, dc, dp, r20, r40, VF_E, VT_E, via=via, surcharges=WMW_SURCHARGES, notes=notes, clauses=WMW_CL))
out.append("")

# ============================================================
# AUS - AUSTRALIA  (15-30 Apr 2026)
# ============================================================
AUS_SURCHARGES = 'OBS incl;EFS:160/20ft 320/40ft'
AUS_CL = (
    "AUS service via Singapore|"
    "OBS inclusive in rate|"
    "EFS USD 160/320 per 20/40 for dry (eff 24-03-2026)|"
    "ISL USD 32/cntr; SLF USD 10/cntr incl|"
    "Flexi-tank add-on USD 100/TEU|"
    "Standard freetime at POD as per tariff"
)
aus_rows = [
    ('Australia','ADELAIDE',925,1850,'SINGAPORE','Incl: OBS,ISL,SLF; via PS3-SGSIN-AU1; EFS subj'),
    ('Australia','MELBOURNE/BRISBANE',925,1850,'SINGAPORE','Incl: OBS,ISL,SLF; via TIP-SGSIN-AU1; EFS subj; combined rate'),
    ('Australia','FREMANTLE',925,1850,'SINGAPORE','Incl: OBS,ISL,SLF; via PS3-SGSIN-WAU; EFS subj; T/S SGSIN'),
    ('Australia','SYDNEY',925,1850,'SINGAPORE','Incl: OBS,ISL,SLF; via NCI-SGSIN-AU1; EFS subj'),
]
out.append("-- ============================================================")
out.append("-- AUS - Australia  (15-30 Apr 2026)")
out.append("-- ============================================================")
for dc,dp,r20,r40,via,notes in aus_rows:
    out.append(ins(OC, OP, dc, dp, r20, r40, VF_E, VT_E, via=via, surcharges=AUS_SURCHARGES, notes=notes, clauses=AUS_CL))
out.append("")

# ============================================================
# NZS - NEW ZEALAND  (15-30 Apr 2026)
# ============================================================
NZS_SURCHARGES = 'OBS incl;EFS:160/20ft 320/40ft'
NZS_CL = AUS_CL.replace('AUS','NZS')
nzs_rows = [
    ('New Zealand','AUCKLAND',850,1700,'SINGAPORE','Incl: OBS,ISL,SLF; via PS3-SGSIN-NZ1; EFS subj'),
    ('New Zealand','LYTTELTON/NAPIER/TAURANGA',850,1700,'SINGAPORE','Incl: OBS,ISL,SLF; via PS3-SGSIN-NZ1; EFS subj; combined rate for 3 ports'),
]
out.append("-- ============================================================")
out.append("-- NZS - New Zealand  (15-30 Apr 2026)")
out.append("-- ============================================================")
for dc,dp,r20,r40,via,notes in nzs_rows:
    out.append(ins(OC, OP, dc, dp, r20, r40, VF_E, VT_E, via=via, surcharges=NZS_SURCHARGES, notes=notes, clauses=NZS_CL))
out.append("")

# ============================================================
# CSE - CARIBBEAN / CENTRAL AMERICA
# Two validity periods: 15-21 Apr and 22-30 Apr
# Difference: 22-30 adds MBS to inclusive surcharges
# ============================================================
CSE_CL = (
    "CSE service via Busan-EC2-Manzanillo routing|"
    "Subj: HEA (nil upto 17.99T, USD200/20ft over 18T)|"
    "PCT USD 40/TEU subj|"
    "CSS USD 15/unit subj; SLF USD 10/unit subj|"
    "EFS USD 160/320 per 20/40 for dry (eff 24-03-2026)|"
    "Free detention: 12 days at most ports; 20 days Port au Prince; 15 days Puerto Cortes/Santo Tomas|"
    "San Juan: FMC service contract filing required BEFORE cargo gated in|"
    "Haiti: Due Diligence procedures required"
)

cse_a = [  # 15-21 Apr: incl EFS,OBS,PSS
    ('Aruba','BARCADERA ORANJESTAD',5600,5600,'BUSAN','Incl: EFS,OBS,PSS; Subj: CSS,HEA,PCT,SLF,THL,THD'),
    ('Barbados','BRIDGETOWN',5600,5600,'BUSAN','Incl: EFS,OBS,PSS'),
    ('Brazil','MANAUS',4400,4400,'YANTIAN','Incl: EFS,OBS,PSS; Subj: CCC,CSS,CVC,HEA,PCT,SLF,THL,THD,TSA; via Yantian-EC2-Manzanillo'),
    ('Brazil','VILA DO CONDE',4400,4400,'BUSAN','Incl: EFS,OBS,PSS; Subj: CCC,CSS,CVC,HEA,PCT,SLF,THL,THD'),
    ('Colombia','BARRANQUILLA',3500,3500,'BUSAN','Incl: EFS,OBS,PSS; Subj: CRO,CSS,HEA,PCT,SLF,THL,THD'),
    ('Colombia','CARTAGENA',3500,3500,'BUSAN','Incl: EFS,OBS,PSS'),
    ('Colombia','SANTA MARTA',3500,3500,'','Incl: EFS,OBS,PSS'),
    ('Costa Rica','MOIN',3900,3900,'BUSAN','Incl: EFS,OBS,PSS; Subj: AMS,CMD,CSS,CVC,HEA,PCT,SLF,THL,THD'),
    ('Curacao','WILLEMSTAD',6600,6600,'','Incl: EFS,OBS,PSS'),
    ('Dominican Republic','CAUCEDO',3500,3500,'BUSAN','Incl: EFS,OBS,PSS; Subj: CCC,CSS,HEA,PCT,SLF,THL,THD,TSD; via NPI-Busan-AX2-Rodman'),
    ('Dominican Republic','RIO HAINA',4100,4100,'BUSAN','Incl: EFS,OBS,PSS; Subj: CCC,CSS,HEA,PCT,SLF,THL,THD,TSD'),
    ('Guatemala','SANTO TOMAS DE CASTILLA',3900,3900,'BUSAN','Incl: EFS,OBS,PSS; Subj: CCC,CMD,CRO,CSS,HEA,PCT,SCC,SLF,THL,THD'),
    ('Guyana','GEORGETOWN',5600,5600,'BUSAN','Incl: EFS,OBS,PSS; Subj: CMD,CSS,HEA,PCT,SLF,THL,THD'),
    ('Honduras','PUERTO CORTES',3900,3900,'BUSAN','Incl: EFS,OBS,PSS; Subj: CSS,CVC,HEA,PCT,SLF,THL,THD'),
    ('Haiti','PORT AU PRINCE',4400,4400,'BUSAN','Incl: EFS,OBS,PSS; Subj: CMD,CSS,HEA,ISL,PCT,SLF,THL,THD; Due diligence required'),
    ('Jamaica','KINGSTON',4000,4000,'BUSAN','Incl: EFS,OBS,PSS; Subj: CSS,CVC,HEA,PCT,SLF,THL,THD'),
    ('Panama','COLON FREE ZONE (DOOR)',3300,3300,'BUSAN','Incl: EFS,OBS,PSS; Subj: ADD,CSS,HEA,IFD,PCT,SLF,THL,THD; via NPI-Busan-EC2'),
    ('Panama','MANZANILLO',3200,3200,'BUSAN','Incl: EFS,OBS,PSS; Subj: ADD,CSS,HEA,PCT,SLF,THL,THD; via NPI-Busan-EC2'),
    ('Puerto Rico','SAN JUAN',4400,4400,'BUSAN','Incl: EFS,OBS,PSS; Subj: CCC,CDD,CSS,CVC,HEA,PCT,SLF,THL,THD; FMC filing required before gate-in'),
    ('Suriname','PARAMARIBO',5600,5600,'BUSAN','Incl: EFS,OBS,PSS; Subj: CMD,CSS,HEA,PCT,SLF,THL,THD'),
    ('Trinidad and Tobago','PORT OF SPAIN',3500,3500,'BUSAN','Incl: EFS,OBS,PSS; Subj: CCC,CSS,HEA,PCT,SLF,THL,THD'),
    ('Venezuela','LA GUAIRA',4400,4400,'','Incl: EFS,OBS,PSS'),
    ('Venezuela','PUERTO CABELLO',4400,4400,'','Incl: EFS,OBS,PSS'),
]

cse_b = [(dc,dp,r20,r40,via,n.replace('EFS,OBS,PSS','EFS,MBS,OBS,PSS')) for dc,dp,r20,r40,via,n in cse_a]

out.append("-- ============================================================")
out.append("-- CSE - Caribbean / Central America  (15-21 Apr 2026)")
out.append("-- ============================================================")
for dc,dp,r20,r40,via,notes in cse_a:
    out.append(ins(OC, OP, dc, dp, r20, r40, '2026-04-15','2026-04-21', via=via, notes=notes, clauses=CSE_CL))
out.append("")
out.append("-- CSE - Caribbean / Central America  (22-30 Apr 2026, adds MBS)")
for dc,dp,r20,r40,via,notes in cse_b:
    out.append(ins(OC, OP, dc, dp, r20, r40, '2026-04-22','2026-04-30', via=via, notes=notes, clauses=CSE_CL))
out.append("")

# ============================================================
# LEW - LATIN AMERICA EAST (ECSA)
# Multiple validity splits; some via ESALG/NLRTM full period
# ============================================================
LEW_CL = (
    "LEW service via Singapore transshipment|"
    "CSS USD 15/unit; SLF USD 10/unit subj|"
    "EFS USD 160/320 per 20/40 for dry (eff 24-03-2026)|"
    "HEA: nil upto 23.99T; USD 200/20ft over 18T|"
    "IFL/IFD inland fuel charge applies for carrier inland transport (eff Apr 2, 2026)|"
    "Free detention: 18 days most LAEC; 14 days Buenos Aires; 21 days Asuncion"
)

# Full period 15-30 Apr via ESALG or NLRTM (LUX service)
lew_lux = [
    ('Argentina','BUENOS AIRES',1500,1700,'ALGECIRAS','Incl: EFS,HEA,MBS,OBS,PSS; via IOM-Algeciras-LUX; T/S ESALG'),
    ('Argentina','BUENOS AIRES',1500,1700,'ROTTERDAM','Incl: EFS,HEA,MBS,OBS,PSS; via LUX service; T/S NLRTM'),
    ('Brazil','ITAPOA',1500,1700,'ALGECIRAS','Incl: EFS,HEA,MBS,OBS,PSS; via IOM-Algeciras-LUX; T/S ESALG'),
    ('Brazil','ITAPOA',1500,1700,'ROTTERDAM','Incl: EFS,HEA,MBS,OBS,PSS; T/S NLRTM'),
    ('Brazil','PARANAGUA',1500,1700,'ALGECIRAS','Incl: EFS,HEA,MBS,OBS,PSS; via IOM-Algeciras-LUX; T/S ESALG'),
    ('Brazil','PARANAGUA',1500,1700,'ROTTERDAM','Incl: EFS,HEA,MBS,OBS,PSS; T/S NLRTM'),
    ('Brazil','RIO DE JANEIRO',1500,1700,'ALGECIRAS','Incl: EFS,HEA,MBS,OBS,PSS; via IOM-Algeciras-LUX; T/S ESALG'),
    ('Brazil','RIO DE JANEIRO',1500,1700,'ROTTERDAM','Incl: EFS,HEA,MBS,OBS,PSS; T/S NLRTM'),
    ('Brazil','SANTOS',1500,1700,'ALGECIRAS','Incl: EFS,HEA,MBS,OBS,PSS; via IOM-Algeciras-LUX; T/S ESALG'),
    ('Brazil','SANTOS',1500,1700,'ROTTERDAM','Incl: EFS,HEA,MBS,OBS,PSS; T/S NLRTM'),
    ('Paraguay','ASUNCION',3200,3400,'ALGECIRAS','Incl: EFS,HEA,MBS,OBS,PSS; via IOM-Algeciras-LUX-Buenos Aires; T/S ESALG'),
    ('Paraguay','ASUNCION',3200,3400,'ROTTERDAM','Incl: EFS,HEA,MBS,OBS,PSS; T/S NLRTM'),
    ('Uruguay','MONTEVIDEO',1500,1700,'ALGECIRAS','Incl: EFS,HEA,MBS,OBS,PSS; via IOM-Algeciras-LUX; T/S ESALG; VUY,XDD applies'),
    ('Uruguay','MONTEVIDEO',1500,1700,'ROTTERDAM','Incl: EFS,HEA,MBS,OBS,PSS; T/S NLRTM'),
]

# 15-21 Apr via direct SIN routing
lew_a = [
    ('Argentina','BUENOS AIRES',2400,2500,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via NCI-SGSIN-SX1'),
    ('Brazil','ITAPOA',2400,2500,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via NCI-SGSIN-SX2'),
    ('Brazil','NAVEGANTES',2400,2500,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via PS3-SGSIN-SX1'),
    ('Brazil','PECEM',3800,4000,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via PS3-SGSIN-SX2-Santos'),
    ('Brazil','PARANAGUA',2400,2500,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via PS3-SGSIN-SX1'),
    ('Brazil','RIO GRANDE',2400,2500,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via PS3-SGSIN-SX1'),
    ('Brazil','RIO DE JANEIRO',2400,2500,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via PS3-SGSIN-SX2'),
    ('Brazil','SALVADOR',3800,4000,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via NCI-SGSIN-SX2-Santos'),
    ('Brazil','SANTOS',2400,2500,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via PS3-SGSIN-SX1'),
    ('Brazil','SUAPE',3800,4000,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via NCI-SGSIN-SX1-Santos'),
    ('Paraguay','ASUNCION',3500,4000,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via NCI-SGSIN-SX2-Rio'),
    ('Uruguay','MONTEVIDEO',2400,2500,'SINGAPORE','Incl: EFS,HEA,OBS,PSS; via NCI-SGSIN-SX1'),
]

# 22-30 Apr via direct SIN routing (adds MBS, some rate reductions)
lew_b = [
    ('Argentina','BUENOS AIRES',2200,2300,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via NCI-SGSIN-SX1'),
    ('Brazil','ITAPOA',2200,2300,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via NCI-SGSIN-SX2'),
    ('Brazil','NAVEGANTES',2300,2400,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via PS3-SGSIN-SX1'),
    ('Brazil','PECEM',3600,3800,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via PS3-SGSIN-SX2-Santos'),
    ('Brazil','PARANAGUA',2300,2400,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via PS3-SGSIN-SX1'),
    ('Brazil','RIO GRANDE',2300,2400,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via PS3-SGSIN-SX1'),
    ('Brazil','RIO DE JANEIRO',2200,2300,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via PS3-SGSIN-SX2'),
    ('Brazil','SALVADOR',3600,3800,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via NCI-SGSIN-SX2-Santos'),
    ('Brazil','SANTOS',2200,2300,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via PS3-SGSIN-SX1'),
    ('Brazil','SUAPE',3600,3800,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via NCI-SGSIN-SX1-Santos'),
    ('Paraguay','ASUNCION',3500,4000,'ALGECIRAS','Incl: EFS,HEA,MBS,OBS,PSS; via IOM-Algeciras-LUX-Buenos Aires'),
    ('Uruguay','MONTEVIDEO',2300,2400,'SINGAPORE','Incl: EFS,HEA,MBS,OBS,PSS; via NCI-SGSIN-SX1'),
]

out.append("-- ============================================================")
out.append("-- LEW - Latin America East (ECSA)  (15-30 Apr 2026 via LUX)")
out.append("-- ============================================================")
for dc,dp,r20,r40,via,notes in lew_lux:
    out.append(ins(OC, OP, dc, dp, r20, r40, VF_E, VT_E, via=via, notes=notes, clauses=LEW_CL))
out.append("")
out.append("-- LEW - ECSA  (15-21 Apr 2026, direct SIN routing)")
for dc,dp,r20,r40,via,notes in lew_a:
    out.append(ins(OC, OP, dc, dp, r20, r40, '2026-04-15','2026-04-21', via=via, notes=notes, clauses=LEW_CL))
out.append("")
out.append("-- LEW - ECSA  (22-30 Apr 2026, direct SIN routing, adds MBS)")
for dc,dp,r20,r40,via,notes in lew_b:
    out.append(ins(OC, OP, dc, dp, r20, r40, '2026-04-22','2026-04-30', via=via, notes=notes, clauses=LEW_CL))
out.append("")

# ============================================================
# LWE - LATIN AMERICA WEST (WCSA)  (18-30 Apr 2026)
# ============================================================
VF_LWE = '2026-04-18'
VT_LWE = '2026-04-30'
LWE_CL = (
    "LWE service via China transhipment (CIP/NPI routing)|"
    "BAF,BRS,EFS,OBS,PSS inclusive in rates|"
    "HEA: USD150/20ft for 18.01-21.01T; USD200/20ft over 21T|"
    "CSS USD 15/unit; SLF USD 10/unit subj|"
    "ENS for MEX; THCS both ends; Doc fees both ends|"
    "EFS USD 160/320 per 20/40 for dry (eff 24-03-2026)|"
    "IFL/IFD inland fuel charge applies for carrier inland transport (eff Apr 2, 2026)|"
    "Free detention: 21 days Chile/Peru/Mexico; 20 days Colombia; 18 days Ecuador; 17 days Guatemala; 16 days Nicaragua/Costa Rica/El Salvador/Honduras; 12 days Panama"
)

lwe_rows = [
    ('Chile','ARICA',2575,3350,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; Subj: CMD,CSS,HEA,SLF,THL,THD; via CIP-Ningbo-AX1-Callao'),
    ('Chile','CORONEL',2275,2650,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; via CIP-Ningbo-AX2'),
    ('Chile','IQUIQUE',2475,3350,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; via CIP-Ningbo-AX1'),
    ('Chile','LIRQUEN',2275,2650,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; via CIP-Ningbo-AX2'),
    ('Chile','PUERTO ANGAMOS',2475,3350,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; via CIP-Ningbo-AX1'),
    ('Chile','SAN ANTONIO',2175,2550,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; via CIP-Ningbo-AX2'),
    ('Chile','SAN VICENTE',2275,2650,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; via CIP-Ningbo-AX1'),
    ('Chile','VALPARAISO',2175,2550,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; via CIP-Ningbo-AX1'),
    ('Colombia','BUENAVENTURA',2175,2550,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; Subj: CRO,CSS,HEA,SLF,THL,THD; via CIP-Ningbo-AX2'),
    ('Costa Rica','PUERTO CALDERA',2575,3350,'BUSAN','Incl: BAF,BRS,EFS,OBS,PSS; Subj: AMS,CMD,CSS,CVC,HEA,SLF,THL,THD; via NPI-Busan-AX2-Buenaventura'),
    ('Ecuador','GUAYAQUIL',2175,2550,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; Subj: AHA,CSS,CVC,HEA,SLF,THL,THD; via CIP-Ningbo-AX3'),
    ('Ecuador','POSORJA',1975,2350,'','Incl: BAF,BRS,EFS,OBS,PSS'),
    ('Guatemala','PUERTO QUETZAL',2475,3350,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; Subj: CCC,CMD,CRO,CSS,GAT,HEA,SCC,SLF,THL,THD; via CIP-Ningbo-AX3'),
    ('Honduras','SAN LORENZO (DOOR)',4898,5673,'HONG KONG','Incl: BAF,BRS,EFS,OBS,PSS; Subj: CSS,CVC,HEA,IFD,SLF,THL,THD; via CIP-HKG-AX2-Lazaro Cardenas; T/S SVAQJ'),
    ('Mexico','ENSENADA',2475,3350,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; Subj: CCC,CDD,CSS,CVC,HEA,SLF,THL; via CIP-Ningbo-AX3'),
    ('Mexico','LAZARO CARDENAS',2175,2550,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; Subj: CCC,CDD,CSS,CVC,HEA,SLF,THL; via CIP-Ningbo-AX1'),
    ('Mexico','MANZANILLO',2175,2550,'NINGBO','Incl: BAF,BRS,EFS,OBS,PSS; Subj: CCC,CDD,CSS,CVC,HEA,SLF,THL; via CIP-Ningbo-AX1'),
    ('Nicaragua','CORINTO',2575,3350,'BUSAN','Incl: BAF,BRS,EFS,OBS,PSS; via NPI-Busan-AX2-Buenaventura'),
    ('Panama','PANAMA CITY (DOOR)',2725,3600,'BUSAN','Incl: BAF,BRS,EFS,OBS,PSS; Subj: ADD,CSS,HEA,IFD,SLF,THL; via NPI-Busan-AX2; T/S PAROD'),
    ('Panama','RODMAN',2575,3550,'BUSAN','Incl: BAF,BRS,EFS,OBS,PSS; Subj: ADD,CSS,HEA,SLF,THL; via NPI-Busan-AX2'),
    ('Peru','CALLAO',2175,2550,'SHANGHAI','Incl: BAF,BRS,EFS,OBS,PSS; Subj: CSS,CVC,HEA,SLF,THL,THD; via CIP-Shanghai-AX1'),
    ('El Salvador','ACAJUTLA',2575,3350,'HONG KONG','Incl: BAF,BRS,EFS,OBS,PSS; Subj: CSS,HEA,SLF,THL,THD; via CIP-HKG-AX2-Lazaro Cardenas'),
]

out.append("-- ============================================================")
out.append("-- LWE - Latin America West (WCSA)  (18-30 Apr 2026)")
out.append("-- ============================================================")
for dc,dp,r20,r40,via,notes in lwe_rows:
    out.append(ins(OC, OP, dc, dp, r20, r40, VF_LWE, VT_LWE, via=via, notes=notes, clauses=LWE_CL))
out.append("")

# ============================================================
# AFRICA: EFW / WFW / ZFW  (15-30 Apr 2026)
# ============================================================
AFR_CL_EFW = (
    "EFW/WFW service|"
    "HAZ USD 200/TEU|"
    "EFS USD 160/320 per 20/40 for dry (eff 24-03-2026)|"
    "Free detention 14 days at destination for Dry|"
    "Subject to tariff CSS,SLF,THL,doc fee and local surcharges both ends|"
    "Nairobi ICD Embakasi (KENBO34): subj to ARD under ONEY-959|"
    "Uganda ICD Kampala (UGKLA30): subj to ARD under ONEY-959"
)
AFR_CL_ZFW = (
    "ZFW service|"
    "HAZ USD 200/TEU|"
    "EFS USD 160/320 per 20/40 for dry (eff 24-03-2026)|"
    "Free detention 14 days at destination for Dry|"
    "Subject to tariff AMS,CSS,SLF,THL,doc fee and local surcharges both ends"
)

efw_rows = [
    ('Kenya','MOMBASA',1800,1800,'','Incl: AMS,BAF,BRS,CGD,HEA,LSF,OBS,PSS,WRC; Subj: CMD,CSS,CVC,EFS,LID,SLF,THL,THD; MIM service','EFW'),
    ('Tanzania','DAR ES SALAAM',1900,1900,'','Incl: AMS,BAF,BRS,CGD,HEA,LSF,OBS,PSS,THD,WRC; Subj: CSS,EFS,SLF,THL; MIM service','EFW'),
    ('Benin','COTONOU',3200,4200,'SINGAPORE','Incl: AMS,BAF,BRS,CGD,EPH,HEA,LSF,OBS,PSS,WRC; Subj: CMD,CSS,EFS,SLF,THL,TSD; via PS3-SGSIN-SW2','WFW'),
    ('Ivory Coast','ABIDJAN',3200,4200,'SINGAPORE','Incl: AMS,BAF,BRS,CGD,EPH,HEA,LSF,OBS,PSS,WRC; Subj: AHA,CMD,CNC,CSS,EFS,EST,POR,SLF,STF,THL,TSD; via PS3-SGSIN-SW2','WFW'),
    ('Ghana','TEMA',1900,2300,'','Incl: AMS,BAF,BRS,CGD,EPH,HEA,LSF,OBS,PSS,WRC; Subj: CSS,EFS,PRS,SLF,THL,TSD,XAF; AIM service','WFW'),
    ('Nigeria','APAPA',2450,2700,'','Incl: AMS,BAF,BRS,CGD,EPH,HEA,LSF,OBS,PSS,WRC; Subj: CCC,CSS,EFS,NGP,NRF,SLF,THL; AIM service','WFW'),
    ('Nigeria','LEKKI',3800,5000,'SINGAPORE','Incl: AMS,BAF,BRS,CGD,EPH,HEA,LSF,OBS,PSS,WRC; Subj: CCC,CSS,EFS,NGP,NRF,SLF,THL; via NCI-SGSIN-SW2','WFW'),
    ('Nigeria','ONNE',3800,5000,'SINGAPORE','Incl: AMS,BAF,BRS,CGD,EPH,HEA,LSF,OBS,PSS,WRC; Subj: CCC,CSS,EFS,NGP,NRF,SLF,THL; via PS3-SGSIN-WA1','WFW'),
    ('Nigeria','TIN CAN',2450,2700,'','Incl: AMS,BAF,BRS,CGD,EPH,HEA,LSF,OBS,PSS,WRC; Subj: CCC,CSS,EFS,NGP,NRF,SLF,THL; AIM service','WFW'),
    ('Senegal','DAKAR',4600,5000,'','Incl: AMS,BAF,BRS,CGD,EPH,HEA,LSF,OBS,PSS,WRC','WFW'),
    ('Togo','LOME',3200,4200,'SINGAPORE','Incl: AMS,BAF,BRS,CGD,EPH,HEA,LSF,OBS,PSS,WRC; Subj: CMD,CSS,EFS,SLF,THL; via NCI-SGSIN-WA1','WFW'),
    ('Mozambique','MAPUTO',2200,2400,'','Incl: AMS,BAF,BRS,CGD,HEA,OBS,PSS,WRC; Subj: CMD,CSS,EFS,EHD,SLF,THL,THD; MIM service','ZFW'),
    ('South Africa','DURBAN',1200,1150,'','Incl: BAF,BRS,CGD,EPH,HEA,LSF,OBS,PSS,WRC; Subj: AMS,CMD,CSS,EFS,EHD,SLF,THL,THD; AIM service','ZFW'),
]

out.append("-- ============================================================")
out.append("-- AFRICA: EFW/WFW/ZFW  (15-30 Apr 2026)")
out.append("-- ============================================================")
for dc,dp,r20,r40,via,notes,scope in efw_rows:
    cl = AFR_CL_ZFW if scope == 'ZFW' else AFR_CL_EFW
    out.append(ins(OC, OP, dc, dp, r20, r40, VF_E, VT_E, via=via, notes=notes, clauses=cl))
out.append("")

# Summary
total = sum(1 for l in out if l.startswith('INSERT'))
out.insert(0, f"-- Total INSERT rows: {total}")
out.insert(1, "")

for l in out:
    print(l)
