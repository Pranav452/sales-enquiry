"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { X, Users, Loader2 } from "lucide-react"
import { useState } from "react"
import { useUsers, useCreateRoom } from "@/lib/hooks/useChat"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { cn } from "@/lib/utils"
import type { ChatRoom } from "@/lib/types/chat"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (room: ChatRoom) => void
}

export function GroupChatModal({ open, onOpenChange, onCreated }: Props) {
  const [groupName,   setGroupName]   = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const currentUser = useCurrentUser()
  const { data: allUsers = [], isLoading } = useUsers()
  const createRoom = useCreateRoom()

  // Filter out the logged-in user — they're added automatically as creator
  const users = allUsers.filter((u) => u.id !== currentUser?.id)

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreate() {
    if (!groupName.trim() || selectedIds.size === 0) return
    try {
      const room = await createRoom.mutateAsync({
        type:       "group",
        name:       groupName.trim(),
        member_ids: [...selectedIds],
      })
      setGroupName("")
      setSelectedIds(new Set())
      onCreated(room)
    } catch {
      // error displayed via createRoom.error below
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setGroupName("")
      setSelectedIds(new Set())
    }
    onOpenChange(v)
  }

  const canCreate = groupName.trim().length > 0 && selectedIds.size > 0

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "bg-card border border-border rounded-xl shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <Dialog.Title className="font-semibold text-sm">
                New Group Chat
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-md p-1 hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {/* Group name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Group Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sea Freight Team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className={cn(
                  "w-full h-9 rounded-md border border-input bg-background px-3 text-sm",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                )}
              />
            </div>

            {/* Member selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Add Members
              </label>
              <div className="max-h-52 overflow-y-auto rounded-md border border-border">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  users.map((user) => {
                    const checked  = selectedIds.has(user.id)
                    const initials = user.full_name
                      ? user.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                      : user.email[0].toUpperCase()

                    return (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                          "border-b border-border last:border-0",
                          checked ? "bg-primary/8" : "hover:bg-accent"
                        )}
                      >
                        {/* Checkbox visual */}
                        <div
                          className={cn(
                            "h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                            checked
                              ? "bg-primary border-primary"
                              : "border-muted-foreground"
                          )}
                        >
                          {checked && (
                            <svg viewBox="0 0 12 12" className="h-3 w-3 text-primary-foreground">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                          checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {initials}
                        </div>

                        {/* Name */}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.full_name || user.email}
                          </p>
                          {user.branch && (
                            <p className="text-xs text-muted-foreground">{user.branch}</p>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 px-5 py-4 border-t border-border">
            {/* Error message */}
            {createRoom.error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
                {createRoom.error.message}
              </p>
            )}
            <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} member${selectedIds.size > 1 ? "s" : ""} selected`
                : "Select at least 1 member"}
            </span>
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="h-8 px-3 text-sm rounded-md border border-border hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={!canCreate || createRoom.isPending}
                onClick={handleCreate}
                className={cn(
                  "h-8 px-4 text-sm rounded-md font-medium transition-colors",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center gap-1.5"
                )}
              >
                {createRoom.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create
              </button>
            </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
