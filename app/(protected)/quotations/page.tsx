import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuotationList } from "@/components/quotation/QuotationList"
import Link from "next/link"

export default async function QuotationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Quotations</h1>
          <p className="text-sm text-muted-foreground">All saved quotations</p>
        </div>
        <Link
          href="/quotation"
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          New Quotation
        </Link>
      </div>
      <QuotationList />
    </div>
  )
}
