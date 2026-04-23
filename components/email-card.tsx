"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, Reply, Forward, Trash2 } from "lucide-react"
import { Download } from "lucide-react"
import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatRelativeTime, type Email } from "@/lib/email-store"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

interface EmailCardProps {
  email: Email
  activeInboxEmail?: string | null
  /** Called after a successful delete; pass message id for optimistic updates / refetch. */
  onMessageDeleted?: (messageId: string) => void | Promise<void>
  navigateHomeAfterDelete?: boolean
  onMarkRead?: (id: string) => void
}

export function EmailCard({
  email,
  activeInboxEmail,
  onMessageDeleted,
  navigateHomeAfterDelete = true,
  onMarkRead,
}: EmailCardProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const popupRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowAttachments(false)
      }
    }

    if (showAttachments) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showAttachments])

  const hasBody = Boolean(email.body?.trim())
  const bodyText = hasBody ? email.body : ""
  const emptyBodyLabel = "No content available"

  const handleOpen = () => {
    setIsExpanded(true)
    if (email.isNew && onMarkRead) {
      onMarkRead(email.id)
    }
  }

  const handleClose = () => {
    setIsExpanded(false)
  }

  const handleDelete = async (id: string) => {
    if (!activeInboxEmail) return

    try {
      console.log("Deleting ID:", id)

      const res = await fetch(
        `https://api.learnfromme.xyz/delete-message?id=${encodeURIComponent(id)}&email=${encodeURIComponent(activeInboxEmail)}`,
        { method: "POST" }
      )

      if (!res.ok) {
        console.error("Delete failed")
        return
      }

      let success = true
      const text = await res.text()
      if (text) {
        try {
          const data = JSON.parse(text) as { success?: boolean }
          if (data.success === false) success = false
        } catch {
          /* non-JSON success body */
        }
      }
      if (!success) {
        console.error("Delete failed")
        return
      }

      console.log("Deleted successfully")

      await onMessageDeleted?.(id)

      toast({
        title: "Email deleted successfully",
      })

      setIsExpanded(false)
    } catch (err) {
      console.error(err)
    }
  }

  // =========================
  // FULL EMAIL VIEW
  // =========================
  if (isExpanded) {
    return (
      <div className="animate-fade-in-up relative rounded-xl border border-border bg-card">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Back to inbox
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowAttachments((prev) => !prev)}
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                const emlContent = `
From: ${email.from}
To: ${activeInboxEmail || "me"}
Subject: ${email.subject || ""}
Date: ${new Date(email.timestamp).toUTCString()}

${email.body || ""}
`

                const blob = new Blob([emlContent], { type: "message/rfc822" })
                const link = document.createElement("a")
                link.href = URL.createObjectURL(blob)
                link.download = `${email.subject || "email"}.eml`
                link.click()

                toast({
                  title: "Source downloaded",
                })
              }}
            >
              <FileText className="h-4 w-4" />
            </Button>

            {/* DELETE BUTTON */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleDelete(email.id) // ✅ PASS CORRECT ID
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showAttachments && (
          <div
            ref={popupRef}
            className="absolute right-4 top-14 z-50 w-72 rounded-md border border-border bg-card shadow-lg"
          >
            <div className="p-3 text-sm font-semibold border-b border-border">
              Attachments
            </div>

            <div className="max-h-60 overflow-y-auto">
              {email.attachments && email.attachments.length > 0 ? (
                email.attachments.map((file, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      const byteCharacters = atob(file.content ?? "")
                      const byteNumbers = new Array(byteCharacters.length)
                      for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i)
                      }
                      const byteArray = new Uint8Array(byteNumbers)
                      const blob = new Blob([byteArray], { type: file.type })

                      const link = document.createElement("a")
                      link.href = URL.createObjectURL(blob)
                      link.download = file.name
                      link.click()

                      toast({
                        title: "Download started",
                      })
                    }}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 active:scale-95 transition-all duration-150 truncate"
                  >
                    {file.name}
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  No attachments
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBJECT */}
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            {email.subject || "No subject"}
          </h1>
        </div>

        {/* SENDER */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{email.from}</p>
              <p className="text-sm text-muted-foreground">
                to me • {formatRelativeTime(email.timestamp)}
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="px-6 py-6">
          <p className="whitespace-pre-wrap text-foreground">
            {hasBody ? bodyText : emptyBodyLabel}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="border-t border-border px-6 py-4">
          <div className="flex gap-3">
            <Button variant="outline">
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline">
              <Forward className="h-4 w-4 mr-2" />
              Forward
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // =========================
  // INBOX ITEM
  // =========================
  return (
    <button
      onClick={handleOpen}
      className={cn(
        "flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/50",
        email.isNew && "border-primary/30"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
        <Mail className="h-5 w-5" />
      </div>

      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{email.from}</p>
        <p className="font-bold">{email.subject}</p>
        <p className="text-sm text-muted-foreground">
          {hasBody ? bodyText : emptyBodyLabel}
        </p>
      </div>

      <span className="text-xs text-muted-foreground">
        {formatRelativeTime(email.timestamp)}
      </span>
    </button>
  )
}