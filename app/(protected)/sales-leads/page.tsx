"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SalesLeadForm } from "@/components/sales-leads/SalesLeadForm"
import { SalesLeadList, type SalesLead } from "@/components/sales-leads/SalesLeadList"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, X, List } from "lucide-react"

interface UserInfo { role: string; salesperson: string | null }

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

export default function SalesLeadsPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [rows, setRows]         = useState<SalesLead[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<SalesLead | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from("user_profiles")
        .select("role, salesperson")
        .eq("id", user.id)
        .single()
      setUserInfo({ role: data?.role ?? "sales", salesperson: data?.salesperson ?? null })
    })
  }, [])

  const fetchLeads = useCallback(() => {
    setLoading(true)
    fetch("/api/sales-leads")
      .then((r) => r.json())
      .then((data: SalesLead[]) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7)
    return {
      total:     rows.length,
      month:     rows.filter((r) => r.date_sent?.startsWith(thisMonth)).length,
      responses: rows.filter((r) =>
        ["RESPONSE_RECEIVED", "MEETING_SCHEDULED", "QUOTED", "WON"].includes(r.status ?? "")
      ).length,
      won:       rows.filter((r) => r.status === "WON").length,
    }
  }, [rows])

  function handleSuccess(_id: string, refCode: string | undefined, isEdit: boolean) {
    setShowForm(false)
    setEditing(null)
    fetchLeads()
    setSavedMsg(isEdit ? "Lead updated." : `Lead created${refCode ? ` — ${refCode}` : ""}.`)
    setTimeout(() => setSavedMsg(null), 4000)
  }

  const isAdmin = userInfo?.role === "admin"

  return (
    <div className="p-4 max-w-screen-xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Sales Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track leads sent to overseas agents — responses, follow-ups, and outcomes
          </p>
        </div>
        {!showForm && !editing && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Lead
          </Button>
        )}
      </div>

      {/* ── Quick stats (scoped to visible rows) ─────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label={isAdmin ? "Total Leads" : "My Leads"} value={stats.total} />
        <MiniStat label="This Month" value={stats.month} />
        <MiniStat label="Responses" value={stats.responses} />
        <MiniStat label="Won" value={stats.won} />
      </div>

      {/* ── Create / Edit form ────────────────────────────── */}
      {(showForm || editing) && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {editing ? `Edit Lead — ${editing.ref_code}` : "New Sales Lead"}
            </h2>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditing(null) }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SalesLeadForm
            editing={editing}
            defaultSalesPerson={userInfo?.salesperson ?? undefined}
            onSuccess={handleSuccess}
            onCancel={() => { setShowForm(false); setEditing(null) }}
          />
        </div>
      )}

      {savedMsg && (
        <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 px-4 py-2.5 text-sm text-green-700 dark:text-green-300">
          {savedMsg}
        </div>
      )}

      {/* ── Lead list ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <List className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">
            {isAdmin ? "All Leads" : "My Leads"}
          </span>
        </div>
        <SalesLeadList
          rows={rows}
          loading={loading}
          onEdit={(l) => {
            setEditing(l)
            setShowForm(false)
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
        />
      </div>
    </div>
  )
}
