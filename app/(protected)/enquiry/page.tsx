"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EnquiryForm, type EnquiryFormEditing } from "@/components/enquiry/EnquiryForm"
import { DashboardView } from "@/components/dashboard/DashboardView"
import { ClipboardList, LayoutDashboard } from "lucide-react"

const SELECT_COLS =
  "id,enq_ref_no,enq_receipt_date,enq_type,mode,exim,fn,sales_person,agent_name,country,branch,network,pol,pod,incoterms,container_type,status,email_subject_line,shipper,consignee,remarks,mbl_awb_no,job_invoice_no,gop,assigned_user,assigned_date,buy_rate_file,sell_rate_file"

function EnquiryPageContent() {
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryFormEditing | null>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const editId = searchParams.get("edit")
    if (!editId) {
      setEditingEnquiry(null)
      return
    }
    supabase
      .from("enquiries")
      .select(SELECT_COLS)
      .eq("id", editId)
      .single()
      .then(({ data }) => {
        if (data) setEditingEnquiry(data as EnquiryFormEditing)
      })
  }, [searchParams])

  const handleEditComplete = useCallback(() => {
    setEditingEnquiry(null)
    window.history.replaceState({}, "", "/enquiry")
  }, [])

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Enquiry Management</h1>
        <img src="/LINKS.bmp" alt="Links Cargo" className="h-10 object-contain" />
      </div>

      <Tabs defaultValue="input">
        <TabsList className="mb-4">
          <TabsTrigger value="input" className="gap-2 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            New Enquiry
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <EnquiryForm
              editingEnquiry={editingEnquiry}
              onEditComplete={handleEditComplete}
            />
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <DashboardView />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function EnquiryPage() {
  return (
    <Suspense>
      <EnquiryPageContent />
    </Suspense>
  )
}
