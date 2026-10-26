"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { SalesLeadForm } from "@/components/sales-leads/SalesLeadForm"
import type { SalesLead } from "@/components/sales-leads/SalesLeadList"

interface Props {
  open: boolean
  editing: SalesLead | null
  defaultSalesPerson?: string
  defaultSenderEmail?: string
  company?: string | null
  onSuccess: (id: string, refCode: string | undefined, isEdit: boolean) => void
  onClose: () => void
}

/** Right-side drawer hosting the unchanged SalesLeadForm for create / edit. */
export function LeadFormDrawer({
  open, editing, defaultSalesPerson, defaultSenderEmail, company, onSuccess, onClose,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[820px] flex-col border-l border-border bg-background shadow-2xl focus:outline-none"
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-base font-medium leading-none text-foreground">
                {editing ? `Edit Lead — ${editing.ref_code}` : "New Sales Lead"}
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                {editing ? "Update the sales lead and save your changes." : "Fill in the lead details and save to create it."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <SalesLeadForm
              editing={editing}
              defaultSalesPerson={defaultSalesPerson}
              defaultSenderEmail={defaultSenderEmail}
              company={company}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
