"use client"

import { EnquiryList } from "@/components/enquiry/EnquiryList"

export default function EnquiriesPage() {
  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Recent Enquiries</h1>
        <img src="/LINKS.bmp" alt="Links Cargo" className="h-10 object-contain" />
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm">
        <EnquiryList navigateOnEdit />
      </div>
    </div>
  )
}
