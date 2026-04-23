"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Copy,
  RefreshCw,
  Trash2,
  Sparkles,
  Check,
  Mail,
  Shield,
  Clock,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmailCard } from "@/components/email-card"
import { ConnectionStatus } from "@/components/connection-status"
import { EmptyState } from "@/components/empty-state"
import { type Email } from "@/lib/email-store"
import {
  API_BASE,
  deleteEmail,
  getInbox,
  generateRandomEmail,
  mapInboxPayloadToEmails,
} from "@/lib/api"

export default function HomePage() {
  const [email, setEmail] = useState<string | null>(null)
  /** Server / SSE payload; never render this list directly. */
  const [rawEmails, setRawEmails] = useState<Email[]>([])
  /** Derived inbox for UI (rawEmails minus tombstones). */
  const [emails, setEmails] = useState<Email[]>([])
  const [isInboxLoading, setIsInboxLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  /** Bumps when inbox SSE must close and reconnect (e.g. after deleting a message). */
  const [inboxStreamKey, setInboxStreamKey] = useState(0)
  /** Tombstone IDs so stale SSE/KV payloads cannot bring deleted messages back. */
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())
  const deletedIdsRef = useRef<Set<string>>(new Set())
  /** While true, SSE payloads are ignored so a race cannot overwrite right after delete. */
  const [pauseSSE, setPauseSSE] = useState(false)
  const pauseSSERef = useRef(false)
  const pauseSSETimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Tombstone a message id (ref first so GET/SSE in same tick see it); drop after 10s. */
  const registerDeletedMessageId = useCallback((id: string) => {
    const next = new Set(deletedIdsRef.current).add(id)
    deletedIdsRef.current = next
    setDeletedIds(next)
    window.setTimeout(() => {
      setDeletedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        deletedIdsRef.current = next
        return next
      })
    }, 10000)
  }, [])

  // Derive visible inbox: SSE/API only touch rawEmails; tombstones applied here.
  useEffect(() => {
    const filtered = rawEmails.filter(
      (e) => !e.deleted && !deletedIds.has(e.id)
    )
    setEmails(filtered)
  }, [rawEmails, deletedIds])

  // New / changed inbox address: clear tombstones and SSE pause (do not tie to inboxStreamKey).
  useEffect(() => {
    if (pauseSSETimeoutRef.current) {
      clearTimeout(pauseSSETimeoutRef.current)
      pauseSSETimeoutRef.current = null
    }
    pauseSSERef.current = false
    setPauseSSE(false)
    deletedIdsRef.current = new Set()
    setDeletedIds(new Set())
    setRawEmails([])
  }, [email])

  // Restore email from session (inbox updates via SSE when email is set)
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("tempEmail")
    if (storedEmail) setEmail(storedEmail)
  }, [])

  // Real-time inbox via SSE when an address is active
  useEffect(() => {
    if (!email) {
      setRawEmails([])
      setIsInboxLoading(false)
      setIsGenerating(false)
      return
    }

    setIsInboxLoading(true)
    const eventSource = new EventSource(
      `${API_BASE}/stream?email=${encodeURIComponent(email)}`
    )

    const applyPayload = (raw: string) => {
      if (pauseSSERef.current) return
      try {
        const data = JSON.parse(raw) as unknown
        const incoming = mapInboxPayloadToEmails(data)
        setRawEmails(incoming)
        setLastChecked(new Date())
        setIsConnected(true)
        setIsInboxLoading(false)
        setIsGenerating(false)
        console.log("New emails received")
      } catch {
        setIsConnected(false)
      }
    }

    eventSource.onopen = () => {
      console.log("SSE connected")
      setIsInboxLoading(false)
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      applyPayload(event.data)
    }

    eventSource.addEventListener("inbox", (event: MessageEvent<string>) => {
      applyPayload(event.data)
    })

    eventSource.onerror = () => {
      setIsConnected(false)
      setIsInboxLoading(false)
    }

    return () => {
      eventSource.close()
    }
  }, [email, inboxStreamKey])

  const handleGenerateEmail = useCallback(() => {
    setIsGenerating(true)
    const newEmail = generateRandomEmail()
    setEmail(newEmail)
    sessionStorage.setItem("tempEmail", newEmail)
  }, [])

  const handleCopyEmail = useCallback(async () => {
    if (!email) return
    await navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [email])

  const refreshInboxList = useCallback(async () => {
    if (!email) return
    try {
      const list = await getInbox(email)
      setRawEmails((prev) => {
        const map = new Map(prev.map((e) => [e.id, e]))
        for (const item of list) {
          map.set(item.id, item)
        }
        return Array.from(map.values())
      })
      setLastChecked(new Date())
      setIsConnected(true)
    } catch {
      setIsConnected(false)
    }
  }, [email])

  /** Close and reopen EventSource without clearing list (avoids wiping a fresh GET /inbox). */
  const reconnectInboxStream = useCallback(() => {
    setInboxStreamKey((k) => k + 1)
  }, [])

  /** After deleting a message: tombstone id, optimistic remove, GET /inbox, reconnect SSE. */
  const refreshInboxAfterMessageDelete = useCallback(
    async (deletedId?: string) => {
      if (deletedId) {
        pauseSSERef.current = true
        setPauseSSE(true)
        if (pauseSSETimeoutRef.current) {
          clearTimeout(pauseSSETimeoutRef.current)
        }
        pauseSSETimeoutRef.current = setTimeout(() => {
          pauseSSERef.current = false
          setPauseSSE(false)
          pauseSSETimeoutRef.current = null
        }, 5000)
        registerDeletedMessageId(deletedId)
      }
      await refreshInboxList()
      reconnectInboxStream()
    },
    [refreshInboxList, reconnectInboxStream, registerDeletedMessageId]
  )

  const handleRefresh = useCallback(async () => {
    if (!email) return
    setIsRefreshing(true)
    try {
      await refreshInboxList()
    } finally {
      setIsRefreshing(false)
    }
  }, [email, refreshInboxList])

  const handleDelete = useCallback(async () => {
    if (!email) return
    setIsDeleting(true)
    try {
      console.log("Deleting email...")
      await deleteEmail(email)
      console.log("Deleted successfully")
      setEmail(null)
      setRawEmails([])
      setLastChecked(null)
      setIsConnected(false)

      const newEmail = generateRandomEmail()
      console.log("New email generated:", newEmail)
      sessionStorage.setItem("tempEmail", newEmail)
      setEmail(newEmail)
    } catch {
      setIsConnected(false)
    } finally {
      setIsDeleting(false)
    }
  }, [email])

  const handleMarkRead = useCallback((id: string) => {
    setRawEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isNew: false } : e))
    )
  }, [])

  const SHOW_AUTH = false

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <nav className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/about"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
            {SHOW_AUTH && (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              TempMail
            </span>
          </Link>
        </div>
      </header>

      <div className="flex justify-center">
        {/* LEFT AD */}
        <div className="hidden lg:flex w-[160px] justify-center pt-20">
          <div className="sticky top-20 w-[160px] h-[600px] rounded-xl border border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
            Advertisement
          </div>
        </div>

        {/* MAIN CONTENT */}
        <main className="w-full max-w-5xl px-4 py-8">
        <div className="mb-6 flex justify-center">
          <div className="w-full max-w-5xl h-[70px] rounded-md border border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
            Advertisement
          </div>
        </div>
        {/* Hero Section */}
        {!email && (
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl text-balance">
              Instant Disposable Email
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
              Protect your privacy with temporary email addresses. Generate, receive, and dispose. No registration required.
            </p>

            {/* Features */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">Instant</span>
                <span className="text-sm text-muted-foreground">
                  Generate in seconds
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">Private</span>
                <span className="text-sm text-muted-foreground">
                  No tracking or logs
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">24h TTL</span>
                <span className="text-sm text-muted-foreground">
                  Auto-expires for safety
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Email Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          {/* Email Display */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Your temporary email
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-border bg-secondary/50 px-4 py-3 font-mono text-lg">
                {email ? (
                  <span className="text-foreground">{email}</span>
                ) : (
                  <span className="text-muted-foreground">
                    Click generate to create your email
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
                onClick={handleCopyEmail}
                disabled={!email}
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex flex-wrap gap-3">
            <Button
              onClick={handleGenerateEmail}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {email ? "Generate New" : "Generate Email"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={!email || isRefreshing}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh Inbox
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!email || isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>

          {/* Status */}
          {email && (
            <ConnectionStatus
              isConnected={isConnected}
              lastChecked={lastChecked}
            />
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-5xl h-[90px] rounded-xl border border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
            Advertisement
          </div>
        </div>

        {/* Inbox Section */}
        {email && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Inbox</h2>
              <span className="text-sm text-muted-foreground">
                {emails.length} messages
              </span>
            </div>

            {isInboxLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading inbox…
              </p>
            ) : emails.length === 0 ? (
              <EmptyState type="no-messages" />
            ) : (
              <div className="space-y-3">
                {emails.map((emailItem) => (
                  <EmailCard
                    key={emailItem.id}
                    email={emailItem}
                    activeInboxEmail={email}
                    onMarkRead={handleMarkRead}
                    onMessageDeleted={refreshInboxAfterMessageDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State when no email generated */}
        {!email && (
          <div className="mt-8">
            <EmptyState type="no-email" />
          </div>
        )}
        </main>

        {/* RIGHT AD */}
        <div className="hidden lg:flex w-[160px] justify-center pt-20">
          <div className="sticky top-20 w-[160px] h-[600px] rounded-xl border border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
            Advertisement
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TempMail. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>
            <Link
              href="/about"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
