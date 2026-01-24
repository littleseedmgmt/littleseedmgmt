'use client'

const isTestMode = process.env.NEXT_PUBLIC_ENV_MODE === 'test'
const prodUrl = process.env.NEXT_PUBLIC_PROD_URL || 'https://app.littleseedmgmt.com'
const testUrl = process.env.NEXT_PUBLIC_TEST_URL || 'https://test.littleseedmgmt.com'

export function EnvBanner() {
  if (isTestMode) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">TEST MODE</span>
          <span className="hidden sm:inline">— You are using test data. Changes here won't affect production.</span>
        </div>
        <a
          href={prodUrl}
          className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white font-medium transition-colors"
        >
          Switch to Production
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    )
  }

  // In production, show a subtle link in the corner (optional - can be removed)
  return null
}

// Separate component for settings page to show environment switcher
export function EnvSwitcher() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment</h2>

      <div className="flex items-center gap-4 mb-4">
        <div className={`flex-1 p-4 rounded-lg border-2 ${isTestMode ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            {isTestMode && (
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            )}
            <span className="font-medium text-gray-900">Test Environment</span>
          </div>
          <p className="text-sm text-gray-500">Safe to experiment. Uses test data.</p>
          {!isTestMode && (
            <a
              href={testUrl}
              className="mt-3 inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              Switch to Test Mode
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        <div className={`flex-1 p-4 rounded-lg border-2 ${!isTestMode ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            {!isTestMode && (
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            )}
            <span className="font-medium text-gray-900">Production</span>
          </div>
          <p className="text-sm text-gray-500">Live data. Changes affect real records.</p>
          {isTestMode && (
            <a
              href={prodUrl}
              className="mt-3 inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Switch to Production
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Each environment has its own database. Your login works in both.
      </p>
    </div>
  )
}
