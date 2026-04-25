import Link from "next/link"
import { Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
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

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-12">
        <article className="prose prose-invert max-w-none">
          <h1 className="mb-4 text-3xl font-bold text-foreground">
            Privacy Policy
          </h1>
          <p className="mb-8 text-muted-foreground">
            Last updated: April 14, 2026
          </p>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              1. Introduction
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              TempMail (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your
              privacy. This Privacy Policy explains how we collect, use, and
              safeguard your information when you use our temporary email
              service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              2. Information We Collect
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              We collect minimal information necessary to provide our service:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-foreground/90">
              <li>
                Temporary email addresses generated through our service
              </li>
              <li>
                Email content received at temporary addresses (automatically
                deleted after 24 hours)
              </li>
              <li>
                Basic usage analytics (non-personally identifiable)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              3. How We Use Your Information
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              We use the collected information solely to:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-foreground/90">
              <li>Provide and maintain the temporary email service</li>
              <li>Improve and optimize our service performance</li>
              <li>Prevent abuse and ensure service security</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              4. Data Retention
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              Temporary email addresses and their associated emails are
              automatically deleted after 24 hours. We do not retain any copies
              of your emails after this period.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              5. Data Security
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              We implement appropriate security measures to protect your
              information. However, no method of transmission over the Internet
              is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              6. Third-Party Services
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              We do not sell, trade, or share your information with third
              parties for marketing purposes. We may use essential third-party
              services for hosting and analytics, which are bound by their own
              privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              7. Cookies
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              We use essential cookies to maintain your session and provide the
              service. We do not use tracking cookies or advertising cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              8. Changes to This Policy
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new Privacy Policy on
              this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              9. Contact Us
            </h2>
            <p className="leading-relaxed text-foreground/90">
              If you have any questions about this Privacy Policy, please
              contact us at{" "}
              <a
                href="mailto:privacy@learnfromme.xyz"
                className="text-primary hover:underline"
              >
                privacy@learnfromme.xyz
              </a>
            </p>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TempMail. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-sm text-foreground font-medium"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
