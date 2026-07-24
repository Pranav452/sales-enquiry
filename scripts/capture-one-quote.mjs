// One-shot capture of ONE's real vessel-dates-booking request body.
// Run:  node scripts/capture-one-quote.mjs
// A visible Chrome opens on ONE QUOTE. YOU log in + fill a quote + hit GetQuote.
// This script prints the exact POST body ONE sends, so we can fix quote.ts.
// It captures the request body only — no credentials are handled here.

import { chromium } from "playwright"

const QUOTE_URL = "https://ecomm.one-line.com/one-ecom/prices/one-quote-booking"

const browser = await chromium.launch({ headless: false })
const ctx = await browser.newContext()
const page = await ctx.newPage()

let got = 0
page.on("request", (req) => {
  const u = req.url()
  // The pricing grid call + a couple of sibling calls worth seeing.
  if (
    /\/api\/v2\/quotation\/schedules\/(vessel-dates-booking|schedule-rates-information)/.test(u) ||
    /\/api\/v2\/quotation\/trips/.test(u)
  ) {
    got++
    console.log("\n=== CAPTURED", req.method(), u)
    const body = req.postData()
    if (body) console.log("BODY:", body)
    else console.log("(no body — GET query is in the URL above)")
    console.log("=== end capture", got, "\n")
  }
})

// Also grab RESPONSE bodies for the calls that feed the quote chain:
//  - locations           → name/rhq mapping
//  - trips               → service scope for the lane
//  - schedule-rates-information → serviceScope + commodityGroups + sessionId flow
let loc = 0
page.on("response", async (res) => {
  const u = res.url()
  const isLoc = /\/api\/v2\/quotation\/locations\?/.test(u)
  const isTrips = /\/api\/v2\/quotation\/trips\?/.test(u)
  const isRates = /\/api\/v2\/quotation\/schedules\/schedule-rates-information/.test(u)
  if (!isLoc && !isTrips && !isRates) return
  if (isLoc && loc >= 1) return
  try {
    const text = await res.text()
    if (isLoc) loc++
    const label = isLoc ? "LOCATIONS" : isTrips ? "TRIPS" : "SCHEDULE-RATES-INFO"
    console.log(`\n=== ${label} RESPONSE`, u)
    // trips/rates can be large; trim but keep enough to see structure.
    console.log(text.slice(0, isRates ? 2500 : 1500))
    console.log(`=== end ${label}\n`)
  } catch {
    /* ignore */
  }
})

console.log("\nOpening ONE QUOTE. Log in, fill a lane (e.g. Nhava Sheva -> Rotterdam,")
console.log("DRY20, qty 1, 18000 KGS, FAK DRY) and click GetQuote / pick a date.")
console.log("The POST body will print here. Press Ctrl+C when done.\n")

await page.goto(QUOTE_URL, { waitUntil: "domcontentloaded" })

// Keep the process alive until Ctrl+C.
await new Promise(() => {})
