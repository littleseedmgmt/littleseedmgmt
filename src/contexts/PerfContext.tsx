'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react'
import { perfMonitor, PerfEntry, PerfSummary } from '@/lib/perf'

interface PerfContextType {
  entries: PerfEntry[]
  summary: PerfSummary | null
  isEnabled: boolean
  enable: () => void
  disable: () => void
  clear: () => void
  startComponent: (name: string) => string
  endComponent: (id: string) => void
}

const PerfContext = createContext<PerfContextType | undefined>(undefined)

export function PerfProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<PerfEntry[]>([])
  const [summary, setSummary] = useState<PerfSummary | null>(null)
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    if (!perfMonitor) return

    setIsEnabled(perfMonitor.isEnabled())

    const unsubscribe = perfMonitor.subscribe((newEntries) => {
      setEntries([...newEntries])
      setSummary(perfMonitor.getSummary())
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const enable = useCallback(() => {
    perfMonitor?.enable()
    setIsEnabled(true)
  }, [])

  const disable = useCallback(() => {
    perfMonitor?.disable()
    setIsEnabled(false)
  }, [])

  const clear = useCallback(() => {
    perfMonitor?.clear()
    setEntries([])
    setSummary(null)
  }, [])

  const startComponent = useCallback((name: string): string => {
    return perfMonitor?.start(name, 'component') || ''
  }, [])

  const endComponent = useCallback((id: string) => {
    perfMonitor?.end(id)
  }, [])

  return (
    <PerfContext.Provider
      value={{
        entries,
        summary,
        isEnabled,
        enable,
        disable,
        clear,
        startComponent,
        endComponent,
      }}
    >
      {children}
    </PerfContext.Provider>
  )
}

export function usePerf() {
  const context = useContext(PerfContext)
  if (context === undefined) {
    throw new Error('usePerf must be used within a PerfProvider')
  }
  return context
}

// Hook to automatically track component render/mount time
export function useComponentPerf(componentName: string) {
  const perfIdRef = useRef<string>('')
  const mountTimeRef = useRef<number>(0)
  const { isEnabled, startComponent, endComponent } = usePerf()

  useEffect(() => {
    if (!isEnabled) return

    mountTimeRef.current = performance.now()
    perfIdRef.current = startComponent(componentName)

    // End timing after the component has mounted and rendered
    // Using requestAnimationFrame to measure after paint
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        endComponent(perfIdRef.current)
      })
    })

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [isEnabled, componentName, startComponent, endComponent])

  // Return a function to manually mark data-ready (for async data)
  const markDataReady = useCallback(() => {
    if (isEnabled && perfIdRef.current) {
      endComponent(perfIdRef.current)
      // Start a new timing for any re-renders
      perfIdRef.current = startComponent(`${componentName} (data ready)`)
    }
  }, [isEnabled, componentName, startComponent, endComponent])

  return { markDataReady }
}
