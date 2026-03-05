"use client"

import { useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EnquiryForm } from "@/components/enquiry/EnquiryForm"
import { EnquiryList } from "@/components/enquiry/EnquiryList"
import { DashboardView } from "@/components/dashboard/DashboardView"
import { ClipboardList, LayoutDashboard } from "lucide-react"

export default function EnquiryPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Enquiry Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Capture and track freight enquiries
        </p>
      </div>

      <Tabs defaultValue="input">
        <TabsList className="mb-6">
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
          {/* Form card */}
          <div className="bg-white border border-border rounded-xl p-6 mb-6 shadow-sm">
            <EnquiryForm onSuccess={handleSuccess} />
          </div>

          {/* Recent enquiries table */}
          <div className="bg-white border border-border rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Recent Enquiries</h3>
            </div>
            <EnquiryList key={refreshKey} />
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <DashboardView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
