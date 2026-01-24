import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AuthProvider } from "@/contexts/AuthContext"
import { PerfProvider } from "@/contexts/PerfContext"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { EnvBanner } from "@/components/EnvBanner"
import { PerfOverlay, PerfToggle } from "@/components/PerfOverlay"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <AuthProvider>
      <PerfProvider>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <EnvBanner />
          <div className="flex-1 flex">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
        <PerfOverlay />
        <PerfToggle />
      </PerfProvider>
    </AuthProvider>
  )
}
