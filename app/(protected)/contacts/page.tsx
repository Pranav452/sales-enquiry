"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ActivityForm } from "@/components/activities/ActivityForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Upload,
  Search,
  X,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
  Package,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────

interface Contact {
  id: string
  shipper_name: string | null
  consignee_name: string | null
  mode: string | null
  pol: string | null
  pod: string | null
  contact_person: string | null
  contact_number: string | null
  email: string | null
  created_by: string | null
  created_at: string | null
}

interface ParsedRow {
  shipper_name: string
  consignee_name: string
  mode: string
  pol: string
  pod: string
  contact_person: string
  contact_number: string
  email: string
}

// ─── Helper ────────────────────────────────────────────────────

const PAGE_SIZE = 20

function highlight(text: string, query: string) {
  if (!query || !text) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Preview modal ─────────────────────────────────────────────

function PreviewModal({
  rows,
  onConfirm,
  onCancel,
  saving,
}: {
  rows: ParsedRow[]
  onConfirm: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Preview Extracted Contacts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rows.length} contact{rows.length !== 1 ? "s" : ""} found — review before importing
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/60 border-b border-border">
              <tr>
                {["#", "Shipper", "Consignee", "Mode", "POL", "POD", "Contact Person", "Phone", "Email"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={cn("border-b border-border/40", i % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-medium max-w-[160px] truncate">{r.shipper_name || "—"}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate">{r.consignee_name || "—"}</td>
                  <td className="px-3 py-2">{r.mode || "—"}</td>
                  <td className="px-3 py-2">{r.pol || "—"}</td>
                  <td className="px-3 py-2">{r.pod || "—"}</td>
                  <td className="px-3 py-2">{r.contact_person || "—"}</td>
                  <td className="px-3 py-2">{r.contact_number || "—"}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate">{r.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-border flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={saving}>
            {saving ? "Importing…" : `Import ${rows.length} contact${rows.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Log Activity modal ────────────────────────────────────────

function LogActivityModal({
  contact,
  defaultSalesPerson,
  onClose,
  onSuccess,
}: {
  contact: Contact
  defaultSalesPerson: string | undefined
  onClose: () => void
  onSuccess: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Log Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {contact.shipper_name || contact.consignee_name || "Contact"} — pre-filled from contacts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 p-5">
          <ActivityForm
            defaultSalesPerson={defaultSalesPerson}
            defaultValues={{
              client_name:    contact.shipper_name ?? "",
              contact_person: contact.contact_person ?? "",
              contact_number: contact.contact_number ?? "",
              email:          contact.email ?? "",
              mode:           contact.mode ?? "",
              pol:            contact.pol ?? "",
              pod:            contact.pod ?? "",
            }}
            onSuccess={() => { onSuccess(); onClose() }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Contact card ──────────────────────────────────────────────

function ContactCard({
  contact,
  query,
  onLogActivity,
  onDelete,
  isAdmin,
}: {
  contact: Contact
  query: string
  onLogActivity: (c: Contact) => void
  onDelete: (id: string) => void
  isAdmin: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-card transition-all duration-150",
        "hover:border-primary/40 hover:shadow-sm"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="p-4">
        {/* Names row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            {contact.shipper_name && (
              <p className="text-sm font-semibold text-foreground truncate">
                {highlight(contact.shipper_name, query)}
              </p>
            )}
            {contact.consignee_name && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wide mr-1">Consignee</span>
                {highlight(contact.consignee_name, query)}
              </p>
            )}
          </div>

          {/* Mode badge */}
          {contact.mode && (
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0",
              contact.mode.toLowerCase().includes("air")
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
            )}>
              {contact.mode}
            </span>
          )}
        </div>

        {/* Route */}
        {(contact.pol || contact.pod) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{contact.pol || "—"}</span>
            <span className="text-border">→</span>
            <span>{contact.pod || "—"}</span>
          </div>
        )}

        {/* Contact details — always visible summary, expanded on hover */}
        <div className={cn(
          "grid gap-1.5 overflow-hidden transition-all duration-150",
          hovered ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}>
          <div className="overflow-hidden min-h-0">
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              {contact.contact_person && (
                <div className="flex items-center gap-2 text-xs">
                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span>{highlight(contact.contact_person, query)}</span>
                </div>
              )}
              {contact.contact_number && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span>{highlight(contact.contact_number, query)}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{highlight(contact.email, query)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact contact hints when not hovered */}
        {!hovered && (contact.contact_person || contact.contact_number || contact.email) && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {contact.contact_person && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {contact.contact_person}
              </span>
            )}
            {contact.contact_number && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {contact.contact_number}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action bar — visible on hover */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2.5 border-t border-border/60 rounded-b-lg",
        "transition-opacity duration-150 bg-muted/30",
        hovered ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs gap-1.5"
          onClick={() => onLogActivity(contact)}
        >
          <Phone className="h-3 w-3" />
          Log Activity
        </Button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(contact.id)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────

export default function ContactsPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [contacts,      setContacts]      = useState<Contact[]>([])
  const [loading,       setLoading]       = useState(true)
  const [query,         setQuery]         = useState("")
  const [page,          setPage]          = useState(1)

  // Excel import state
  const [parsing,       setParsing]       = useState(false)
  const [parseError,    setParseError]    = useState<string | null>(null)
  const [previewRows,   setPreviewRows]   = useState<ParsedRow[] | null>(null)
  const [importing,     setImporting]     = useState(false)
  const [importMsg,     setImportMsg]     = useState<string | null>(null)

  // Activity modal
  const [logTarget,     setLogTarget]     = useState<Contact | null>(null)

  // User info
  const [userInfo, setUserInfo] = useState<{ role: string; salesperson: string | null } | null>(null)

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

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/contacts")
      if (res.ok) setContacts(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  // ── Search filter ─────────────────────────────────────────────
  const filtered = contacts.filter((c) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      c.shipper_name?.toLowerCase().includes(q) ||
      c.consignee_name?.toLowerCase().includes(q) ||
      c.mode?.toLowerCase().includes(q) ||
      c.pol?.toLowerCase().includes(q) ||
      c.pod?.toLowerCase().includes(q) ||
      c.contact_person?.toLowerCase().includes(q) ||
      c.contact_number?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageContacts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleQueryChange(v: string) {
    setQuery(v)
    setPage(1)
  }

  // ── Excel upload ──────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    setParsing(true)
    setParseError(null)
    setImportMsg(null)

    const fd = new FormData()
    fd.append("file", file)

    try {
      const res = await fetch("/api/contacts/parse", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { setParseError(json.error ?? "Parse failed"); return }
      setPreviewRows(json.contacts)
    } catch {
      setParseError("Failed to read file")
    } finally {
      setParsing(false)
    }
  }

  async function handleImportConfirm() {
    if (!previewRows) return
    setImporting(true)
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewRows),
      })
      const json = await res.json()
      if (!res.ok) { setParseError(json.error ?? "Import failed"); return }
      setPreviewRows(null)
      setImportMsg(`${json.inserted} contact${json.inserted !== 1 ? "s" : ""} imported successfully.`)
      fetchContacts()
    } finally {
      setImporting(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return
    await fetch(`/api/contacts/${id}`, { method: "DELETE" })
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  const isAdmin = userInfo?.role === "admin"

  return (
    <div className="p-4 max-w-screen-xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Import from Excel · search · log activities directly
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
          >
            <Upload className="h-4 w-4" />
            {parsing ? "Reading…" : "Upload Excel"}
          </Button>
        </div>
      </div>

      {/* ── Parse error ──────────────────────────────────── */}
      {parseError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Import failed</p>
            <p className="text-xs mt-0.5 opacity-80">{parseError}</p>
            <p className="text-xs mt-1 opacity-70">
              Make sure your Excel has columns like: Shipper, Consignee, Mode, POL, POD, Contact Person, Phone, Email
            </p>
          </div>
          <button type="button" onClick={() => setParseError(null)} className="ml-auto shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Import success ────────────────────────────────── */}
      {importMsg && (
        <div className="flex items-center gap-2.5 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{importMsg}</span>
          <button type="button" onClick={() => setImportMsg(null)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Search ────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search contacts…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => handleQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Contact count ─────────────────────────────────── */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          {filtered.length === contacts.length
            ? `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`
            : `${filtered.length} of ${contacts.length} contacts`}
        </p>
      )}

      {/* ── Grid ──────────────────────────────────────────── */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading contacts…</div>
      ) : pageContacts.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Package className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-foreground">
            {query ? "No contacts match your search" : "No contacts yet"}
          </p>
          {!query && (
            <p className="text-xs text-muted-foreground">
              Upload an Excel file to import your contacts directory
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pageContacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              query={query}
              onLogActivity={setLogTarget}
              onDelete={handleDelete}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Preview modal ─────────────────────────────────── */}
      {previewRows && (
        <PreviewModal
          rows={previewRows}
          onConfirm={handleImportConfirm}
          onCancel={() => setPreviewRows(null)}
          saving={importing}
        />
      )}

      {/* ── Log Activity modal ────────────────────────────── */}
      {logTarget && (
        <LogActivityModal
          contact={logTarget}
          defaultSalesPerson={userInfo?.salesperson ?? undefined}
          onClose={() => setLogTarget(null)}
          onSuccess={() => setLogTarget(null)}
        />
      )}
    </div>
  )
}
