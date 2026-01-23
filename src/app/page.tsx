import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LS</span>
            </div>
            <span className="font-semibold text-lg">LittleSeedMgmt</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="btn btn-primary"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-display text-gray-900 mb-6">
            School Management,
            <br />
            <span className="text-brand">Simplified</span>
          </h1>
          <p className="text-body-lg text-gray-500 mb-10 max-w-2xl mx-auto">
            LittleSeedMgmt is a comprehensive management system for LittleSeed Schools.
            Track attendance, manage schedules, handle staff planning, and more — all in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/login" className="btn btn-primary">
              Sign In to Dashboard
            </Link>
            <a href="https://github.com/kamalneel/littleseedmgmt" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
              View Documentation
            </a>
          </div>

          {/* Feature cards */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="card">
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-h4 mb-2">Attendance Tracking</h3>
              <p className="text-body-sm text-gray-500">
                Quick check-in/check-out for students with real-time dashboard and reports.
              </p>
            </div>

            <div className="card">
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-h4 mb-2">Calendar Management</h3>
              <p className="text-body-sm text-gray-500">
                Manage teacher schedules, classroom assignments, and school events.
              </p>
            </div>

            <div className="card">
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-h4 mb-2">Staff Planning</h3>
              <p className="text-body-sm text-gray-500">
                Handle shifts, PTO requests, and ensure proper classroom coverage.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-body-sm text-gray-500">
          <p>LittleSeed Schools — San Jose • Fremont • Milpitas</p>
          <p className="mt-1">Owned by Alpna Wadhwa and Prashant Wadhwa</p>
        </div>
      </footer>
    </div>
  );
}
