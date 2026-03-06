"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface Enquiry {
  id: string
  enq_ref_no: string | null
  enq_receipt_date: string | null
  enq_type: string | null
  mode: string | null
  exim: string | null
  fn: string | null
  sales_person: string | null
  agent_name: string | null
  country: string | null
  branch: string | null
  network: string | null
  pol: string | null
  pod: string | null
  incoterms: string | null
  container_type: string | null
  status: string | null
  email_subject_line: string | null
  shipper: string | null
  consignee: string | null
  remarks: string | null
}

function statusVariant(status: string | null) {
  const s = (status ?? "").toUpperCase()
  switch (s) {
    case "WIN":
      return "success"
    case "LOSE":
      return "danger"
    case "FOLLOW UP":
      return "warning"
    case "QUOTED":
    case "PENDING":
    case "NO FEEDBACK":
      return "info"
    default:
      return "secondary"
  }
}

interface EnquiryListProps {
  onSelectEnquiry?: (row: Enquiry) => void
  editingId?: string | null
}

export function EnquiryList({ onSelectEnquiry, editingId }: EnquiryListProps) {
  const supabase = createClient()
  const [rows, setRows] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const filteredRows = useMemo(() => {
    return rows.filter(
      (r) =>
        !search ||
        (r.enq_ref_no ?? "").toLowerCase().includes(search.trim().toLowerCase())
    )
  }, [rows, search])

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
        .select("id,enq_ref_no,enq_receipt_date,enq_type,mode,exim,fn,sales_person,agent_name,country,branch,network,pol,pod,incoterms,container_type,status,email_subject_line,shipper,consignee,remarks")
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
    <div>
      <div className="px-6 py-3 border-b border-border flex justify-end">
        <Input
          type="search"
          placeholder="Search by Enquiry No"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search enquiries by enquiry number"
        />
      </div>
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
          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-8 text-sm text-muted-foreground text-center">
                No enquiries match your search.
              </td>
            </tr>
          ) : (
          filteredRows.map((r) => (
            <tr
              key={r.id}
              className={cn(
                "border-b border-border/50 hover:bg-accent transition-colors",
                editingId === r.id && "bg-primary/10 dark:bg-primary/20"
              )}
            >
              <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">
                {onSelectEnquiry ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectEnquiry(r)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className="text-blue-600 hover:underline text-left"
                    aria-label={`Edit enquiry ${r.enq_ref_no ?? r.id}`}
                  >
                    {r.enq_ref_no ?? "—"}
                  </button>
                ) : (
                  <span className="text-blue-600">{r.enq_ref_no ?? "—"}</span>
                )}
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
          ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  )
}
