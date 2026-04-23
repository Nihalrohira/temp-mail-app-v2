"use client"

import { Inbox, Mail } from "lucide-react"

interface EmptyStateProps {
  type: "no-email" | "no-messages"
}

export function EmptyState({ type }: EmptyStateProps) {
  if (type === "no-email") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-foreground">
          No email generated
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Click the &quot;Generate Email&quot; button above to create your temporary email address.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-foreground">
        No messages yet
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your inbox is empty. New emails will appear here automatically when they arrive.
      </p>
    </div>
  )
}
