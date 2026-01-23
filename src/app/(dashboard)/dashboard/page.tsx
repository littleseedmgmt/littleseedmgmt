import { createClient } from "@/lib/supabase/server"
import type { School } from "@/types/database"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: schools } = await supabase.from("schools").select("*") as { data: School[] | null }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-h1 text-gray-900">Dashboard</h1>
        <p className="text-body text-gray-500 mt-1">{today}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-body-sm text-gray-500 mb-1">Total Students</p>
          <p className="text-display text-gray-900">—</p>
          <p className="text-caption text-gray-400 mt-2">Across all schools</p>
        </div>

        <div className="card">
          <p className="text-body-sm text-gray-500 mb-1">Present Today</p>
          <p className="text-display text-brand">—</p>
          <p className="text-caption text-gray-400 mt-2">Attendance rate</p>
        </div>

        <div className="card">
          <p className="text-body-sm text-gray-500 mb-1">Teachers On Duty</p>
          <p className="text-display text-gray-900">—</p>
          <p className="text-caption text-gray-400 mt-2">Active today</p>
        </div>

        <div className="card">
          <p className="text-body-sm text-gray-500 mb-1">PTO Requests</p>
          <p className="text-display text-warning">—</p>
          <p className="text-caption text-gray-400 mt-2">Pending approval</p>
        </div>
      </div>

      {/* Schools Section */}
      <div className="mb-8">
        <h2 className="text-h3 text-gray-900 mb-4">Schools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {schools && schools.length > 0 ? (
            schools.map((school) => (
              <div key={school.id} className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-h4">{school.name}</h3>
                    <p className="text-caption text-gray-500">{school.city}, {school.state}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-h3 text-gray-900">—</p>
                    <p className="text-caption text-gray-500">Students</p>
                  </div>
                  <div>
                    <p className="text-h3 text-gray-900">—</p>
                    <p className="text-caption text-gray-500">Teachers</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 card text-center py-12">
              <p className="text-gray-500">No schools found. Connect to Supabase and run migrations to see data.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-h3 text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="card flex items-center gap-3 hover:border-brand transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="text-body-sm font-medium text-gray-900">Record Attendance</p>
              <p className="text-caption text-gray-500">Mark student check-ins</p>
            </div>
          </button>

          <button className="card flex items-center gap-3 hover:border-brand transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-body-sm font-medium text-gray-900">View Schedule</p>
              <p className="text-caption text-gray-500">Teacher assignments</p>
            </div>
          </button>

          <button className="card flex items-center gap-3 hover:border-brand transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-body-sm font-medium text-gray-900">Approve PTO</p>
              <p className="text-caption text-gray-500">Pending requests</p>
            </div>
          </button>

          <button className="card flex items-center gap-3 hover:border-brand transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-body-sm font-medium text-gray-900">Generate Report</p>
              <p className="text-caption text-gray-500">Export data</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
