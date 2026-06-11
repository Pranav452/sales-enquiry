/**
 * One-time seed: Excel sales-lead sheet → MSSQL TBL_SALES_LEADS (manilal DB)
 *
 * Usage:
 *   npx tsx scripts/seed-sales-leads.ts
 *
 * Safe to re-run — skips REF_CODEs that already exist.
 */

import * as dotenv from "dotenv"
import sql from "mssql"

dotenv.config({ path: ".env.local" })

const config: sql.config = {
  server:   process.env.MSSQL_MANILAL_HOST!,
  port:     parseInt(process.env.MSSQL_MANILAL_PORT ?? "1433"),
  user:     process.env.MSSQL_MANILAL_USER!,
  password: process.env.MSSQL_MANILAL_PASSWORD!,
  database: process.env.MSSQL_MANILAL_DATABASE!,
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  connectionTimeout: 30000,
  requestTimeout: 120000,
}

// ─── Helpers ─────────────────────────────────────────────────

// Excel sheet shows DD-MM-YYYY / DD/MM/YYYY. One row (234) was entered MM-DD.
const DATE_OVERRIDES: Record<string, string> = {
  "MPC-SL-2026-234": "2026-02-06",
}

function parseDate(ref: string, raw: string): string | null {
  if (DATE_OVERRIDES[ref]) return DATE_OVERRIDES[ref]
  const m = raw.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/)
  if (!m) return null
  const dd = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  let yyyy = parseInt(m[3], 10)
  if (yyyy < 100) yyyy += 2000
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
}

function normStatus(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ")
  if (!s) return null
  if (s.includes("lead sent")) return "LEAD_SENT"
  return null
}

// Status text carrying extra info (e.g. "Lead sent to nakul sir") → keep in NOTES
function statusNote(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ")
  if (s && s !== "lead sent") return raw.trim()
  return null
}

function trunc(val: string | null | undefined, max: number): string | null {
  if (!val) return null
  const t = val.trim()
  if (!t) return null
  return t.length > max ? t.substring(0, max) : t
}

// ─── Data ────────────────────────────────────────────────────
// [ref#, sentBy, dateSent, shipper, website, city, consignee, country, agentName, agentEmail, status, remarks, remarks2]

type Row = [number, string, string, string, string, string, string, string, string, string, string, string, string]

const ROWS: Row[] = [
  [100, "Gautami", "16-01-2026", "Adani Food Products Pvt Ltd", "https://www.adanispices.com/contact-us.html", "Rajkot", "ADAMAR DIS TICARET VE DENIZCILIK", "ALIAGA, TURKEY", "", "mehmet.eren@modaship.com", "Lead Sent", "No response received so follow up mail sent on 21/01", "No response received so follow up mail sent on 29/01"],
  [101, "Gautami", "16-01-2026", "Bayer Pharmaceuticals Pvt Ltd", "https://www.bayer.in/en/", "Thane", "Labcorp Development (Asia) Pte. Ltd.", "SINGAPORE", "Richwell Global Forwarding Pte Ltd", "jasmine@rgf.com.sg", "Lead Sent", "Recd a response asking for more details which we didnot so replied back. Awaiting for their response now", "No response received so follow up mail sent on 29/01"],
  [102, "Shraddha", "16/01/2026", "Paloma Turning Co Pvt Ltd", "https://www.palomaturnedparts.com/contact-us.php", "Bangalore", "Parker Hannifin Corporation", "United States of America", "Woodland International Transport Co Inc.", "chris.miller@woodlandgroup.com", "Lead sent", "Recieved response from chris", ""],
  [103, "Gautami", "19/01/2026", "Artis Technical Textile Pvt Ltd", "https://artistextiles.com/contact-us/", "Silvassa", "Propex Furnishing Solutions Kft", "Hungary", "SME- EUROPE KFT", "daniel.benke@sme-europe.com", "Lead sent", "No response received so follow up mail sent on 21/01", "No response received so follow up mail sent on 29/01"],
  [104, "Shraddha", "17/01/2025", "Atomberg Technologies Pvt Ltd", "https://atomberg.com/?srsltid=AfmBOoo0ELLJe7uwadRky4wUor0o-8Ywfqk0Y_G02QsC-Ti-7d9MuW10", "Vikhroli, Mumbai", "DEWAN TRUST PVT LTD", "Sri lanka", "", "imports@boldlineshipping.com /opsair@boldlineshipping.com /info@boldlineshipping.com", "Lead sent to nakul sir", "meeting is schedule in next week and have quoted them for Nhava sheva ? mundra to colombo rates", ""],
  [105, "Vaishnavi", "19/01/2026", "Anil Company Pvt Ltd", "https://www.anilcospices.com/#Contact_us", "Navi Mumbai", "P B Foods Ltd", "United Kingdom", "Energy Freight Forwarding Ltd", "Matt@energy-freight.com/sarah.connell@energy-freight.com", "Lead sent", "19/01 recieved response from Matt", ""],
  [106, "Vaishnavi", "19/01/2026", "Jayanti Rubber Industries Pvt Ltd", "https://jayantirubber.in/contact-us/", "Haryana", "Fischer Automotive Sp z o o", "Poland", "Polish Forwarding Company Sp. z o.o.", "seafreight@pfc24.pl", "Lead sent", "27/01 No response received so follow up mail sent on", ""],
  [107, "Vaishnavi", "19/01/2026", "Molex India Pvt Ltd", "https://www.molex.com/en-us/home", "Banglaore", "MOLEX ELEKTRONIK GMBH", "Germany", "Cargo Movers GmbH", "d.mattern@cargomovers.de/r.ide@cargomovers.de", "Lead sent", "19/01 recieved posistive response from robert", ""],
  [108, "Vaishnavi", "19/01/2026", "Cultivator Natural Products Pvt Ltd-Jodhpur", "https://cultivatornatural.com/pages/contact-us", "Jodhpur", "Khadi Naturprodukte GmbH and Co KG", "United Kingdom", "Cargo Movers GmbH", "d.mattern@cargomovers.de/r.ide@cargomovers.de", "Lead sent", "27/01 No response received so follow up mail sent on", ""],
  [109, "Vaishnavi", "19/01/2026", "Hertz Chemicals Pvt Ltd-Mumbai - ID - 19118078", "", "check with Links they handle", "SCENT BEAUTY", "Netherlands", "Logicall Ocean Freight B.V.", "ocean.rtm@logicall.com/ocean.rtm@logicall.com", "Lead sent", "27/01 No response received so follow up mail sent on", ""],
  [110, "Gautami", "19/01/2026", "Rangarsons- Delhi", "https://www.rangarsons.co/contact-us/", "Lajpat Nagar Delhi", "Origo Film Group Zrt", "Hungary", "Unimasters Logistics", "miroslav.varnaliev@unimasters.com, ivan.stoilov@unimasters.com", "Lead sent", "Recd response from Ivan on 20/01", "Follow up sent 29/01"],
  [111, "Gautami", "19/01/2026", "Studds Accessories Ltd-Faridabad", "https://www.studds.com/", "Upasna - 9650926944", "New Golden Bat Lda", "Portugal", "AASMVAZ, LDA", "jose.ferrao@aasmvaz.pt", "Lead sent", "No response received so follow up mail sent on 29/01", ""],
  [112, "Gautami", "19/01/2026", "HIRAL LABS LIMITED", "https://www.hirallabs.com/contact.php", "Rahul Jajoo - 9368235030", "Royal Distribution Co Ltd", "", "", "", "", "", ""],
  [113, "Gautami", "19/01/2026", "Manzoor Exports", "", "", "EVANGELOS CHALEPLIS E CHALEPLIS SA", "Greece", "AKTIS Shipping & Forwarding Ltd", "vmendrinos@aktis-hellas.gr, info@aktis-hellas.gr", "Lead sent", "No response received so follow up mail sent on 29/01", ""],
  [114, "Gautami", "19/01/2026", "ABI Showatech India Pvt Ltd", "https://abishowatech.co.in/contact-us/", "Tamil Nadu", "Borgwarner Ltd", "United Kingdom", "Eagle International Logistics", "tom.wild@eagleinternationallogistics.com", "Lead sent", "Recd good response from Tom. Awaiting for an update", "Follow up sent 29/01"],
  [115, "Sarthak", "19/01/2026", "Fullife Healthcare Pvt Ltd-Mumbai", "https://www.fullife.co.in/", "Andheri west", "ESSENTIAL- HEALTHCARE LTD", "Heathrow,UK", "JAG-UFS (Intl) Ltd", "Andrew.ballard@jagufs.com,ericmarime@jagufs.com", "Lead Sent", "response received from andrew", "Follow up sent on 30/01"],
  [116, "Sarthak", "19/01/2026", "CHAITANYA AGRO BIO TECH", "https://www.chaitanyaagrobiotech.co.in/contact-us.htm", "Buldhana", "Moris One Enterprises Ltd", "Nairobi,Kenya", "Boldline Shipping Services Ltd", "imports@boldlineshipping.com,info@boldlineshipping.com,opsair@boldlineshipping.com", "Lead Sent", "Follow up sent on 30/01", ""],
  [117, "Sarthak", "19/01/2026", "CHAITANYA AGRO BIO TECH", "https://www.chaitanyaagrobiotech.co.in/contact-us.htm", "Buldhana", "CIRUMEDICS SAS", "Bogota,Colombia", "Nordicon Freight Forwarder", "direccioncomercial@nordicon.co", "Lead Sent", "Follow up sent on 30/01", ""],
  [118, "Sarthak", "19/01/2026", "Suparna Chemicals", "https://www.suparnachemicals.co.in/", "Narrman Point", "Evonik Operations GmbH", "HAMBURG,GERMANY", "Air Cargo Professionals", "Annika.Wiechers@acpham.com; Sabine.Juknys@acpham.com", "Lead Sent", "response received from annika", "Follow up sent on 03/02"],
  [119, "Sarthak", "19/01/2026", "Exmart International Pvt Ltd-Delhi", "https://www.exmartinternational.com/", "Delhi", "Earthbound Trading Company", "Dallas,USA", "Sobel Network Shipping Co., Inc.", "Pratikd@sobelnet.com", "Lead Sent", "Follow up sent on 03/02", ""],
  [120, "Shraddha", "19/01/2026", "Pravin Masale wala - pune", "https://suhana.com/?srsltid=AfmBOooNzzwBkGEiqE4hDj7cv9Aatr0tP5pjiHJPjDFnbuYx9eCda4Cf", "Atharva Shete- 9096432400", "JayKay Marketing Services Pvt LTD", "Sri lanka", "CLSynergy India Pvt Limited", "hirudi@clsynergy.in /pricing@clsynergy.in", "Lead sent to nakul sir", "recieved response from hirudi", ""],
  [121, "Shraddha", "19/01/2026", "Pravin Masale wala - pune", "https://suhana.com/?srsltid=AfmBOooNzzwBkGEiqE4hDj7cv9Aatr0tP5pjiHJPjDFnbuYx9eCda4Cf", "Atharva Shete- 9096432400", "INDO-ASIA OVERSEAS LTD", "Mauritius", "Freight and Transit Company Limited (FTL)", "mcetiennette@ftl.mu /lvigierdelatour@ftl.mu", "lead sent", "recieved response from marie / mr.arshad have palnned a meeeting with Mrs. Pratima from Indo-Asia Overseas on 28.01", "29/01 meeting has been re-schedule as unfortunately Mr. Sharma could not join the meeting yesterday and has requested to re-schedule same for next week"],
  [122, "Shraddha", "19/01/2026", "Samruddhi Organic Farm India Pvt. Ltd", "https://samruddhiorganic.com/contact-us/", "Pune and Jaipur", "MOHAMED MUSTAFA AND SAMSUDDIN CO PTE LTD", "Singapore", "Richwell Global Forwarding Pte Ltd", "jasmine@rgf.com.sg", "Lead Sent", "recieved response from jasmine 21/01 recived response from kah", "29/01 follow up mail sent"],
  [123, "Shraddha", "19/01/2026", "Samruddhi Organic Farm India Pvt. Ltd", "https://samruddhiorganic.com/contact-us/", "Pune and Jaipur", "Jaymin Enterprises, Corp", "United states", "Tech Cargo", "julio@techcargo.com", "lead sent", "recieved response from suilan", "29/01 follow up mail sent"],
  [124, "Shraddha", "19/01/2026", "Hindalco Industries Ltd-Mumbai", "Lower Parel", "Ashish - 9833061055", "Loxley Public Company Limited", "Thailand", "Eastwind Logistics Co Ltd", "admin@eastwind.co.th /chris@eastwind.co.th", "lead sent", "recived response from chris", ""],
  [125, "Vaishnavi", "20/01/2026", "Polygomma Industries Pvt Ltd-Mumbai", "https://www.polygomma.com/contact-us/", "Antop Hill, Mumbai", "A QUASCAPE INC", "United Kingdom", "Denholm Good Logistics Ltd", "Billy.scott@denholm-logistics.com", "lead sent", "27/01 No response received so follow up mail sent on", ""],
  [126, "Vaishnavi", "20/01/2026", "Khemchand Handicraft-Sangariya", "https://khemchand.in/contact-us", "Rajasthan, Jodhpur", "HUMMINGBIRD GIFTS SHOP", "Australia", "ICAL International Customs And Logistics Pty Ltd", "Matthew.Ferraro@ical.com.au", "lead sent", "received response from anthony", "22/01 anthony has mailed the consignee and waiting for there response. / 28/01 anothony is trying to get in touch with the consginee."],
  [127, "Vaishnavi", "20/01/2026", "Growmore International Ltd", "https://growmore.in/", "Kanpur", "Lindenmann GmbH Co KG", "Germany", "CGATE Logistics GmbH", "fbl@cgate-logistics.com", "lead sent", "27/01 No response received so follow up mail sent on", ""],
  [128, "Vaishnavi", "20/01/2026", "AARTI PHARMALABS LIMITED", "https://www.aartipharmalabs.com/contact", "Goregaon, Mumbai", "BANGLADESH GRAND CORPORATION PVT LTD", "Bangladesh", "KTS Logistics Limited", "soheli@ktslogisticsltd.com", "lead sent", "", ""],
  [129, "Vaishnavi", "20/01/2026", "India International House Ltd-Delhi", "builderhardware.com", "New Delhi", "Stepney Street Holdings Pty Ltd", "Australia", "ICAL International Customs And Logistics Pty Ltd", "Matthew.Ferraro@ical.com.au", "lead sent", "27/01 No response received so follow up mail sent on", ""],
  [130, "Gautami", "21/01/2026", "Cadila Healthcare Ltd", "Links Handling", "", "Eversana Life Science Services LLC", "United States", "V. Alexander & Co., Inc.", "jschmid@valexander.com, mmuntean@valexander.com", "lead sent", "No response received so follow up mail sent on 29/01", ""],
  [131, "Gautami", "21/01/2026", "Stonemen Crafts India Pvt Ltd", "", "", "FREEDOM FURNITURE AUSTRALIA PTY", "Australia", "ICAL International Customs And Logistics Pty Ltd", "Daniel.Garcia@ical.com.au, tahlia.davis@ical.com.au", "lead sent", "No response received so follow up mail sent on 29/01", "Response Recd 29/01. Informed Anothony to help with sales lead. Awaiting for further update."],
  [132, "Gautami", "21/01/2026", "Star Educational Books Distributor Pvt Ltd", "", "176-180, Bora Bazaar Street, 1st Floor, Office # 16, 3rd Maruti Lane, Fort", "Awash International Bank SC", "Ethiopia", "NORA NORTRANSS GLOBAL LOGISTICS PLC", "Utku.erten@noranortranss.com, x2eliteeth@noraglobal.com", "lead sent", "No response received so follow up mail sent on 29/01", ""],
  [133, "Gautami", "22/01/2026", "Capital Foods Pvt Ltd", "https://www.capitalfoods.co.in/contact.html", "Jogeshwari", "SABRINI FOODS PTY", "Australia", "Mega Freight Pty Ltd", "nick@megafreight.com.au, sales@megafreight.com.au", "lead sent", "Response Recd. Has asked for rates from Nhs & Mundra to Melbourne", ""],
  [134, "Gautami", "22/01/2026", "Capital Foods Pvt Ltd", "https://www.capitalfoods.co.in/contact.html", "Jogeshwari", "Sop International Ltd", "United Kingdom", "Eagle International Logistics", "tom.wild@eagleinternationallogistics.com", "Lead sent", "No response received so follow up mail sent on 29/01", ""],
  [135, "Sarthak", "20/01/2026", "Times Art-Delhi", "", "", "Hobby Lobby Stores Inc", "Dallas,USA", "Omni Logistics", "dfwint@omnilogistics.com; mdavis@omnilogistics.com", "lead sent", "Follow up sent on 03/02", "Hobby Lobby is a major US importer in Oklahoma. They have their own drayage trucking fleet and sign direct contracts with ocean carriers."],
  [136, "Sarthak", "20/01/2026", "Times Art-Delhi", "", "", "Zara Home S A", "algeciras spain", "Lantia Maritima S.L.", "salim@lantiamaritima.com,agarcia@lantiamaritima.com", "lead sent", "Follow up sent on 03/02", ""],
  [137, "Sarthak", "20/01/2026", "Vama Art Craft Pvt Ltd-Ghaziabad", "", "", "Terrea AG", "Rotterdam,Netherlands", "Braanker Logistics", "francesca@braanker.com; Lennart@braanker.com", "lead sent", "response received,cannot trace the company", ""],
  [138, "Sarthak", "20/01/2026", "DEVMAHAVIR SUPPLY LLP", "https://devmahavirsupply.com/contact.php", "Mulund Mumbai", "Opro Pvt. Ltd.", "Male,Maldives", "Litus Maldives Pvt Ltd", "chamara@litusgroup.mv; ali.waseem@litusmaldives.com", "lead sent", "Follow up sent on 03/02", ""],
  [139, "Sarthak", "20/01/2026", "Senses Lifestyle-Moradabad", "https://www.senseslifestyle.com/home", "", "FAR EAST BROKERS AND CONSULTANTS INC", "new york,usa", "Woodland International Transport Co Inc, dba Woodland Global", "chris.miller@woodlandgroup.com; agent.quotes@woodlandgroup.com,suresh.daddar@woodlandgroup.com", "lead sent", "Follow up sent on 03/02", ""],
  [140, "Shraddha", "20/01/2026", "Hindalco Industries Ltd-Mumbai", "Already shared above", "", "Corning Precision Materials", "South korea", "AGL Co., Ltd.", "shally.seo@agl.co.kr /miri.kim@agl.co.kr", "lead sent", "Response recieved from miri kim", ""],
  [141, "Shraddha", "20/01/2026", "Jayant Agro Organics Ltd-Mumbai", "https://www.jayantagro.com/contact-us", "Lower parel", "Alnor Oil Company Inc", "UNITED STATES", "Woodland International Transport Co Inc, dba Woodland Global", "chris.miller@woodlandgroup.com", "lead sent", "response recieved from neli", ""],
  [142, "Shraddha", "20/01/2026", "Jayant Agro Organics Ltd-Mumbai", "https://www.jayantagro.com/contact-us", "Lower parel", "Itoh Oil Chemicals Co Ltd", "Japan", "Knot Global Holdings Co., Ltd.", "kazuhiro_iwakiri@knotglobal-hd.com", "lead sent", "", ""],
  [143, "Shraddha", "21/01/2026", "PIRAMAL GLASS LIMITED", "https://www.pgpfirst.com/", "Mr. Devang try to get a meeting with him for fareast sectory MR. oberoi for europe(Vadodara)", "pgp glass usa inc", "UNITED STATES", "Anchor Express Inc.", "vita_pietrzak@anchorexpressinc.com /nelli_grzes@anchorexpressinc.com", "lead sent", "", ""],
  [144, "Shraddha", "21/01/2026", "PIRAMAL GLASS LIMITED", "https://www.pgpfirst.com/", "Mr. Devang try to get a meeting with him for fareast sectory MR. oberoi for europe (Vadodara)", "pgp glass europe srl", "France", "sent to Devanshi ma'am", "", "lead sent", "recieved response from devanshi ma'am", ""],
  [145, "Sarthak", "21/01/2026", "Senses Lifestyle-Moradabad", "https://www.senseslifestyle.com/home", "Moradabad", "C W Marketing Pty Ltd", "Melbourne,Australia", "TFG Global Pty Ltd", "matthew@tfgglobal.com.au; dijana@tfgglobal.com.au; paul@tfgglobal.com.au", "lead sent", "Follow up sent on 03/02", ""],
  [146, "Sarthak", "21/01/2026", "DIVINE CASA-New Delhi", "https://divinecasa.com/", "", "Sklum Home and Deco S L", "Valencia,Spain", "Maresa Logistica", "jon.busnadiego@maresalogistica.com", "lead sent", "Follow up sent on 03/02", ""],
  [147, "Sarthak", "21/01/2026", "DIVINE CASA-New Delhi", "https://divinecasa.com/", "", "Home Essentials and Beyond Inc", "New York,USA", "Tech Cargo", "julio@techcargo.com; ernesto@techcargo.com", "lead sent", "response received,working on it", "Follow up sent on 03/02"],
  [148, "Vaishnavi", "21/01/2026", "Samsonite South Asia Pvt Ltd-Nashik - ID - 19092678", "Nilesh Koregaonkar - 9763702021", "Nashik", "Samsonite Europe NV", "Belgium", "Logicall Air & Ocean", "z.vanimmerseel@logicall.com", "lead sent", "27/01 No response received so follow up mail sent on / 28/01 receievd response from zino", ""],
  [149, "Shraddha", "21/01/2026", "Chheda Specialities Foods Pvt Ltd-Mumbai", "https://www.chhedaspecialities.com/", "Kandivali", "SNEDA SHOPPING CENTER LIMITED", "Ghana", "Haps Global Logistics Limited", "Sales@hapsglobalgh.com", "Lead sent", "", ""],
  [150, "Sarthak", "21/01/2026", "Exmart International Pvt Ltd-Delhi", "https://www.exmartinternational.com/", "", "POUNDLAND LTD", "dublin,ireland", "Denholm Good Logistics Ltd", "irelandsales@denholm-logistics.com, steven.hughan@denholm-logistics.com", "lead sent", "Follow up sent on 03/02", ""],
  [151, "Sarthak", "21/01/2026", "Omkar Corporation-Thane", "", "", "D A Decoracao e Ambientacao Ltda", "Recife,Brazil", "B&M Logistica International Ltda", "alexandre@bmlog.com.br,sergiobini@bmlog.com.br; glauco@bmlog.com.br; rodrigo.sperandio@bmlog.com.br", "lead sent", "Follow up sent on 03/02", ""],
  [152, "Vaishnavi", "21/01/2026", "Synergy Punching Pvt Ltd-Bengaluru", "https://www.synergypunching.com/", "Bangalore", "Alstom", "Australia", "ICAL International Customs And Logistics Pty Ltd", "Matthew.Ferraro@ical.com.au", "lead sent", "27/01 No response received so follow up mail sent on", ""],
  [153, "Vaishnavi", "21/01/2026", "KDDL Ltd", "https://www.kddl.com/contact/", "Chandigarh", "Tag Heuer", "Switerland", "NATCO AG", "v.ponnanakunnel@natco.ch / p.bachofner@natco.ch", "lead sent", "received response from patrick", ""],
  [154, "Shraddha", "21/01/2026", "dr jackfruit india private limited-thalappuzha", "https://www.drjackfruit.com/#about", "kerala", "global foods trading gmbh germany", "Germany", "V.Alexander Transport Systems GmbH", "jwalgahn@valexandertransport.de", "Lead sent", "", ""],
  [155, "Shraddha", "22/01/2026", "Madhu Silica Pvt Ltd-Bhavnagar", "https://www.madhusilica.com/reach-at-madhusilica.aspx", "bhavnagar", "Amik Italia S p A", "Italy", "C.T.I. Srl", "aelmi@cti-fwd.com /alessiae@cti-fwd.com", "Lead sent", "", ""],
  [156, "Shraddha", "22/01/2026", "Madhu Silica Pvt Ltd-Bhavnagar", "https://www.madhusilica.com/reach-at-madhusilica.aspx", "bhavnagar", "Kemin Europa NV", "Belgium", "Gate4EU NV.", "gregory.t@gate4eu.be", "Lead sent", "", ""],
  [157, "Vaishnavi", "22/01/2026", "Anisa Carpets Ltd", "https://www.anisacarpetsnrugs.com/", "", "Ikea Distribution Services GmbH Co KG", "Germany", "CGATE Logistics GmbH", "iha@cgate-logistics.com /fla@cgate-logistics.com", "Lead sent", "27/01 No response received so follow up mail sent on", ""],
  [158, "Vaishnavi", "22/01/2026", "Vini Decor-Panipat", "https://vinidecor.in/contact", "Panipat", "Feizy Import Export Co", "United States", "Omni Logistics", "ordint@omnilogistics.com", "Lead sent", "27/01 No response received so follow up mail sent on", ""],
  [159, "Gautami", "22/01/2026", "Wohr Parking Systems Pvt Ltd", "https://www.wohrparking.in/contact.html", "Pune", "WOHR Polska Sp. z o. o.", "Poland", "Polish Forwarding Company Sp. z o.o.", "jmacko@pfc24.pl, mmazuryk@pfc24.pl", "Lead sent", "No response received so follow up mail sent on 29/01", ""],
  [160, "Sarthak", "22/01/2026", "Master Stroke Interiors Pvt Ltd-Delhi", "http://www.masterstroke.com/", "Delhi", "Bazar Bizar BVBA", "Antwerp,Belgium", "Logicall Air & Ocean", "j.cotteny@logicall.com; j.geerlings@logicall.com", "lead sent", "Follow up sent on 03/02", ""],
  [161, "Sarthak", "22/01/2026", "Master Stroke Interiors Pvt Ltd-Delhi", "http://www.masterstroke.com/", "Delhi", "Floralis G Y Bar Dayan Ltd", "Ashdod,Israel", "ISLINE", "orena@isline.co.il; vickys@isline.co.il", "lead sent", "Follow up sent on 03/02", ""],
  [162, "Vaishnavi", "22/01/2026", "Madhu India Deco Ltd-Mumbai", "https://madhuindia.com/", "Lucknow", "JAB TEPPICHE HEINZ ANSTOEZ KG", "Germany", "Cargo Movers GmbH", "Daniel Mattern | CargoMovers (FRA) <d.mattern@cargomovers.de>", "lead sent", "27/01 No response received so follow up mail sent on", ""],
  [163, "Shraddha", "22/01/2026", "Ratnamani Healthcare Pvt Ltd-AHMEDABAD", "https://www.ratnatris.com/", "AHMEDABAD", "Kessington Global Synergy Ltd.", "NIGERIA", "Wadoye Express Ltd", "hwaidi@wadoye.com", "lead sent", "", ""],
  [164, "Vaishnavi", "22/01/2026", "Daks India Industries Pvt Ltd-New Delhi", "https://daksindia.com/", "Okhla Delhi", "BOLLOR LOGISTICS", "United States", "Woodland International Transport Co Inc, dba Woodland Global", "agent.quotes@woodlandgroup.com / chris.miller@woodlandgroup.com", "lead sent", "27/01 No response received so follow up mail sent on", ""],
  [165, "Sarthak", "22/01/2026", "Neo Crafts Impex Pvt Ltd-Delhi", "", "", "HOGEWONING BV", "rotterdam,netherlands", "Pentagon International B.V.", "maurice.reijntjes@pentagonfreight.com", "lead sent", "Follow up sent on 03/02", ""],
  [166, "Sarthak", "22/01/2026", "Neo Crafts Impex Pvt Ltd-Delhi", "", "", "HOMEGOODS INC", "New york,USA", "TLSS Inc.", "kishor.pawar@transworld.com; ashutosh.sharma@transworld.com", "lead sent", "Follow up sent on 03/02", ""],
  [167, "Sarthak", "22/01/2026", "Ashish Homes-Jaipur", "https://ashishhomes.com/#/", "Jaipur", "Apollo Housewares Ltd", "felixstowe,UK", "Britam Shipping Ltd", "Mcroser@bashipping.co.uk; Britam-network@bashipping.co.uk", "lead sent", "Follow up sent on 03/02", ""],
  [168, "Vaishnavi", "22/01/2026", "Amphenol Interconnect India Pvt Ltd", "https://amphenol-in.com/", "", "Amphenol Air LB GmbH", "Germany", "Cargo Movers GmbH", "Daniel Mattern | CargoMovers (FRA) <d.mattern@cargomovers.de>", "lead sent", "27/01 No response received so follow up mail sent on", ""],
  [169, "Gautami", "23/01/2026", "Kamal Auto Industries", "https://www.kamalauto.com/", "", "Krimpterm Ltd", "United Kingdom", "Mairon Freight Uk Ltd", "Jamie@mairon.co.uk, jordan@mairon.co.uk", "lead sent", "No response received so follow up mail sent on 29/01", ""],
  [170, "Shraddha", "23/01/2026", "Hubergroup India Private Limited", "http://www.hubergroup.com/in/en/", "Vapi", "Hubergroup Deutschland GmbH", "Germany", "V.Alexander Transport Systems GmbH", "jwalgahn@valexandertransport.de", "lead sent", "", ""],
  [171, "Sarthak", "23/01/2026", "Neo Crafts Impex Pvt Ltd-Delhi", "", "", "Ernsteing S Family GmbH Co KG", "Hamburg,Germany", "V.Alexander Transport Systems GmbH", "jwalgahn@valexandertransport.de", "lead sent", "response received,not interested currently", ""],
  [172, "Vaishnavi", "23/01/2026", "Suzuki Motorcycle India Pvt Ltd-New Delhi", "https://www.suzukimotorcycle.co.in/", "", "RANCON MOTOR BIKES LTD", "Bangladesh", "MP Cargo, Bangladesh", "mainul.bd@manilal.com/moalam.bd@manilal.com", "lead sent", "23/01 receieved response from mainul.", ""],
  [173, "Gautami", "23/01/2026", "Ajanta Pharma Ltd", "https://www.ajantapharma.com/", "Andheri, Mumbai", "Planetpharma S A", "France", "MP Cargo, France", "Devanshi@manilal.com", "lead sent", "Recd response.", ""],
  [174, "Sarthak", "23/01/2026", "Jindal Poly Films Ltd-Delhi", "https://www.jindalpoly.com/", "Gurugram", "TECNOSUR SAS", "bogota,colombia", "Contract Logistics SAS", "overseas@contractlog.com.co; comercial@contractlog.com.co", "lead sent", "Follow up sent on 03/02", ""],
  [175, "Shraddha", "23/01/2026", "Hubergroup India Private Limited", "http://www.hubergroup.com/in/en/", "Vapi", "Hubergroup USA Inc", "United States", "Woodland International Transport Co Inc, dba Woodland Global", "chris.miller@woodlandgroup.com/ agent.quotes@woodlandgroup.com", "lead sent", "", ""],
  [176, "Vaishnavi", "23/01/2026", "Bengal Industries Pvt Ltd-Delhi", "http://www.bengalind.com/contact.html", "", "GE Energy Parts Inc", "United States", "Woodland International Transport Co Inc, dba Woodland Global", "chris.miller@woodlandgroup.com/ agent.quotes@woodlandgroup.com", "lead sent", "27/01 No response received so follow up mail sent on / 28/01 received response from chris.", ""],
  [177, "Shraddha", "23/01/2026", "Brussels Laboratories Pvt Ltd", "https://brusselslaboratories.com/", "", "Zain Pharma Ltd", "Kenya", "Boldline Shipping Services Ltd", "opsair@boldlineshipping.com, imports@boldlineshipping.com", "lead sent", "Recd Response on 26/01. Awaiting for update", ""],
  [178, "Vaishnavi", "23/01/2026", "Nissan Motor India Pvt Ltd", "https://www.nissan.in/", "", "Nissan Import Egypt Ltd", "Egypt", "Ark Business & Logistics ARK B.L", "Inquiry@arkbl.com", "lead sent", "25/01 receievd response from farah.", ""],
  [179, "Sarthak", "23/01/2026", "AABH Creation-Mumbai", "https://aabh.in/", "", "PRISHNA NAVINCHAN LAKHA", "Mombasa,kenya", "Boldline Shipping Services Ltd", "md@boldlineshipping.com, imports@boldlineshipping.com", "lead sent", "Follow up sent on 03/02", ""],
  [180, "Sarthak", "23/01/2026", "AABH Creation-Mumbai", "https://aabh.in/", "", "MAROO KITCHEN AND HOUSEHOLD GOODS", "London Gateway,UK", "CGATE Logistics UK Limited", "abe@cgate-logistics.com,asa@cgate-logistics.com", "lead sent", "Response Received-contacted without success", ""],
  [181, "Sarthak", "23/01/2026", "Ramkumar Textile Pvt Ltd-Bhilwara", "https://www.ramkumartextile.com/", "", "Riyad Bank", "Riyadh,Saudi Arabia", "Transworld Saudi Logistics Co", "sameeulla.gafoor@transworld.com, joseph.mathew@transworld.com", "lead sent", "Response Received-Riyadh Bank, this might be an MBL consigned to Bank", ""],
  [182, "Shraddha", "27/01/2026", "Benzo Chem Industries Pvt Ltd.", "https://bcipl.co.in/", "Nariman Point", "Syngenta Crop Protection AG", "Grangemouth,UK", "Energy Freight Forwarding Ltd", "Matt@energy-freight.com", "Lead sent", "", ""],
  [183, "Sarthak", "27/01/2026", "Spareage Sealing Solutions LLP-Mumbai", "https://www.spareage.in/", "", "Hercules Sealing Products", "New york,USA", "Cargo Tours International", "Kholloway@cargotours.com; Fcipollone@cargotours.com", "Lead sent", "Followed up mail sent 03/02", ""],
  [184, "Shraddha", "27/01/2026", "Esteem Industries Pvt Ltd-Sattari", "https://www.esteem-india.com/", "Goa", "Goulston Technologies Inc", "United States of America", "Woodland International Transport Co Inc.", "chris.miller@woodlandgroup.com", "Lead sent", "", ""],
  [185, "Gautami", "27/01/2026", "Cachet Pharmaceuticals Pvt Ltd", "https://www.cachetindia.com/", "", "Wessex Pharmaceuticals Rwanda Ltd", "Kenya", "Boldline Shipping Services Ltd", "imports@boldlineshipping.com, opsair@boldlineshipping.com", "Lead sent", "", ""],
  [186, "Sarthak", "27/01/2026", "Archana Exports-Bhadohi", "", "", "Armadillo Co Pty", "Sydney,Aus", "Mega Freight Pty Ltd", "nick@megafreight.com.au; sales@megafreight.com.au", "Lead sent", "Followed up mail sent 03/02", ""],
  [187, "Sarthak", "27/01/2026", "Archana Exports-Bhadohi", "", "", "Armadillo Co USA LLC", "Los Angeles,USA", "Rose Containerline Inc", "Aimee@shiprose.com; josh@shiprose.com", "Lead sent", "Followed up mail sent 03/02", "I spoke with this client and they are quite satisfied with their current forwarder. I will try to contact them again next month and see if anything changes!"],
  [188, "Shraddha", "28/01/2026", "SANDVIK MINING AND ROCK TECHNOLOGY INDIA PRIVATE L", "https://www.mining.sandvik/en/", "Pune", "Sandvik SMC Logistics Ltd", "New York", "Woodland Global Ltd", "chris.miller@woodlandgroup.com", "Lead sent", "", ""],
  [189, "Gautami", "27/01/2026", "Kob Medical Textiles Pvt Ltd", "https://www.kob.de/india/", "", "Paul Hartmann AG", "Germany", "Cargo Movers GmbH", "d.borgmann@cargomovers.de", "Lead sent", "", ""],
  [190, "Sarthak", "27/01/2026", "Lavino Kapur Cottons Pvt Ltd", "https://lavinokapur.com/", "", "Asda Stores Ltd", "London,UK", "Woodland Global Ltd", "jason.shuttleworth@woodlandgroup.com; suresh.daddar@woodlandgroup.com", "Lead sent", "Please do note that Asda is an extremely large global company and the lead you have provided is very vague, with no contact details.", ""],
  [191, "Gautami", "27/01/2026", "Encube Ethicals Pvt Ltd-Mumbai", "https://www.encubeethicals.com/", "", "TopRx, LLC", "New York", "Woodland Global Ltd", "chris.miller@woodlandgroup.com", "Lead sent", "", ""],
  [192, "Gautami", "28/01/2026", "Medico Remedies Ltd", "https://medicoremedies.com/", "", "Saad Medical", "Dominican Republic", "Go Trans & Logistics Dominican EIRL", "sales6@ctcdo.com, suresh.daddar@woodlandgroup.com", "Lead sent", "", ""],
  [193, "Gautami", "28/01/2026", "J B Chemicals Pharmaceuticals Ltd", "https://jbpharma.com/", "Prabhadevi, Mumbai", "Rising Pharma Holdings Inc", "New York", "Atlantic Global Forwarding, LLC", "help@agfus.com", "Lead sent", "", ""],
  [194, "Gautami", "28/01/2026", "Inventia Healthcare Ltd", "", "", "Ascend Laboratories LLC", "New York", "Cargo Tours International", "Fcipollone@cargotours.com, Kholloway@cargotours.com", "Lead sent", "", ""],
  [195, "Gautami", "28/01/2026", "Emami Ltd-Kolkata", "https://www.emamiltd.in/", "", "Alsiha Medical Supplies L.L.C", "Jebel Ali", "Connect Logistics Cargo LLC", "f.jabbar@connectclc.com, j.javeed@connectclc.com", "Lead sent", "", ""],
  [196, "Vaishnavi", "28/01/2026", "Grauer Weil I Ltd-Mumbai", "", "", "Amphenol Aerospace", "United states", "Atlantic Global Forwarding, LLC", "help@agfus.com", "Lead sent", "", ""],
  [197, "Gautami", "28/01/2026", "Cadila Healthcare Ltd", "https://www.cadilapharma.com/", "", "NOVATIA LLC", "Newark, US", "Serra International", "mdicori@serraintl.com, jzino@serraintl.com", "Lead sent", "", ""],
  [198, "Shraddha", "29/01/2026", "SANDVIK MINING AND ROCK TECHNOLOGY INDIA PRIVATE L", "https://www.mining.sandvik/en/", "Pune", "Sandvik SMC Distribution Ltd", "Rotterdam,Netherlands", "Logicall Airfreight B.V.", "j.geerlings@logicall.com", "lead sent", "", ""],
  [199, "Sarthak", "29/01/2026", "Ashoka Creations-Jaipur", "", "", "Classic Fever LLC", "San Francisco,USA", "Anchor Express Inc.", "vita_pietrzak@anchorexpressinc.com; nelli_grzes@anchorexpressinc.com", "Lead sent", "Response Received-No contact details of the cnee", ""],
  [200, "Sarthak", "29/01/2026", "Ashoka Creations-Jaipur", "", "", "The Rug Establishment Pty Ltd", "Sydney,Aus", "Mega Freight Pty Ltd", "nick@megafreight.com.au; sales@megafreight.com.au", "Lead sent", "Follow up mail sent on 03/02", ""],
  [201, "Sarthak", "29/01/2026", "KW Carpet Company-Varanasi", "", "", "LAYERED AB WEBB", "Stockholm,Sweden", "Key Logistics AB", "bjorn.sjoberg@keylogistics.se; mattias.engstrom@keylogistics.se; jennie.kack@keylogistics.se", "Lead sent", "Response Received,contact with Ms Siri at Layered", ""],
  [202, "Gautami", "29/01/2026", "PERMESHWAR CREATIONS PVT. LTD.", "http://permeshwarimages.com/", "", "El Corte Ingles", "Valencia, Spain", "Tancomed S.A.", "cfuentes@tancomed.es, lherlein@tancomed.es", "Lead sent", "", ""],
  [203, "Sarthak", "29/01/2026", "LAAJ International-New Delhi", "https://laajinternational.com/", "", "WEHKAMP RETAIL GROUP B V", "Rotterdam,Netherlands", "Logicall Ocean Freight B.V.", "ocean.rtm@logicall.com; j.geerlings@logicall.com", "Lead sent", "Follow up mail sent on 03/02", ""],
  [204, "Gautami", "29/01/2026", "Oriental Export Corporation", "https://www.orientalexportcorp.com/", "", "Green Line Hose Fittings Ltd", "Vancouver, Canada", "HOC Global Solutions", "frankw@hocltd.com", "Lead sent", "", ""],
  [205, "Sarthak", "29/01/2026", "LAAJ International-New Delhi", "https://laajinternational.com/", "", "Oaz Comercial Ltda", "Vitoriagasteiz,Brazil", "B&M Logistica International Ltda", "alexandre@bmlog.com.br; glauco@bmlog.com.br,sergiobini@bmlog.com.br", "Lead sent", "Follow up mail sent on 03/02", ""],
  [206, "Gautami", "29/01/2026", "Vimal Exports Global LLP", "", "", "Eurofiel Confeccion S A", "Valencia, Spain", "Herport Logistics Iberica S.A.", "aespejo@herport.es", "Lead sent", "", ""],
  [207, "Vaishnavi", "30/01/2026", "Shakun Polymers Ltd-Vadodara", "https://www.shakunpolymers.com/", "", "Dubai Cable Co Pvt Ltd", "UAE", "Fleet Line Shipping Services L.L.C.", "rahul@fleetlineshipping.com / seafreight@fleetlineshipping.com", "Lead sent", "", ""],
  [208, "Sarthak", "30/01/2026", "Kohinoor Ropes Pvt Ltd-PARBHANI", "https://www.kohinoorrope.com/", "", "Banco Del Estado De Chile", "Colonel,Chile", "World Transport International Ltda", "world@worldtransport.cl; quotes@worldtransport.cl", "Lead sent", "Follow up mail sent on 03/02", ""],
  [209, "Vaishnavi", "30/01/2026", "NEELIKON FOOD DYES & CHEMICALS LIMITED", "https://neelikon.com/", "", "C S N", "China", "CSC Transport Limited", "Ashley@csc-log.com / summer@csc-log.com", "Lead sent", "Received Response on 30/01. Awaiting for update", ""],
  [210, "Sarthak", "30/01/2026", "Rishi FIBC Solutions Pvt Ltd-Vadodara", "https://www.rishifibc.com/", "", "AGROSERVICE GMBH", "Frankfurt,Germany", "MT Logistik GmbH", "dzobywalski@mt-logistik.de; msawallisch@mt-logistik.de", "Lead sent", "Response Received", ""],
  [211, "Vaishnavi", "30/01/2026", "SCOTT EDIL PHARMACIA LTD", "https://scott-edil.com/", "", "DIRECTOR OF", "Venezuela", "Tech Cargo Group CA", "jose.vlc@techcargo.com", "Lead sent", "", ""],
  [212, "Sarthak", "30/01/2026", "Pyrotek India Pvt Ltd-Shirur", "https://www.pyrotek.com/contact/locations/country/india", "", "Pyrotek CZ SRO", "Prague,Czech", "Farmtrans a.s.", "zita@farmtrans.cz", "Lead sent", "Follow up mail sent", ""],
  [213, "Sarthak", "30/01/2026", "Pyrotek India Pvt Ltd-Shirur", "https://www.pyrotek.com/contact/locations/country/india", "", "Shenzhen Pyrotek Inc", "Naning,China", "CIMC Anda Shun International Logistics Co.,Ltd.", "Jovial_le@ads-logistics.com; heidi_hai@ads-logistics.com", "Lead sent", "Follow up mail sent", ""],
  [214, "Sarthak", "30/01/2026", "Distinct Technoconcept Pvt Ltd", "https://www.distincttechno.com/index.html", "", "SUHAIL CHEMICAL INDUSTRIES LLC", "Muscat,Oman", "Doroob Logistics & Marine Services International LLC", "chanaka@dorooblogistics.com; chamath@omanpostalexpress.com", "Lead sent", "Response Received ,they work via DHL", ""],
  [215, "Vaishnavi", "02/02/2026", "ARISTO PHARMACEUTICALS PVT. LTD.", "https://www.aristopharma.co.in/", "", "Viv Pharma Pvt Ltd", "Srilanka", "CLSynergy India (Pvt) Ltd", "hirudi@clsynergy.in / dhanushan@clsynergy.in / pricing@clsynergy.in", "Lead sent", "", ""],
  [216, "Vaishnavi", "02/02/2026", "Vancor Impex Pvt Ltd-MOHALI", "", "", "Oswald Riemer Uhrenarmband Fabrik GmbH", "Germany", "V.Alexander Transport Systems GmbH", "jwalgahn@valexandertransport.de", "Lead sent", "", ""],
  [217, "Sarthak", "02/02/2026", "R K Potteries-Bulandshahr", "https://www.rkpotteries.com/", "", "CLINK COMERCIO DE IMPORTACAO EXPOR ACAO LTDA", "Itapoa,Brazil", "JS Logistica (Jet Speed)", "maria.tonon@jspeed.com.br; Janaina.albuquerque@jspeed.com.br", "Lead sent", "Follow up mail sent", ""],
  [218, "Sarthak", "02/02/2026", "Krishna Creative Cards Pvt Ltd-Mumbai", "", "", "Sportswift Ltd", "London,UK", "Britam Shipping Ltd", "Mcroser@bashipping.co.uk", "Lead sent", "Follow up mail sent", ""],
  [219, "Sarthak", "02/02/2026", "SAP Print Solutions Pvt Ltd-Mumbai", "https://www.sapprints.com/", "", "Queenex Publishers Ltd", "Mombasa,Kenya", "Boldline Shipping Services Ltd", "md@boldlineshipping.com, imports@boldlineshipping.com", "Lead sent", "Follow up mail sent", ""],
  [220, "Sarthak", "02/02/2026", "SAP Print Solutions Pvt Ltd-Mumbai", "https://www.sapprints.com/", "", "TONAD PUBLISHERS LTD", "Adapa,Nigeria", "Ocean Trove Global Services Limited", "temitope.s@ocean-trove.com", "Lead sent", "Follow up mail sent", ""],
  [221, "Vaishnavi", "03/02/2026", "Vanturra Brass-New Delhi", "", "", "M Marcus Ltd", "United Kingdom", "CGATE Logistics UK Limited", "abe@cgate-logistics.com / asa@cgate-logistics.com", "Lead sent", "03/02 andy added his colleague id name victor", ""],
  [222, "Sarthak", "03/02/2026", "Raychem RPG Pvt Ltd-Mumbai", "https://www.raychemrpg.com/", "", "Tyco Electronics Polska Sp Z O O", "Gdynia,Poland", "Polish Forwarding Company Sp. z o.o.", "jmacko@pfc24.pl; bsamulak@pfc24.pl", "Lead sent", "Follow up mail sent", ""],
  [223, "Sarthak", "03/02/2026", "Raychem RPG Pvt Ltd-Mumbai", "https://www.raychemrpg.com/", "", "TE Connectivity Chile Ltda", "Santiago,Chile", "World Transport International Ltda", "world@worldtransport.cl; quotes@worldtransport.cl", "Lead sent", "Follow up mail sent", ""],
  [224, "Sarthak", "03/02/2026", "Procter Gamble Home Products Pvt Ltd-Mumbai", "https://in.pg.com/", "", "Hayleys Consumer Products Ltd", "Colombo,Srilanka", "ASB Freight (Pvt) Ltd", "heshan@asbcmb.com; sanjeeva@asbcmb.com", "Lead sent", "Follow up mail sent", ""],
  [225, "Shraddha", "06/02/2026", "nectar lifesciences Ltd", "https://www.neclife.com/", "Chandigarh", "Glaxosmithkline", "London,UK", "Energy Freight Forwarding Ltd", "Matt@energy-freight.com", "Lead sent", "", ""],
  [226, "Vaishnavi", "06/02/2026", "Keva Fragrances Pvt Ltd-Mumbai - ID - 19132187", "https://keva.co.in/", "", "Hemas Manufacturing Pvt Ltd", "Colombo,Srilanka", "CLSynergy India (Pvt) Ltd", "dhanushan@clsynergy.in / hirudi@clsynergy.in / pricing@clsynergy.in", "Lead sent", "", ""],
  [227, "Sarthak", "06/02/2026", "ARTIS INDUSTRIAL PRIVATE LIMITED", "https://www.artisindustrial.com/", "", "PVD TRADING AND TECHNICAL SERVICES JOINT STOCK COMPANY", "Ho mInh City", "T&T Global Agency Co., Ltd", "laura.hcm@tntglobal.com.vn,eira.hcm@tntglobal.com.vn", "Lead sent", "Follow up mail sent", ""],
  [228, "Sarthak", "06/02/2026", "Cummins India Ltd-Pune", "https://www.cummins.com/en-in/en/in/company/india-companies/cummins-india-limited", "", "Aksa Jenerator Sanayi AS", "Istanbul,Turkey", "YSL Ulus. Nakl. Dis Tic.A.S", "yelda@yslogistic.com,nazli@yslogistic.com", "Lead sent", "Follow up mail sent", ""],
  [229, "Sarthak", "06/02/2026", "Cummins India Ltd-Pune", "https://www.cummins.com/en-in/en/in/company/india-companies/cummins-india-limited", "", "CUMMINS LTD", "Southampton,UK", "Mairon Freight Uk Ltd", "jordan@mairon.co.uk; Jamie@mairon.co.uk", "Lead sent", "Follow up mail sent", "No revert after follow up"],
  [230, "Sarthak", "06/02/2026", "Vista Furnishing Pvt Ltd-New Delhi", "https://vistafurnishing.com/contact-us/", "", "Kravet Inc", "Charleston,USA", "Rose Containerline Inc", "Aimee@shiprose.com; josh@shiprose.com", "Lead sent", "I spoke with this client and they are quite satisfied with their current forwarder.", "Follow up mail sent"],
  [231, "Vaishnavi", "06/02/2026", "Glenmark Pharmaceuticals Ltd-Mumbai", "https://glenmarkpharma.com/contact-us/", "", "GLENMARK PHARMACEUTICALS INC", "UNITED STATES", "Woodland International Transport Co Inc, dba Woodland Global", "agent.quotes@woodlandgroup.com / chris.miller@woodlandgroup.com", "Lead sent", "", ""],
  [232, "Sarthak", "06/02/2026", "Vista Furnishing Pvt Ltd-New Delhi", "https://vistafurnishing.com/contact-us/", "", "Fryetts Fabrics Ltd", "Felixstowe,UK", "Energy Freight Forwarding Ltd", "Matt@energy-freight.com; ian@energy-freight.com", "Lead sent", "Follow up mail sent", ""],
  [233, "Sarthak", "06/02/2026", "MD Foods-Mumbai", "http://www.mdfoods.net/", "bhiwandi", "Spice Flavours Ltd", "Louise,Mauritius", "Freight and Transit Company Limited", "rneerohoo@ftl.mu,mcetiennette@ftl.mu", "Lead sent", "Follow up mail sent", ""],
  [234, "Gautami", "02-06-2026", "Feelwell Garments and Accessories Pvt Ltd", "http://feelwellgarments.com/", "Sion", "Deepa Gurnani LLC", "New York, US", "Rose Containerline Inc", "Aimee@shiprose.com; josh@shiprose.com", "Lead sent", "", ""],
  [235, "Vaishnavi", "09/02/2026", "Alkem Laboratories Ltd-Mumbai", "https://www.alkemlabs.com/", "Lower parel", "ASCEND LABORATORIES LLC", "UNITED STATES", "TLSS Inc.", "nikhil.chandak@transworld.com", "Lead sent", "", ""],
  [236, "Shraddha", "09-02-2026", "Vasu Healthcare Pvt Ltd-Vadodara", "https://www.vasuhealthcare.com/", "Vadodara", "Rowad Aljamal Company Ltd.", "saudi arabia", "Global Bridge Co. Ltd", "saleem@globalbridgegrp.com", "lead sent", "", ""],
  [237, "Vaishnavi", "09-02-2026", "Oriflame India Pvt Ltd", "http://in.oriflame.com/", "", "POLAND HUB OCSA ORIFLAME COSMETICS GLOBAL SA", "Poland", "Polish Forwarding Company Sp. z o.o.", "seafreight@pfc24.pl / airfreight@pfc24.pl", "lead sent", "", ""],
  [239, "Gautami", "10-02-2026", "Navneet Education Limited", "http://www.navneet.com/", "Dadar", "Officeworks Ltd.", "Melbourne,Australia", "Mega Freight Pty Ltd", "sales@megafreight.com.au, nick@megafreight.com.au", "Lead sent", "", ""],
  [240, "Shraddha", "10-02-2026", "Satish Toy Manufacturing LLP-Nashik", "https://satishtoy.com/", "Nashik", "Moose Toys Ltd", "Antwerp,Belgium", "Gate4EU NV.", "gregory.t@gate4eu.be", "lead sent", "", ""],
  [241, "Shraddha", "10-02-2026", "Advy Chemical Pvt Ltd-Mumbai", "http://advychemical.com/", "Thane", "Roche Diagnostics GmbH", "Germany", "V.Alexander Transport Systems GmbH", "jwalgahn@valexandertransport.de", "Lead sent", "", ""],
  [242, "Gautami", "10-02-2026", "Lila Shyam Exports", "http://lilashyam.com/", "", "Toki Tok Internacional S L", "Valencia, Spain", "Herport Logistics Iberica S.A.", "aespejo@herport.es; a.gomez@herport.es; mmas@herport.es", "", "", ""],
  [243, "Sarthak", "12/02/2026", "PARTHICONIC DESIGNS PRIVATE LIMITED", "", "", "Centrum Home Decor Inc", "Toronto,Canada", "HOC Global Solutions", "mayh@hocltd.com", "Lead sent", "Follow up mail sent", ""],
  [244, "Sarthak", "12/02/2026", "Aman Exports-Noida", "https://amanexport.com/en/", "", "World Market Management Services Inc", "Norfolk,USA", "Rose Containerline Inc", "Aimee@shiprose.com", "Lead sent", "Follow up mail sent", ""],
  [245, "Sarthak", "12/02/2026", "Plasma Impex Inc-Noida", "", "", "MANGO MNG SA", "Barcelona,Spain", "Cargojet, S.A.", "sonia@cargojet.es; carlos@cargojet.es", "Lead sent", "Follow up mail sent", ""],
  [246, "Shraddha", "17/02/2026", "Gokaldas Exports Limited", "https://www.gokaldasexports.com/", "", "Old Navy LLC", "Newyork,USA", "Woodland Global Ltd", "chris.miller@woodlandgroup.com", "Lead sent", "", ""],
  [247, "Vaishnavi", "17/02/2026", "Meril Endo Surgery Pvt Ltd-Vapi - ID - 19081058", "https://www.merillife.com/", "", "MERIL TIBBI CIHAZLAR", "Turkey, Istanbul", "Qualitair&sea Lojistik Hiz. A.S.", "bulent.davrak@qualitairsea.com.tr/pricing@qualitairsea.com.tr", "Lead sent", "", ""],
  [248, "Sarthak", "17/02/2026", "Kohinoor Elastics Pvt Ltd", "https://www.kohinoorelastics.com/", "", "Brandix Apparel Pvt. Ltd.", "Colombo,Sri lanka", "SHERMANS LOGISTICS (PVT) LTD", "customersv2@shermanslogistics.com;diruni@shermanslogistics.com;customersv@shermanslogistics.com;sales@shermanslogistics.com", "Lead sent", "Follow up mail sent", ""],
  [249, "Sarthak", "17/02/2026", "P P Bafna Ventures Pvt Ltd-Pune", "https://www.bafnagroup.com/home", "", "DOLLAR TREE MANAGEMENT LLC", "New york,USA", "Anchor Express Inc.", "nelli_grzes@anchorexpressinc.com; vita_pietrzak@anchorexpressinc.com", "Lead sent", "DOLLAR TREE is a massive corporation in the USA. Please provide contact details you would like me to contact.", ""],
  [250, "Sarthak", "17/02/2026", "Manipal Technologies Ltd-Manipal", "https://manipaltechnologies.com/", "", "UITGEVERIJ MALMBERG", "Rotterdam,Netherlands", "Braanker Logistics", "francesca@braanker.com; Lennart@braanker.com", "Lead sent", "Follow up mail sent", ""],
  [251, "Sarthak", "17/02/2026", "Manipal Technologies Ltd-Manipal", "https://manipaltechnologies.com/", "", "SANOMA PRO OY LT", "Helsinki,Finland", "Hacklin Logistics Oy Ltd", "carina.saxberg@hacklin.fi; sales.logistics@hacklin.fi", "Lead sent", "Follow up mail sent", ""],
  [252, "Sarthak", "17/02/2026", "Forms and Surfaces India Pvt Ltd", "https://www.forms-surfaces.com/", "", "Dajit Co Ltd", "Busan,South Korea", "Lodestar Sea & Air Co., Ltd.", "kevinkim@lodestars.com; crisbdg@lodestars.com", "Lead sent", "Follow up mail sent", ""],
  [254, "Vaishnavi", "18/02/2026", "Sun Pharmaceutical Industries Ltd", "https://sunpharma.com/", "", "Yusen Logistics Benelux", "Belgium", "Gate4EU NV.", "an.s@gate4eu.be / groep_export@gate4eu.be", "Lead sent", "", ""],
  [255, "Shraddha", "18/02/2026", "PNG Furnishings Pvt Ltd-Delhi", "", "", "HINCK B V", "Rotterdam , Netherland", "Logicall Ocean Freight B.V.", "j.geerlings@logicall.com;ocean.rtm@logicall.com", "Lead sent", "", ""],
  [256, "Gautami", "18/02/2026", "Marksans Pharma Ltd", "https://www.marksanspharma.com/", "", "Relonchem Ltd", "Southampton, United Kingdom", "Mairon Freight Uk Ltd", "Jamie@mairon.co.uk, jordan@mairon.co.uk", "Lead sent", "", ""],
  [257, "Gautami", "18/02/2026", "KRAFTWARES ( INDIA ) PVT LTD", "", "", "Goyal Group Inc", "New York, US", "Rose Containerline Inc", "Aimee@shiprose.com; josh@shiprose.com", "Lead sent", "", ""],
  [258, "Gautami", "18/02/2026", "Sai Creations", "https://saicreationswatches.com/", "", "Design Dreams Ltd.", "Heathrow, UK", "JAG-UFS (Intl) Ltd", "gary.wilcox@jagufs.com, Andrew.ballard@jagufs.com", "Lead sent", "", ""],
  [259, "Shraddha", "19/02/2026", "Kay International-Bhadohi", "https://www.kayinternational.net/", "", "Marjan International Corporation", "New York, US", "Omni Logistics", "mdavis@omnilogistics.com ,dfwint@omnilogistics.com", "Lead sent", "", ""],
  [260, "Shraddha", "20/02/2026", "Nevatia Steel and Alloys Pvt Ltd-Mumbai", "https://www.nevatiasteel.com/", "Worli, Mumbai", "BWDE", "Germany", "V.Alexander Transport Systems GmbH", "jwalgahn@valexandertransport.de", "Lead sent", "", ""],
  [261, "Gautami", "20/02/2026", "Diamond Metal Screens Pvt Ltd", "https://www.diamondscreens.com/", "Belgaum, Karnataka", "ACURA GROUP AUSTRALIA PTY LTD", "Australia", "AAW Global Logistics Pty", "s.leal@aaw.com.au, c.eckersall@aaw.com.au", "Lead sent", "", ""],
  [262, "Gautami", "20/02/2026", "Alkem Laboratories Ltd", "https://www.alkemlabs.com/", "Lower Parel, Mumbai", "Ascend Laboratories Spa", "Chile", "Tavi Logistics Chile SpA", "jorge.ramirez@tavilogistics.com, andrea.cifuentes@tavilogistics.com", "Lead sent", "", ""],
  [263, "Shraddha", "20/02/2026", "Pyrotek India Pvt Ltd-Shirur", "http://www.pyrotek.com/", "Shikrapur, Maharashtra", "Pyrotek Engineering Materials Ltd", "Rotterdam,Netherlands", "Braanker Logistics", "salim@lantiamaritima.com; agarcia@lantiamaritima.com", "lead sent", "", ""],
  [264, "Gautami", "20/02/2026", "Alembic Pharmaceuticals Ltd", "https://alembicpharmaceuticals.com/", "Gujarat", "Apotex Pty", "Australia", "Plane 2 Sea International", "carolina@plane2sea.com.au; anthony@plane2sea.com.au", "Lead sent", "", ""],
  [265, "Shraddha", "20-02-2026", "MD Foods-Mumbai", "https://mdfoods.net/", "Thane", "Spice Flavours Ltd", "Mauritius", "Freight and Transit Company Limited (FTL)", "agolaup@ftl.mu", "lead sent", "23/02 Spoke to the director, Mr. Krishna, and been informed to call next week for a meeting to discuss.", ""],
  [266, "Sarthak", "23/02/2026", "WILCO INTERNATIONAL LLP-MUMBAI", "https://wilcobooks.com/", "Colaba", "Popular Book Co M Sdn Bhd", "Klang,Malaysia", "Synergy Worldwide Forwarding Sdn Bhd", "clement@synergyworld.com.my; overseas@synergyworld.com.my", "lead sent", "Follow up mail sent", ""],
  [267, "Sarthak", "23/02/2026", "Veritas stainless co pvt ltd", "https://www.veritasstainless.com/", "Charni road", "DANA GAS COMPANY", "Dammam,Saudi", "Transworld Saudi Logistics Co", "sameeulla.gafoor@transworld.com; joseph.mathew@transworld.com", "lead sent", "Follow up mail sent", ""],
  [268, "Shraddha", "23/02/2026", "Primacy Industries Ltd-Udupi", "https://primacyind.com/contact-us-private-label-manufacturers-near-me/", "Mangalore, Karnataka", "KMART AUSTRALIA LTD", "Melbourne ,Australia", "ICAL International Customs And Logistics Pty Ltd", "Daniel.Garcia@ical.com.au", "lead sent", "", ""],
  [269, "Vaishnavi", "23/02/2026", "Century Enka Ltd-Pune", "https://www.centuryenka.com/", "MIDC Bhosari, Pune", "Radici Yarn Villa D Ogna", "Genoa, Italy", "C.T.I. Srl", "aelmi@cti-fwd.com", "lead sent", "", ""],
  [270, "Shraddha", "23/02/2026", "Tastel Fine Food Pvt Ltd-Mumbai", "https://www.tastelfinefood.com/", "Vile Parle, Mumbai", "Passage Foods Pty Ltd", "Rotterdam,Netherlands", "Logicall Ocean Freight B.V.", "j.geerlings@logicall.com", "lead sent", "", ""],
  [271, "Gautami", "24/02/2026", "Jagdish Exports", "", "Panipat", "Home Accent Imports Inc.", "New York, US", "Woodland International Transport Co Inc", "chris.miller@woodlandgroup.com, suresh.daddar@woodlandgroup.com", "lead sent", "", ""],
  [272, "Shraddha", "24-02-26", "Archroma India Pvt Ltd-Thane", "http://www.archroma.com/", "Thane", "Archromaturkey Kimya Sanayi Ve Ticaret Ltd Sirketi", "turkey", "YSL Ulus. Nakl. Dis Tic.A.S", "nazli@yslogistic.com", "", "", ""],
  [273, "Sarthak", "24/02/2026", "Rugs Inc-Noida", "https://rugsinc.in/", "Noida,Delhi", "KM Carpets AB", "Gothenburg,Sweden", "Key Logistics AB", "jennie.kack@keylogistics.se; bjorn.sjoberg@keylogistics.se", "lead sent", "Unfortunately, KM Carpets does not have a public phone number, I've tried to reach them by e-mail.", ""],
  [274, "Sarthak", "24/02/2026", "Rugs Inc-Noida", "https://rugsinc.in/", "Noida,Delhi", "Skeidar Supply Chain AS", "Larvik,Norway", "Scandinavian Logistics Partners AS", "ida.vangen@scanlog.com; anders.oyen@scanlog.com", "lead sent", "This consignee in Norway has their appointed freight forwarder and are unfortunately not willing to switch.", ""],
  [275, "Sarthak", "24/02/2026", "Sharda Exports- Delhi", "https://www.shardaindia.com/", "New Delhi", "Zara Home Logistica", "Valencia,Spain", "Tancomed S.A.", "lherlein@tancomed.es; cfuentes@tancomed.es", "lead sent", "Follow up mail sent", ""],
  [276, "Gautami", "24/02/2026", "Jujan Markfin Pvt Ltd", "https://www.jujanmarkfin.com/", "Noida,Delhi", "NICOLI NETWORK SL", "Barcelona, Spain", "Mega Online Logistics", "sales@megaonlinelogistics.com", "", "", ""],
  [277, "Gautami", "24/02/2026", "GITS Food Products Pvt Ltd", "https://www.gitsfood.com/", "", "TOP-OP FOODS LTD", "Felixstowe, UK", "Energy Freight Forwarding Ltd", "Matt@energy-freight.com, sarah.connell@energy-freight.com", "lead sent", "", ""],
  [278, "Gautami", "25/02/2026", "Prakash Books India Pvt Ltd", "https://prakashbooks.com/", "Daryaganj, New Delhi", "DANUM GLOBAL", "Southampton, United Kingdom", "Britam Shipping Ltd", "Mcroser@bashipping.co.uk", "lead sent", "", ""],
  [279, "Shraddha", "25-02-2026", "Asence Pharma Pvt Ltd-Vadodara", "https://www.asence.com/", "Vadodara", "Raritan Pharmaceuticals Inc.", "united states", "Anchor Express Inc.", "vita_pietrzak@anchorexpressinc.com", "lead sent", "", ""],
  [280, "Sarthak", "25/02/2026", "Sharda Exports- Delhi", "https://www.shardaindia.com/", "New Delhi", "Serena Lily", "Savannah,USA", "Woodland International Transport Co Inc, dba Woodland Global", "chris.miller@woodlandgroup.com", "lead sent", "-", "-"],
  [281, "Gautami", "26-02-2026", "Krishna Sports Industries", "NA", "Jalandhar", "FX Industries CC", "Durban, South Africa", "FTL Freight and Transit", "cwilliams@ftlrsa.co.za", "lead sent", "", ""],
  [282, "Sarthak", "26/02/2026", "Kirloskar Brothers Ltd-Pune", "https://www.kirloskarpumps.com/", "Pune", "SPP PUMPS LTD", "Southampton,UK", "Mairon Freight Uk Ltd", "jordan@mairon.co.uk; Jamie@mairon.co.uk", "lead sent", "Follow up mail sent", "No revert after follow up"],
  [283, "Sarthak", "26/02/2026", "Raychem RPG Pvt Ltd-Mumbai", "https://www.raychemrpg.com/", "Worli", "Tyco Electronics Polska Sp z o o", "Gdynia,Poland", "Forta Logistics SP. Z O.O.", "p.hojda@fortalogistics.pl; p.starosta@fortalogistics.pl", "lead sent", "Follow up mail sent", ""],
  [284, "Sarthak", "26/02/2026", "Horizon Enterprises-Moradabad", "https://horizonscollection.com/", "Moradabad", "ADAIRS RETAIL GROUP PTY LTD", "Melbourne,Aus", "Mega Freight Pty Ltd", "nick@megafreight.com.au; sales@megafreight.com.au", "lead sent", "Adairs is a huge retailer in australia. Without specifi contact people and some referrals form the supplier, they wont talk to us. Can you give more info perhaps?", ""],
  [285, "Sarthak", "26/02/2026", "Bhargava Phytolab Pvt Ltd-Noida", "https://www.bhargavaphytolab.com/", "Noida", "Proyectos Dinamicos Dynapro Sociedad Anonima", "Puerto Quetzal,Guatemala", "Compania de Servicios Logisticos S.A. (CSL)", "jvillanueva@csl-ship.com; dvillanueva@csl-ship.com", "lead sent", "Follow up mail sent", ""],
  [286, "Sarthak", "26/02/2026", "PRIMACY INDUSTRIES PRIVATE LIMITED", "https://primacyind.com/", "Mangalore", "KMART AUSTRALIA LTD", "Brisbane,Aus", "Plane 2 Sea International", "carolina@plane2sea.com.au; ana@plane2sea.com.au", "lead sent", "Response received from carolina", ""],
  [287, "Gautami", "26-02-2026", "Bhaizada Son", "https://bhaizada.com/", "Jalandhar", "TPF Campbellfield Warehouse", "Melbourne, Australia", "ADM GLOBAL", "samantha.cosmano@admglobal.com.au, rina.mclaughlin@admglobal.com.au", "lead sent", "", ""],
  [288, "Gautami", "26-02-2026", "Abhitex International", "https://www.abhitex.com/index.html", "Panipat", "Ross Procurement Inc", "Houston, US", "Balena Projects Ltd", "gafandi@balenaprojects.com", "lead sent", "", ""],
  [289, "Gautami", "26-02-2026", "C Sky International", "https://www.cskyintl.com/", "New Delhi", "TEXTILES Y CONFECCIONES BROWNIE SL", "Barcelona, Spain", "Multitrade Spain SL", "jose.lozano@multitrade-spain.es, abde.charia@multitrade-spain.es", "lead sent", "", ""],
  [290, "Shraddha", "27/02/2026", "Medley Pharmaceuticals Ltd-Mumbai", "https://medleylab.com/", "Andheri east", "Leading Pharma LLC", "New york", "Woodland International Transport Co Inc", "chris.miller@woodlandgroup.com", "lead sent", "", ""],
  [291, "Vaishnavi", "27/02/2026", "Stanley Black and Decker India Pvt Ltd", "https://www.stanleyblackanddecker.com/", "Pune", "Black Decker US Inc", "United states", "Woodland International Transport Co Inc, dba Woodland Global", "georgina.stevens@woodlandgroup.com / chris.miller@woodlandgroup.com", "lead sent", "", ""],
  [292, "Gautami", "27-02-2026", "M D International", "https://mdinternational.co.in/", "Borivali", "New Market Saddlery Muniyer Pty, Ltd", "Sydney", "Plane 2 Sea International", "carolina@plane2sea.com.au", "", "", ""],
  [293, "Vaishnavi", "27-02-2026", "Normet India Pvt Ltd", "https://www.normet.com/en/contact/india/", "New delhi", "Normet International Ltd", "Netherland", "Logicall Airfreight B.V.", "Agents.ams@logicall.com / sales.ams@logicall.com", "lead sent", "", ""],
  [294, "Shraddha", "27/02/2026", "J B Chemicals Pharmaceuticals Ltd", "https://jbpharma.com/", "Prabhadevi, Mumbai", "GEORGE STEUART HEALTH PVT LTD", "colombo", "CLSynergy India (Pvt) Ltd", "dhanushan@clsynergy.in", "lead sent", "", ""],
  [295, "Shraddha", "04/03/2026", "Micro Plastics Pvt Ltd-Bengaluru", "https://microplasticsindia.com/", "Bangalore", "Spin Master International S A R L", "Rotterdam,Netherlands", "Logicall Ocean Freight B.V.", "j.geerlings@logicall.com", "lead sent", "", ""],
  [296, "Sarthak", "05/03/2026", "Outinord Formworks Pvt Ltd-Pune", "https://outinord.in/contact.php", "Pune", "Sateco SAS", "France", "MP Cargo", "Devanshi Ma'am", "lead sent", "-", ""],
  [297, "Sarthak", "05/03/2026", "Sahyog Exports Pvt Ltd-Mumbai", "https://sahyogexports.in/", "Vasai", "Style Network International", "France", "MP Cargo", "Devanshi Ma'am", "lead sent", "-", ""],
  [298, "Shraddha", "05/03/2026", "Seet Kamal Private Limited-Jaipur", "https://www.seetkamal.com/", "Jaipur", "Contigo Fairtrade GmbH", "Germany", "Cargo Movers GmbH", "m.macke@cargomovers.de", "Lead sent", "", ""],
  [299, "Gautami", "05/03/2026", "Precision Camshafts Ltd", "https://pclindia.in/index.php/contact/", "Pune", "General Motors Do Brasil Ltda", "Brazil", "JS Logistica (Jet Speed)", "Janaina.albuquerque@jspeed.com.br", "Lead sent", "", ""],
  [300, "Gautami", "06/03/2026", "Grasim Industries Ltd", "https://www.grasim.com/", "", "ERUSLU SAGLIK URUNERISAN VE TIC", "Turkey", "YSL Ulus. Nakl. Dis Tic.A.S", "nazli@yslogistic.com", "Lead sent", "", ""],
  [301, "Vaishnavi", "06/03/2026", "BIOCHEM PHARMA-Mumbai", "https://biochempharma.in/", "Mumbai", "Yara Barz Company", "Turkey", "Nora Global Logistics", "x2elite@noraglobal.com / x2elite@noraglobal.com", "Lead sent", "", ""],
  [302, "Vaishnavi", "06/03/2026", "Aquarelle India Pvt Ltd", "https://cieltextile.com/", "Bengaluru", "Levi Strauss and Co", "United States", "NTG Air & Ocean", "ryan.sillifant@ariesgl.com", "Lead sent", "", ""],
  [303, "Gautami", "09/03/2026", "Hanning Motors India Pvt Ltd", "https://www.hanning-hmi.com/", "Gujarat", "Hanning Elektro Werke GmbH Co KG", "Germany", "", "", "", "", ""],
  [304, "Shraddha", "09/03/2026", "Taj Frozen Foods India Ltd-Pune", "https://www.tajfoods.net/", "Pune", "Vibrant Brands Ltd", "United kingdom", "Energy Freight Forwarding Ltd", "Matt@energy-freight.com", "Lead sent", "", ""],
  [305, "Vaishnavi", "09/03/2026", "VBL Innovations Pvt Ltd", "http://www.vblinnovations.com/", "Bengaluru", "Timex Nederland B V", "Netherland", "Logicall Ocean Freight B.V.", "Agents.ams@logicall.com / ocean.rtm@logicall.com", "Lead sent", "", ""],
  [306, "Shraddha", "09/03/2026", "Sami Spices and Herbs Pvt Ltd-MUMBAI", "https://samispices.com/", "Bengaluru", "Natco Foods Ltd.", "United Kingdom", "JAG-UFS (Intl) Ltd", "Andrew.ballard@jagufs.com", "Lead sent", "", ""],
  [307, "Gautami", "11/03/2026", "FR Solutions Private Limited", "https://www.frsolutionspl.com/", "Bhiwandi", "PIONEER THREE GLOBAL LLC Limited Liability Company", "Oman", "Doroob Logistics & Marine Services International LLC", "chanaka@dorooblogistics.com", "Lead sent", "", ""],
  [308, "Vaishnavi", "12/03/2026", "NUTECH PRINT SERVICES PRIVATE LIMITED", "https://nutechprint.com/", "New Delhi", "TYNDALE HOUSE PUBLISHERS", "United States", "Anchor Express Inc.", "X2@anchorexpressinc.com", "Lead sent", "", ""],
  [309, "Gautami", "12/03/2026", "Owens Corning India Pvt Ltd", "", "", "Owens Corning Singapore Pte Ltd", "Singapore", "SBS Logistics Singapore Pte Ltd", "John.soo@rlsc.sbs-group.com", "Lead sent", "", ""],
  [310, "Gautami", "12/03/2026", "Sava Healthcare Ltd", "https://savaglobal.com/", "Gujarat", "Regency Pharma Limited", "Mauritius", "Freight and Transit Company Limited (FTL)", "mcetiennette@ftl.mu", "Lead sent", "", ""],
  [311, "Sarthak", "13/03/2026", "FOUNDTECH INTERNATIONAL IMPEX PRIVATE LIMITED", "", "Mumbai", "MD IRON STEEL FOUNDRY SARL", "Morocco", "Global Cargo Leader", "exploitation@gcl.ma; sales2@gcl.ma", "Lead sent", "Follow up mail sent", ""],
  [312, "Gautami", "13/03/2026", "PRISM BIO PHARMA PRIVATE LIMITED", "", "Gujarat", "National Pharmacy Ltd", "Kenya", "Boldline Shipping Services Ltd.", "", "", "", ""],
  [313, "Sarthak", "13/03/2026", "Universal Textile Mills-Bengaluru", "https://www.utm.co.in/", "Bangalore", "Damaceno Antunes Tecidos De Decoracao Lda", "Portugal", "Intersped-Transitos Navegao,LDA", "jorge@intersped.pt; anabela@intersped.pt; vilarinho@intersped.pt", "Lead sent", "Follow up mail sent", ""],
  [314, "Sarthak", "13/03/2026", "Rishi Techtex Ltd-Mumbai", "https://www.rishitechtex.com/", "Mumbai", "Industrias Agricolas Centro America", "Guatemala", "Compania de Servicios Logisticos S.A. (CSL)", "dvillanueva@csl-ship.com; lvillanueva@csl-ship.com", "Lead sent", "Follow up mail sent", ""],
  [315, "Gautami", "16/03/2026", "Wellona Pharma", "", "", "Pharmadjo Sarl", "Douala, Cameroon", "", "", "", "", ""],
  [316, "Shraddha", "14/03/2026", "Wirtgen India Pvt Ltd-Pune", "https://www.wirtgen-group.com/en-in/", "Pune", "Wirtgen America Inc.", "United states", "Omni Logistics", "mdavis@omnilogistics.com", "Lead sent", "", ""],
  [317, "Shraddha", "16/03/2026", "Pan Creations India-BHILWARA", "https://pancreationsindia.com/", "Bhilwara", "Slate Design Kft", "Hungary", "SME - Europe Kft.", "daniel.benke@sme-europe.com", "Lead sent", "", ""],
  [318, "Sarthak", "16/03/2026", "BSL Ltd-Bhilwara", "https://www.bslltd.com/", "Bhilwara", "Novo Banco S A", "Portugal", "AASMVAZ, LDA", "jose.ferrao@aasmvaz.pt; esperanca.martins@aasmvaz.pt", "Lead sent", "Follow up mail sent", ""],
  [319, "Vaishnavi", "16/03/2026", "Aachi Masala Foods Pvt Ltd", "https://aachifoods.com/", "Chennai", "VADILAL INDUSTRIES USA INC", "United states", "Tech Cargo", "alberto.campo@techcargo.com", "Lead sent", "", ""],
  [320, "Sarthak", "16/03/2026", "BSL Ltd-Bhilwara", "https://www.bslltd.com/", "Bhilwara", "I YES INDUSTRIAL", "South Korea", "Cargo-Meca Logistics., Ltd", "mjlee@cargo-meca.com; Info@cargo-meca.com", "Lead sent", "Follow up mail sent", ""],
  [321, "Sarthak", "16/03/2026", "B M House India Ltd-New Delhi", "https://bmhouse.in/", "Delhi", "Banco Comercial Portugues", "Portugal", "AASMVAZ, LDA", "jose.ferrao@aasmvaz.pt; esperanca.martins@aasmvaz.pt", "Lead sent", "Follow up mail sent", ""],
  [322, "Sarthak", "16/03/2026", "Madhu Instruments Pvt Ltd-New Delhi", "https://www.madhuinstruments.com/", "Delhi", "ESPANSIONE MARKETING SPA", "Italy", "TEC Cargo Italia S.R.L.", "Federico.bracci@teccargoitalia.it; silvia.faiella@teccargoitalia.it", "Lead sent", "Response received", "Follow up mail sent"],
  [323, "Sarthak", "16/03/2026", "Madhu Instruments Pvt Ltd-New Delhi", "https://www.madhuinstruments.com/", "Delhi", "OPTOTECH MEDICAL SP Z O O SP K", "Poland", "Forta Logistics SP. Z O.O.", "p.starosta@fortalogistics.pl; p.hojda@fortalogistics.pl", "Lead sent", "Follow up mail sent", ""],
  [324, "Gautami", "17/03/2026", "Hadeed Impex", "", "", "CARMEN ANETA ZDYB", "Poland", "", "", "", "", ""],
  [325, "Vaishnavi", "20/03/2026", "Tets N Rai-NEW DELHI", "https://tnr.co.in/pages/contact-us/", "Delhi", "Old Navy LLC", "United States", "Cargo Tours International", "Fcipollone@cargotours.com", "Lead sent", "", ""],
  [326, "Shraddha", "21-03-2026", "Ambika Global Foods and Beverages Pvt Ltd-Mumbai", "https://www.ambikaglobal.com/", "Lower Parel, Mumbai", "Harmony Ambika House", "Japan", "Knot Global Holdings Co., Ltd.", "X2@knotglobal-hd.com", "Lead sent", "", ""],
  [327, "Shraddha", "24-03-2026", "Grasper Global Pvt Ltd-Mumbai", "https://www.skillmatics.in/?srsltid=AfmBOor8nK-UnbS8vua7cowxRiyj3GAPTNbVpyQ2OM68f91U9_H_jb0Z", "Prabhadevi, Mumbai", "Grasper Global Inc", "UNITED STATES", "Omni Logistics", "mdavis@omnilogistics.com", "Lead sent", "", ""],
  [328, "Gautami", "24-03-2026", "ANSARI RUG BAZAR", "https://www.ansarirugbazar.com/", "", "Momeni Inc", "Savannah,USA", "Sobel Network Shipping Co., Inc.", "jennifers@sobelnet.com", "Lead sent", "", ""],
  [329, "Vaishnavi", "24-03-2026", "Panorama Exports Pvt Ltd-Delhi - ID - 19114842", "https://www.panoramaexports.co.in/", "New Delhi", "Tesco Stores Ltd", "United Kingdom", "", "jordan@mairon.co.uk", "Lead sent", "", ""],
  [330, "Gautami", "24-03-2026", "ASB INTERNATIONAL PVT. LTD.", "https://www.asbindia.com/contact.html", "Ambernath", "Nissei ASB GmbH", "Germany", "CGATE Logistics GmbH", "fla@cgate-logistics.com", "Lead sent", "", ""],
  [331, "Gautami", "27-03-2026", "Medley Pharmaceuticals Ltd", "https://medleylab.com/index.html", "Andheri", "MEDLEY PHARMA LTD", "Southampton, UK", "Mairon Freight Uk Ltd", "jordan@mairon.co.uk", "Lead sent", "", ""],
  [332, "Shraddha", "27-03-2026", "Magick Woods Exports Pvt Ltd-Kancheepuram", "https://www.magickwoods.com/", "Kancheepuram", "Magick Woods Canada Inc", "Canada", "HOC Global Solutions", "frankw@hocltd.com", "Lead sent", "Many thanks for the lead however we have a previous history with this account and not interested. They are a bunch of crooks who routinely declare bankruptcy and then start up again. Cost us over $100,000.00 going back a few years. Be careful", ""],
  [333, "Vaishnavi", "27-03-2026", "Parsons Overseas-Mumbai - ID - 19101832", "https://parsonsoverseas.com/", "Prabhadevi", "Mystic Weaves Inc", "United States", "Rose Containerline Inc", "Aimee@shiprose.com /ageorge@shiprose.com", "Lead sent", "", ""],
  [334, "Vaishnavi", "27-03-2026", "Honda Cars India Ltd-Noida", "http://www.hondacarindia.com/", "Noida", "Honda Automoveis Do Brasil Ltd", "Brazil", "JS Logistica (Jet Speed)", "Janaina.albuquerque@jspeed.com.br", "Lead sent", "", ""],
  [335, "Shraddha", "27-03-2026", "Orient Home Tex-Karnal", "https://www.orient-hometex.com/contact.html", "Haryana", "LULU AND GEORGIA 5410 WILSHIRE BLVD SUITE 206 LOS ANGELES CA 90036", "United States", "Omni Logistics", "agentnetwork@omnilogistics.com", "Lead sent", "", ""],
  [336, "Shraddha", "27-03-2026", "TULSI RAM GAYA PRASAD PVT LTD-MAHARAJGANJ", "http://www.tulsiramrugs.com/", "Uttar Pradesh", "MIO AB", "Sweden", "Key Logistics AB", "jennie.kack@keylogistics.se", "Lead sent", "", ""],
  [337, "Gautami", "27-03-2026", "Sea Land Impex Pvt Ltd", "NA", "Karur", "Sri Ambikas Pte. Ltd.", "Singapore", "Kashin Shipping Pte Ltd", "operation@kashinshipping.com.sg", "Lead sent", "", ""],
  [338, "Gautami", "30-03-2026", "T C Terrytex Ltd", "https://tctl.in/", "Mohali", "Kmart NZ Holdings Ltd", "New Zealand", "ACE Global Logistics", "vera@acegloballogistics.com", "Lead sent", "", ""],
  [339, "Shraddha", "30-03-2026", "Brintons Carpets Asia Pvt Ltd-Pune", "https://www.brintons.co.in/", "Mulshi, Pune", "Brintons Pty Ltd", "Melbourne, Australia", "ADM GLOBAL", "samantha.cosmano@admglobal.com.au, rina.mclaughlin@admglobal.com.au", "lead sent", "", ""],
  [340, "Gautami", "30-03-2026", "GRIPWELL FORGINGS AND TOOLS", "https://www.gripwell.in/", "Punjab", "GRIPWELL AUSTRALIA PTY LTD BUNNIN", "Australia", "Plane 2 Sea International", "carolina@plane2sea.com.au", "Lead sent", "", ""],
  [341, "Sarthak", "31/03/2026", "ANHUI SURMOUNT NEW MATERIALS CO LTD", "https://smt329.en.made-in-china.com/", "china", "Sedaxis Advanced Materials Pvt Ltd-Kozhikode", "china-import", "AOF Cargo Logistics Co., Ltd.", "c.k.ho@aifchina.com; danielle.chen@aofcargo.com.tw", "Lead sent", "Follow up mail sent", ""],
  [342, "Vaishnavi", "01/04/2026", "Eastern Petroleum Pvt Ltd-Mumbai", "https://www.easternpetroleum.in/", "Mumbai", "JSC PHS-LEKSREDSTVA", "Russia", "Growex LLC", "sales4@growex-group.ru; economist2@growex-group.ru", "Lead sent", "", ""],
  [343, "Sarthak", "01/04/2026", "Keval Exports Pvt Ltd-Navi Mumbai", "https://kevalexports.in/", "Navi mumbai", "GELDA SCIENTIFIC INDUSTRIAL DEVELOPMENT CORPORATION", "Canada", "HOC Global Solutions", "frankw@hocltd.com; mayh@hocltd.com", "Lead sent", "I did get in touch with their local person (Gemala) but they are not even interested to get a quote form us", ""],
  [344, "Sarthak", "01/04/2026", "Keval Exports Pvt Ltd-Navi Mumbai", "https://kevalexports.in/", "Navi mumbai", "OM Trading Inc.", "USA", "Omni Logistics", "dfwint@omnilogistics.com; mdavis@omnilogistics.com", "Lead sent", "Follow up mail sent", ""],
  [345, "Sarthak", "01/04/2026", "USV Private Limited-Mumbai", "https://www.usvindia.com/", "Mumbai", "HEMAS PHARMACEUTICALS PVT LTD", "Srilanka", "ASB Freight (Pvt) Ltd", "sanjeeva@asbcmb.com; heshan@asbcmb.com; rajiv_perera@asbcmb.com", "Lead sent", "Follow up mail sent", ""],
  [346, "Sarthak", "01/04/2026", "USV Private Limited-Mumbai", "https://www.usvindia.com/", "Mumbai", "Juta Pharma GmbH", "Germany", "Cargo Movers GmbH", "d.mattern@cargomovers.de; d.borgmann@cargomovers.de; k.wichmann@cargomovers.de", "Lead sent", "Follow up mail sent", ""],
  [347, "Gautami", "01/04/2026", "Artisan Exports-Agra", "NA", "Agra", "Vaughan Ltd", "Felixstowe", "Energy Freight Forwarding Ltd", "Matt@energy-freight.com", "Lead sent", "", ""],
  [348, "Gautami", "01/04/2026", "Khadi Natural Healthcare", "https://www.khadinatural.com/", "Delhi", "UAB AB TRANS", "Lithuania", "Baltic Marine Spedition", "sales@balticmarine.lt", "Lead sent", "", ""],
  [349, "Shraddha", "01/04/2026", "Manglam Arts-Jaipur", "https://manglam.com/", "Govind Nagar, Jaipur", "Arhaus LLC", "United States", "Omni Logistics", "agentnetwork@omnilogistics.com", "Lead sent", "", ""],
  [350, "Vaishnavi", "02/04/2026", "Jodhani Brothers-Mumbai", "http://www.jodhani.in/", "Kurla", "JB JEWELS HK LTD", "China", "YZ Freight Agency (China) Ltd", "mgt-sha@yz-freight.cn", "Lead sent", "", ""],
  [351, "Vaishnavi", "02/04/2026", "Star Rays-Surat", "http://starrays.com/", "Surat", "Star Rays Diamond HK Ltd", "China", "YZ Freight Agency (China) Ltd", "mgt-sha@yz-freight.cn", "Lead sent", "", ""],
  [352, "Shraddha", "03/04/2026", "Indian Art Gallery-Bhadohi", "https://www.indianartgallery.in/", "Bhadohi", "Kwantum B V", "Netherlands", "Pentagon International B.V.", "maurice.reijntjes@pentagonfreight.com", "lead sent", "", ""],
  [353, "Shraddha", "03/04/2026", "Jahan Rugs-Bhadohi", "https://jahanrugs.com/", "Main Road, Bhadohi", "ARMADILLO AND CO PTY", "Sydney, Australia", "ADM GLOBAL", "samantha.cosmano@admglobal.com.au, rina.mclaughlin@admglobal.com.au", "lead sent", "", ""],
  [354, "Sarthak", "06/04/2026", "Egiant Agroconnect Pvt Ltd-Pune", "https://www.egiant.in/", "pune", "RG Brothers", "Colombo", "Envio Global Logistics Pvt. Ltd.", "info@envio.lk; cs@envio.lk", "lead sent", "Thank you for the sales leads, let me approach them and get back.", "Follow up mail sent"],
  [355, "Gautami", "06/04/2026", "HEET HEALTHCARE PVT LTD", "https://www.heethealthcare.com/", "Ahmedabad", "KONRAD BRODZICKI", "Poland", "", "", "", "", ""],
  [356, "Sarthak", "08/04/2026", "Armani Industries India Pvt Ltd-Bhilwara", "https://www.armaniexports.com/", "Mumbai", "COMERCIAL TEXTIL S A", "Peru", "Tristar Logistics Peru", "kristopher@tlp.com.pe; veronica@tlp.com.pe", "lead sent", "", ""],
]

async function main() {
  const pool = await sql.connect(config)
  console.log(`Connected to ${config.database}. Seeding ${ROWS.length} leads…`)

  const existing = await pool.request().query(
    "SELECT REF_CODE FROM [dbo].[TBL_SALES_LEADS]"
  )
  const have = new Set<string>(existing.recordset.map((r: { REF_CODE: string }) => r.REF_CODE))

  let inserted = 0, skipped = 0
  const now = new Date()

  for (const row of ROWS) {
    const [num, sentBy, dateRaw, shipper, website, city, consignee, country, agentName, agentEmail, statusRaw, remarks, remarks2] = row
    const ref = `MPC-SL-2026-${num}`
    if (have.has(ref)) { skipped++; continue }

    await pool.request()
      .input("ref",         ref)
      .input("sent_by",     trunc(sentBy.toUpperCase(), 50))
      .input("date_sent",   parseDate(ref, dateRaw))
      .input("shipper",     trunc(shipper, 255))
      .input("website",     trunc(website, 500))
      .input("city",        trunc(city, 255))
      .input("consignee",   trunc(consignee, 255))
      .input("country",     trunc(country, 150))
      .input("agent_name",  trunc(agentName, 255))
      .input("agent_email", trunc(agentEmail, 500))
      .input("status",      normStatus(statusRaw))
      .input("remarks",     trunc(remarks, 2000))
      .input("remarks_2",   trunc(remarks2, 2000))
      .input("notes",       trunc(statusNote(statusRaw), 2000))
      .input("now",         now)
      .query(`
        INSERT INTO [dbo].[TBL_SALES_LEADS] (
          REF_CODE, SENT_BY, DATE_SENT, SHIPPER, SHIPPER_WEBSITE, CITY,
          CONSIGNEE, DEST_COUNTRY, AGENT_NAME, AGENT_EMAIL, STATUS,
          REMARKS, REMARKS_2, NOTES, CREATED_BY, CREATED_AT, UPDATED_AT
        ) VALUES (
          @ref, @sent_by, @date_sent, @shipper, @website, @city,
          @consignee, @country, @agent_name, @agent_email, @status,
          @remarks, @remarks_2, @notes, 'EXCEL_IMPORT', @now, @now
        )
      `)
    inserted++
  }

  console.log(`Done. Inserted ${inserted}, skipped ${skipped} (already present).`)
  const count = await pool.request().query("SELECT COUNT(*) AS cnt FROM [dbo].[TBL_SALES_LEADS]")
  console.log(`TBL_SALES_LEADS total rows: ${count.recordset[0].cnt}`)
  await pool.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
