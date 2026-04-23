import type { Email } from "@/lib/email-store"
import { parseBodyFromRaw } from "@/lib/parse-email-body"

export const API_BASE = "https://api.learnfromme.xyz"

function normalizeAddress(addr: string): string {
  return String(addr || "")
    .trim()
    .toLowerCase()
}

function parseFromField(from: unknown): string {
  let fromEmail = from != null ? String(from) : "Unknown"
  try {
    if (typeof fromEmail === "string" && fromEmail.includes("{")) {
      const parsed = JSON.parse(fromEmail) as { email?: string }
      fromEmail = parsed.email || fromEmail
    }
  } catch {
    /* keep string */
  }
  return fromEmail
}

function getMessageId(row: Record<string, unknown>): string {
  const raw =
    row.id ||
    row.messageId ||
    row.message_id ||
    row["MessageID"] ||
    row["MessageId"]
  if (raw != null && String(raw).trim() !== "") {
    return String(raw).trim()
  }
  const t = String(row.time || row["Time"] || "")
  const to = normalizeAddress(String(row.to || row["To"] || ""))
  const from = String(row.from || row["From"] || "")
  const sub = String(row.subject || row["Subject"] || "")
  const bodyKey = resolveRowBody(row).slice(0, 120)
  return [t, to, from, sub, bodyKey].join("|")
}

function resolveRowBody(row: Record<string, unknown>): string {
  const rawField =
    row.raw ??
    row["Raw"] ??
    row["raw"] ??
    row.messageRaw ??
    row["message_raw"]

  const legacy = row.body ?? row["Body"]

  if (rawField != null && String(rawField).trim() !== "") {
    const parsed = parseBodyFromRaw(rawField)
    if (parsed !== "No content") {
      return parsed
    }
  }

  return String(legacy ?? "").trim()
}

function dedupeSortInbox(data: Record<string, unknown>[]): Record<string, unknown>[] {
  const sorted = data
    .filter(Boolean)
    .sort((a, b) => {
      const tb = (b.time ?? b["Time"] ?? 0) as string | number | Date
      const ta = (a.time ?? a["Time"] ?? 0) as string | number | Date
      return new Date(tb).getTime() - new Date(ta).getTime()
    })
  const seen = new Set<string>()
  const out: Record<string, unknown>[] = []
  for (const row of sorted) {
    const id = getMessageId(row)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

function rowToEmail(row: Record<string, unknown>, index: number): Email {
  const fromRaw = row.from != null ? row.from : row["From"]
  const timeRaw = row.time != null ? row.time : row["Time"]
  const subjRaw = row.subject != null ? row.subject : row["Subject"]

  const ts = timeRaw != null ? new Date(timeRaw as string | number) : new Date()
  const timestamp = Number.isNaN(ts.getTime()) ? new Date() : ts

  const deletedRaw = row.deleted ?? row["Deleted"]
  const isDeleted =
    deletedRaw === true ||
    deletedRaw === 1 ||
    String(deletedRaw).toLowerCase() === "true"

  const attachmentsRaw = row.attachments ?? row["Attachments"]
  const attachments = Array.isArray(attachmentsRaw)
    ? (attachmentsRaw as Email["attachments"])
    : undefined

  return {
    id: getMessageId(row) || String(index),
    from: parseFromField(fromRaw),
    subject: String(subjRaw || "No Subject"),
    body: resolveRowBody(row),
    timestamp,
    isNew: false,
    deleted: isDeleted,
    attachments,
  }
}

/**
 * Generates a random @learnfromme.xyz address (same scheme as the worker-backed inbox).
 */
export function generateRandomEmail(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let name = ""
  for (let i = 0; i < 8; i++) {
    name += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${name}@learnfromme.xyz`
}

/** Same shape as `/inbox` JSON and SSE `message` / `inbox` payloads. */
export function mapInboxPayloadToEmails(data: unknown): Email[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid API response")
  }
  const rows = data as Record<string, unknown>[]
  const filtered = dedupeSortInbox(rows)
  return filtered.map((row, i) => rowToEmail(row, i))
}

export async function getInbox(email: string): Promise<Email[]> {
  const trimmed = String(email || "").trim()
  const url = `${API_BASE}/inbox?email=${encodeURIComponent(trimmed)}&t=${Date.now()}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`HTTP error: ${res.status}`)
  }
  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error("Invalid JSON response")
  }
  return mapInboxPayloadToEmails(data)
}

export async function deleteEmail(email: string): Promise<void> {
  const trimmed = String(email || "").trim()
  const url = `${API_BASE}/delete?email=${encodeURIComponent(trimmed)}`
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
  })
  let body: { success?: boolean; error?: string } = {}
  try {
    body = JSON.parse(await res.text()) as typeof body
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(
      (body && body.error) || `Request failed (${res.status})`
    )
  }
  if (body.success !== true) {
    throw new Error((body && body.error) || "Delete failed")
  }
}

/** Delete one message from an inbox (detail view). */
export async function deleteMessage(
  messageId: string,
  inboxAddress: string
): Promise<void> {
  const url = `${API_BASE}/delete-message?id=${encodeURIComponent(messageId)}&email=${encodeURIComponent(inboxAddress)}`
  const res = await fetch(url, { method: "POST", cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`)
  }
}
