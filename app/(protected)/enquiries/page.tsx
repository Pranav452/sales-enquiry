"use client"

import { EnquiryList } from "@/components/enquiry/EnquiryList"

export default function EnquiriesPage() {
  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">Recent Enquiries</h1>
      </div>
      <EnquiryList navigateOnEdit />
    </div>
  )
}
