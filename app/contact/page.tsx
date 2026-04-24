import AppHeader from "@/components/AppHeader"

export const dynamic = "force-dynamic"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">

      <AppHeader showBack={true} />

      <div className="max-w-3xl mx-auto px-4 py-10">

        <h1 className="text-2xl font-semibold mb-4">
          Contact Us
        </h1>

        <p className="text-muted-foreground">
          For any queries or support, feel free to reach out:
        </p>

        <p className="mt-4 text-primary">
          rohiranihal8@gmail.com
        </p>

      </div>
    </div>
  )
}
