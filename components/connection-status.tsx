"use client"

import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/email-store"

interface ConnectionStatusProps {
  isConnected: boolean
  lastChecked: Date | null
}

export function ConnectionStatus({ isConnected, lastChecked }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected
              ? "bg-green-500 animate-pulse"
              : "bg-destructive"
          )}
        />
        <span>{isConnected ? "Connected" : "Disconnected"}</span>
      </div>
      {lastChecked && (
        <div className="flex items-center gap-1">
          <span>Last checked:</span>
          <span className="text-foreground/80">
            {formatRelativeTime(lastChecked)}
          </span>
        </div>
      )}
    </div>
  )
}
