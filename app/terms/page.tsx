import Link from "next/link"
import { Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="mb-8 text-muted-foreground">
            Last updated: April 14, 2026
          </p>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              1. Acceptance of Terms
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              By accessing and using TempMail (&quot;the Service&quot;), you accept and
              agree to be bound by these Terms of Service. If you do not agree
              to these terms, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              2. Description of Service
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              TempMail provides temporary, disposable email addresses for users
              who wish to protect their privacy. Email addresses and their
              associated emails are automatically deleted after 24 hours.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              3. Acceptable Use
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              You agree to use the Service only for lawful purposes. You must
              not:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-foreground/90">
              <li>
                Use the Service for any illegal or unauthorized purpose
              </li>
              <li>
                Send spam, phishing emails, or malicious content
              </li>
              <li>
                Attempt to gain unauthorized access to our systems
              </li>
              <li>
                Use the Service to harass, abuse, or harm others
              </li>
              <li>
                Violate any applicable laws or regulations
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              4. No Warranty
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              The Service is provided &quot;as is&quot; without warranties of any kind,
              either express or implied. We do not guarantee that the Service
              will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              5. Limitation of Liability
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              In no event shall TempMail be liable for any indirect, incidental,
              special, consequential, or punitive damages arising out of or
              related to your use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              6. Service Availability
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              We reserve the right to modify, suspend, or discontinue the
              Service at any time without notice. We shall not be liable to you
              or any third party for any modification, suspension, or
              discontinuation of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              7. Intellectual Property
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              The Service and its original content, features, and functionality
              are owned by TempMail and are protected by international
              copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              8. Changes to Terms
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              We reserve the right to modify these Terms at any time. We will
              notify users of any changes by updating the &quot;Last updated&quot; date.
              Your continued use of the Service after changes constitutes
              acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              9. Governing Law
            </h2>
            <p className="mb-4 leading-relaxed text-foreground/90">
              These Terms shall be governed by and construed in accordance with
              the laws of the jurisdiction in which TempMail operates, without
              regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              10. Contact Us
            </h2>
            <p className="leading-relaxed text-foreground/90">
              If you have any questions about these Terms, please contact us at{" "}
              <a
                href="mailto:legal@learnfromme.xyz"
                className="text-primary hover:underline"
              >
                legal@learnfromme.xyz
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
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-foreground font-medium"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
