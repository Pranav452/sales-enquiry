"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"

interface Enquiry {
  id: string
  enq_ref_no: string | null
  enq_receipt_date: string | null
  enq_type: string | null
  mode: string | null
  exim: string | null
  sales_person: string | null
  shipper: string | null
  consignee: string | null
  status: string | null
  branch: string | null
}

function statusVariant(status: string | null) {
  switch (status) {
    case "Win": return "success"
    case "Lose": return "danger"
    case "Follow Up": return "warning"
    case "Quote Pending": return "info"
    default: return "secondary"
  }
}

export function EnquiryList() {
  const supabase = createClient()
  const [rows, setRows] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      let query = supabase
        .from("enquiries")
        .select("id,enq_ref_no,enq_receipt_date,enq_type,mode,exim,sales_person,shipper,consignee,status,branch")
        .order("created_at", { ascending: false })
        .limit(50)

      // Sales users only see their own
      if (!profile || profile.role !== "admin") {
        query = query.eq("created_by", user.id)
      }

      const { data } = await query
      setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="px-6 py-8 text-sm text-muted-foreground text-center">
        Loading enquiries...
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="px-6 py-8 text-sm text-muted-foreground text-center">
        No enquiries yet. Submit the first one above.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {["Enq No", "Date", "Type", "Mode", "EXIM", "Shipper", "Consignee", "Sales Person", "Branch", "Status"].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/50 hover:bg-neutral-50 transition-colors">
              <td className="px-4 py-3 font-mono text-blue-600 font-medium whitespace-nowrap">
                {r.enq_ref_no ?? "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {r.enq_receipt_date
                  ? new Date(r.enq_receipt_date).toLocaleDateString("en-GB")
                  : "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{r.enq_type ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap">{r.mode ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap">{r.exim ?? "—"}</td>
              <td className="px-4 py-3 max-w-[140px] truncate">{r.shipper || "—"}</td>
              <td className="px-4 py-3 max-w-[140px] truncate">{r.consignee || "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap">{r.sales_person ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap">{r.branch ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Badge variant={statusVariant(r.status) as "success" | "danger" | "warning" | "info" | "secondary"}>
                  {r.status ?? "—"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
