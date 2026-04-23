"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  LogOut,
  RefreshCw,
  Mail,
  Users,
  Activity,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmailCard } from "@/components/email-card"
import { EmptyState } from "@/components/empty-state"
import { getMockEmails, type Email } from "@/lib/email-store"

// Mock active emails for admin
const mockActiveEmails = [
  "abc123@learnfromme.xyz",
  "xyz789@learnfromme.xyz",
  "test456@learnfromme.xyz",
  "user001@learnfromme.xyz",
  "demo999@learnfromme.xyz",
]

export function AdminPageClient() {
  const router = useRouter()
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleSelectEmail = useCallback((email: string) => {
    setSelectedEmail(email)
    // Load mock emails for selected address
    setEmails(getMockEmails())
  }, [])

  const handleRefresh = useCallback(async () => {
    if (!selectedEmail) return
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setEmails(getMockEmails())
    setIsRefreshing(false)
  }, [selectedEmail])

  const handleLogout = useCallback(() => {
    router.push("/login")
  }, [router])

  const handleMarkRead = useCallback((id: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isNew: false } : e))
    )
  }, [])

  const handleMessageDeleted = useCallback((id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                Admin Panel
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Emails</p>
                <p className="text-2xl font-bold text-foreground">
                  {mockActiveEmails.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">1,247</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Messages Today</p>
                <p className="text-2xl font-bold text-foreground">342</p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Selection & Inbox */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Inspect Inbox
            </h2>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[240px] justify-between gap-2">
                    {selectedEmail ? (
                      <span className="truncate font-mono text-sm">
                        {selectedEmail}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Select an email address
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[240px]">
                  {mockActiveEmails.map((email) => (
                    <DropdownMenuItem
                      key={email}
                      onClick={() => handleSelectEmail(email)}
                      className="font-mono text-sm"
                    >
                      {email}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleRefresh}
                disabled={!selectedEmail || isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Inbox Content */}
          {!selectedEmail ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-foreground">
                Select an email address
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Choose an email address from the dropdown above to view its inbox.
              </p>
            </div>
          ) : emails.length === 0 ? (
            <EmptyState type="no-messages" />
          ) : (
            <div className="space-y-3">
              {emails.map((msg) => (
                <EmailCard
                  key={msg.id}
                  email={msg}
                  activeInboxEmail={selectedEmail}
                  navigateHomeAfterDelete={false}
                  onMessageDeleted={handleMessageDeleted}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
