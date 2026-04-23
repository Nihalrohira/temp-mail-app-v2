import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AdminPageClient } from "./admin-page-client"

const ADMIN_EMAIL = "rohiranihal8@gmail.com"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const email = cookieStore.get("admin_email")?.value ?? null
  const session = email ? { user: { email } } : null
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    redirect("/")
  }
  return <AdminPageClient />
}
