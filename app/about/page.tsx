import AppHeader from "@/components/AppHeader"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">

      <AppHeader showBack={true} />

      <div className="max-w-3xl mx-auto px-4 py-10">

        <h1 className="text-2xl font-semibold mb-4">
          About TempMail
        </h1>

        <p className="text-muted-foreground leading-relaxed">
          TempMail provides temporary email addresses to help users protect their privacy and avoid spam.
        </p>

        <p className="text-muted-foreground leading-relaxed mt-4">
          Our goal is to offer a fast, secure, and simple disposable email service for everyday use.
        </p>

      </div>
    </div>
  )
}
