// Types for the temp mail application
export interface EmailAttachment {
  name: string
  type?: string
  content?: string
}

export interface Email {
  id: string
  from: string
  subject: string
  body: string
  timestamp: Date
  isNew: boolean
  /** When true, message was removed server-side; UI should hide it. */
  deleted?: boolean
  attachments?: EmailAttachment[]
}

export interface TempMailState {
  email: string | null
  emails: Email[]
  isConnected: boolean
  lastChecked: Date | null
  expiresAt: Date | null
}

// Generate a random email address
export function generateRandomEmail(domain: string = "learnfromme.xyz"): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${result}@${domain}`
}

// Format relative time
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return "Just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

// Mock emails for demonstration
export function getMockEmails(): Email[] {
  return [
    {
      id: "1",
      from: "noreply@github.com",
      subject: "Your GitHub verification code",
      body: "Your GitHub verification code is: 847293. This code will expire in 10 minutes. If you did not request this code, please ignore this email.",
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      isNew: true,
    },
    {
      id: "2",
      from: "welcome@spotify.com",
      subject: "Welcome to Spotify Premium",
      body: "Thanks for signing up for Spotify Premium! You now have access to ad-free music, offline playback, and more. Start exploring millions of songs today.",
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      isNew: false,
    },
    {
      id: "3",
      from: "security@discord.com",
      subject: "New login from Chrome on Windows",
      body: "A new login to your Discord account was detected. Location: New York, USA. Device: Chrome on Windows 11. If this was you, no action is needed.",
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      isNew: false,
    },
  ]
}
