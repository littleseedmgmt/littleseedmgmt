'use client'

import { useState, useEffect } from 'react'
import { usePerf } from '@/contexts/PerfContext'
import { PerfEntry } from '@/lib/perf'

function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function DurationBadge({ duration }: { duration: number }) {
  const color = duration > 500 ? 'bg-red-500' : duration > 200 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <span className={`${color} text-white text-xs px-2 py-0.5 rounded font-mono`}>
      {formatDuration(duration)}
    </span>
  )
}

function EntryRow({ entry }: { entry: PerfEntry }) {
  const typeColors: Record<string, string> = {
    api: 'text-blue-600 bg-blue-50',
    component: 'text-purple-600 bg-purple-50',
    navigation: 'text-green-600 bg-green-50',
    custom: 'text-gray-600 bg-gray-50',
  }

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${typeColors[entry.type]}`}>
          {entry.type}
        </span>
        <span className="text-sm text-gray-700 truncate" title={entry.name}>
          {entry.name}
        </span>
      </div>
      {entry.duration !== undefined ? (
        <DurationBadge duration={entry.duration} />
      ) : (
        <span className="text-xs text-gray-400 animate-pulse">running...</span>
      )}
    </div>
  )
}

export function PerfOverlay() {
  const { entries, summary, isEnabled, disable, clear } = usePerf()
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'api' | 'component'>('all')

  // Don't render if not enabled
  if (!isEnabled) return null

  const filteredEntries = entries.filter(e => {
    if (activeTab === 'all') return true
    return e.type === activeTab
  })

  const completedCount = entries.filter(e => e.duration !== undefined).length
  const apiCount = entries.filter(e => e.type === 'api').length
  const componentCount = entries.filter(e => e.type === 'component').length

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {/* Collapsed view - just shows summary */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-800 flex items-center gap-3"
        >
          <span className="text-sm font-medium">Perf</span>
          {summary && (
            <DurationBadge duration={summary.totalDuration} />
          )}
          <span className="text-gray-400 text-xs">{completedCount} calls</span>
        </button>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-96 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Performance</h3>
              {summary && (
                <DurationBadge duration={summary.totalDuration} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clear}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
              >
                Clear
              </button>
              <button
                onClick={disable}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
              >
                Disable
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatDuration(summary.totalDuration)}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600">{apiCount}</p>
                  <p className="text-[10px] text-gray-500 uppercase">API Calls</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-600">{componentCount}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Components</p>
                </div>
              </div>

              {/* Slowest items */}
              {(summary.slowestApi || summary.slowestComponent) && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                  {summary.slowestApi && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Slowest API:</span>
                      <span className="text-gray-700 truncate max-w-[180px]" title={summary.slowestApi.name}>
                        {summary.slowestApi.name}
                      </span>
                      <span className={`font-mono ${summary.slowestApi.duration > 500 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatDuration(summary.slowestApi.duration)}
                      </span>
                    </div>
                  )}
                  {summary.slowestComponent && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Slowest Component:</span>
                      <span className="text-gray-700 truncate max-w-[180px]" title={summary.slowestComponent.name}>
                        {summary.slowestComponent.name}
                      </span>
                      <span className={`font-mono ${summary.slowestComponent.duration > 200 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatDuration(summary.slowestComponent.duration)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 text-xs font-medium ${
                activeTab === 'all'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All ({entries.length})
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex-1 py-2 text-xs font-medium ${
                activeTab === 'api'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              API ({apiCount})
            </button>
            <button
              onClick={() => setActiveTab('component')}
              className={`flex-1 py-2 text-xs font-medium ${
                activeTab === 'component'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Components ({componentCount})
            </button>
          </div>

          {/* Entries list */}
          <div className="flex-1 overflow-auto p-3 max-h-64">
            {filteredEntries.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No entries yet</p>
            ) : (
              <div className="space-y-0">
                {filteredEntries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 rounded-b-xl">
            <p className="text-[10px] text-gray-400 text-center">
              Enable: Add ?perf=1 to URL or run localStorage.setItem(&apos;perf_debug&apos;, &apos;1&apos;)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Standalone toggle button for when overlay is disabled
export function PerfToggle() {
  const { isEnabled, enable } = usePerf()
  const [showHint, setShowHint] = useState(false)

  // Only show in development
  if (process.env.NODE_ENV !== 'development' && !isEnabled) return null
  if (isEnabled) return null // Overlay will show its own UI

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999]"
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
    >
      {showHint && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
          Click to enable performance monitoring
        </div>
      )}
      <button
        onClick={enable}
        className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-lg shadow-md transition-colors"
        title="Enable Performance Monitoring"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    </div>
  )
}
