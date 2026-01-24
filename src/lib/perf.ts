// Performance monitoring utilities
// Enable with ?perf=1 in the URL or localStorage.setItem('perf_debug', '1')

export interface PerfEntry {
  id: string
  name: string
  type: 'api' | 'component' | 'navigation' | 'custom'
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
}

export interface PerfSummary {
  totalDuration: number
  apiCalls: { name: string; duration: number }[]
  components: { name: string; duration: number }[]
  slowestApi?: { name: string; duration: number }
  slowestComponent?: { name: string; duration: number }
}

class PerfMonitor {
  private entries: Map<string, PerfEntry> = new Map()
  private listeners: Set<(entries: PerfEntry[]) => void> = new Set()
  private navigationStart: number = 0
  private enabled: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkEnabled()
      // Re-check on navigation
      window.addEventListener('popstate', () => this.checkEnabled())
    }
  }

  private checkEnabled() {
    const urlParams = new URLSearchParams(window.location.search)
    const urlEnabled = urlParams.get('perf') === '1'
    const localEnabled = localStorage.getItem('perf_debug') === '1'
    this.enabled = urlEnabled || localEnabled

    if (urlEnabled && !localEnabled) {
      // Persist for session if enabled via URL
      localStorage.setItem('perf_debug', '1')
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  enable() {
    this.enabled = true
    if (typeof window !== 'undefined') {
      localStorage.setItem('perf_debug', '1')
    }
  }

  disable() {
    this.enabled = false
    if (typeof window !== 'undefined') {
      localStorage.removeItem('perf_debug')
    }
  }

  startNavigation(route: string) {
    if (!this.enabled) return

    this.navigationStart = performance.now()
    this.entries.clear() // Clear previous page entries

    this.addEntry({
      id: `nav-${Date.now()}`,
      name: `Navigation: ${route}`,
      type: 'navigation',
      startTime: this.navigationStart,
    })

    this.log(`🚀 Navigation started: ${route}`)
  }

  start(name: string, type: PerfEntry['type'], metadata?: Record<string, unknown>): string {
    if (!this.enabled) return ''

    const id = `${type}-${name}-${Date.now()}`
    const entry: PerfEntry = {
      id,
      name,
      type,
      startTime: performance.now(),
      metadata,
    }

    this.entries.set(id, entry)
    this.log(`⏱️ Started: [${type}] ${name}`)

    return id
  }

  end(id: string) {
    if (!this.enabled || !id) return

    const entry = this.entries.get(id)
    if (!entry) return

    entry.endTime = performance.now()
    entry.duration = entry.endTime - entry.startTime

    const durationColor = entry.duration > 500 ? '🔴' : entry.duration > 200 ? '🟡' : '🟢'
    this.log(`${durationColor} Completed: [${entry.type}] ${entry.name} - ${entry.duration.toFixed(2)}ms`)

    this.notifyListeners()
  }

  private addEntry(entry: PerfEntry) {
    this.entries.set(entry.id, entry)
  }

  getEntries(): PerfEntry[] {
    return Array.from(this.entries.values())
  }

  getCompletedEntries(): PerfEntry[] {
    return this.getEntries().filter(e => e.duration !== undefined)
  }

  getSummary(): PerfSummary {
    const completed = this.getCompletedEntries()

    const apiCalls = completed
      .filter(e => e.type === 'api')
      .map(e => ({ name: e.name, duration: e.duration! }))
      .sort((a, b) => b.duration - a.duration)

    const components = completed
      .filter(e => e.type === 'component')
      .map(e => ({ name: e.name, duration: e.duration! }))
      .sort((a, b) => b.duration - a.duration)

    const totalDuration = this.navigationStart > 0
      ? performance.now() - this.navigationStart
      : completed.reduce((sum, e) => sum + (e.duration || 0), 0)

    return {
      totalDuration,
      apiCalls,
      components,
      slowestApi: apiCalls[0],
      slowestComponent: components[0],
    }
  }

  subscribe(listener: (entries: PerfEntry[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    const entries = this.getEntries()
    this.listeners.forEach(listener => listener(entries))
  }

  private log(message: string) {
    if (this.enabled) {
      console.log(`[PERF] ${message}`)
    }
  }

  clear() {
    this.entries.clear()
    this.navigationStart = 0
    this.notifyListeners()
  }
}

// Singleton instance
export const perfMonitor = typeof window !== 'undefined' ? new PerfMonitor() : null as unknown as PerfMonitor

// Instrumented fetch wrapper
export async function perfFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const name = url.replace(/^.*\/api\//, '/api/').split('?')[0]

  const id = perfMonitor?.start(name, 'api', { url, method: init?.method || 'GET' })

  try {
    const response = await fetch(input, init)
    perfMonitor?.end(id)
    return response
  } catch (error) {
    perfMonitor?.end(id)
    throw error
  }
}

// Helper to time any async function
export async function perfTime<T>(
  name: string,
  type: PerfEntry['type'],
  fn: () => Promise<T>
): Promise<T> {
  const id = perfMonitor?.start(name, type)
  try {
    const result = await fn()
    perfMonitor?.end(id)
    return result
  } catch (error) {
    perfMonitor?.end(id)
    throw error
  }
}
