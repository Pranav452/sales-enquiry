export const runtime = "nodejs"
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are an expert freight rate analyst and quotation advisor for Manilal Patil Shipping, a leading freight forwarding company.

You have access to LIVE freight rate data from the company's database which will be provided to you in each message.

Your role:
- Help users find the best shipping rates for their routes
- Recommend the best shipping line based on price, transit time, and reliability
- Explain surcharges and what they mean in plain English
- Advise on best routes (via ports, transit options)
- Compare shipping lines objectively
- Flag rates that are expiring soon
- Give practical advice on Incoterms, container types, and documentation
- Answer questions about specific destinations, transit times, and costs

Tone: Professional but friendly. Be concise and direct. Use bullet points for comparisons.

When recommending rates:
- Always mention the validity dates
- Explain key surcharges clearly (EFS = Emergency Fuel Surcharge, BUC = Bunker, etc.)
- Highlight the best value option and the fastest option separately
- If transit days are available, use them in your recommendation
- Mention via ports if relevant

IMPORTANT: Only use data from the rate database provided. Never invent rates or surcharges.`

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json() as {
      message: string
      history: ChatMessage[]
      origin?: string
      dest?: string
    }

    if (!body.message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // ── Fetch relevant rates from DB ─────────────────────────
    const pool = await getPool("manilal")
    let ratesContext = ""

    try {
      // Fetch all active rates (or filter by origin/dest if provided)
      const request = pool.request()
      let where = "WHERE IS_ACTIVE = 1"

      if (body.origin && body.dest) {
        request.input("origin", body.origin.toUpperCase())
        request.input("dest", body.dest.toUpperCase())
        where = "WHERE IS_ACTIVE = 1 AND ORIGIN_COUNTRY = @origin AND DEST_COUNTRY = @dest"
      }

      const result = await request.query(`
        SELECT TOP 200
          SHIPPING_LINE, ORIGIN_COUNTRY, DEST_COUNTRY,
          ORIGIN_PORT, DEST_PORT, CURRENCY,
          RATE_20, RATE_40, VALID_FROM, VALID_TO,
          TRANSIT_DAYS, VIA_PORT, SURCHARGES, NOTES, CLAUSES
        FROM [dbo].[FREIGHT_RATES]
        ${where}
        ORDER BY VALID_TO DESC, SHIPPING_LINE ASC
      `)

      if (result.recordset.length > 0) {
        ratesContext = result.recordset.map((r) => {
          const parts = [
            `${r.SHIPPING_LINE}: ${r.ORIGIN_COUNTRY} → ${r.DEST_COUNTRY}`,
            r.DEST_PORT ? `Port: ${r.DEST_PORT}` : null,
            r.RATE_20  != null ? `20': ${r.CURRENCY} ${r.RATE_20}` : null,
            r.RATE_40  != null ? `40': ${r.CURRENCY} ${r.RATE_40}` : null,
            r.VALID_FROM && r.VALID_TO ? `Valid: ${r.VALID_FROM} to ${r.VALID_TO}` : null,
            r.TRANSIT_DAYS ? `Transit: ${r.TRANSIT_DAYS} days` : null,
            r.VIA_PORT  ? `Via: ${r.VIA_PORT}` : null,
            r.SURCHARGES ? `Surcharges: ${r.SURCHARGES}` : null,
            r.NOTES     ? `Notes: ${r.NOTES}` : null,
          ].filter(Boolean).join(" | ")
          return parts
        }).join("\n")
      } else {
        ratesContext = "No rates found in database for this query."
      }
    } catch (dbErr) {
      console.error("[chat] DB error:", dbErr)
      ratesContext = "Rate database temporarily unavailable."
    }

    // ── Build messages for GPT-4o mini ───────────────────────
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n--- CURRENT RATE DATABASE ---\n${ratesContext}\n--- END OF RATE DATA ---`,
      },
      ...body.history.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: body.message },
    ]

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      temperature: 0.4,
      messages,
    })

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response."

    return NextResponse.json({ reply })
  } catch (err: unknown) {
    console.error("[chat] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat failed" },
      { status: 500 }
    )
  }
}
