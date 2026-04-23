"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AppHeader from "@/components/AppHeader"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = useCallback(async () => {
    setIsGoogleLoading(true)
    setError(null)
    // Simulate Google OAuth
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsGoogleLoading(false)
    document.cookie = `admin_email=${encodeURIComponent("rohiranihal8@gmail.com")};path=/;max-age=${60 * 60 * 24 * 7};SameSite=Lax`
    router.push("/admin")
  }, [router])

  const handleMagicLink = useCallback(async () => {
    if (!email) {
      setError("Please enter your email address")
      return
    }
    
    if (!email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    setIsMagicLinkLoading(true)
    setError(null)
    // Simulate sending magic link
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsMagicLinkLoading(false)
    setMagicLinkSent(true)
  }, [email])

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBack={true} />
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {!magicLinkSent ? (
            <div className="rounded-xl border border-border bg-card p-8">
              <div className="mb-8 text-center">
                <h1 className="mb-2 text-2xl font-bold text-foreground">
                  Welcome back
                </h1>
                <p className="text-muted-foreground">
                  Sign in to access the admin panel
                </p>
              </div>

              {/* Google Login */}
              <Button
                variant="outline"
                className="mb-6 w-full gap-3 py-6"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isMagicLinkLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-4 text-muted-foreground">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError(null)
                    }}
                    className="h-12"
                    disabled={isGoogleLoading || isMagicLinkLoading}
                  />
                  {error && (
                    <p className="mt-2 text-sm text-destructive">{error}</p>
                  )}
                </div>
                <Button
                  className="w-full gap-2 py-6"
                  onClick={handleMagicLink}
                  disabled={isGoogleLoading || isMagicLinkLoading}
                >
                  {isMagicLinkLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Send login link
                </Button>
              </div>

              {/* Terms */}
              <p className="mt-6 text-center text-xs text-muted-foreground">
                By signing in, you agree to our{" "}
                <Link
                  href="/terms"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
          ) : (
            // Magic Link Sent State
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground">
                Check your email
              </h2>
              <p className="mb-6 text-muted-foreground">
                We sent a login link to{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Click the link in the email to sign in to your account.
              </p>
              <Button
                variant="ghost"
                className="mt-6"
                onClick={() => setMagicLinkSent(false)}
              >
                Use a different email
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-center px-4">
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TempMail. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  )
}
