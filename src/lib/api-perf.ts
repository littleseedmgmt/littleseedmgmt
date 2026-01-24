// Server-side API performance logging
// Logs timing for API route handlers

import { NextRequest, NextResponse } from 'next/server'

export interface ApiPerfLog {
  route: string
  method: string
  duration: number
  status: number
  timestamp: string
}

// Color codes for console logging
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function getDurationColor(duration: number): string {
  if (duration > 1000) return colors.red
  if (duration > 500) return colors.yellow
  return colors.green
}

function getStatusColor(status: number): string {
  if (status >= 500) return colors.red
  if (status >= 400) return colors.yellow
  return colors.green
}

export function logApiPerf(log: ApiPerfLog) {
  const durationColor = getDurationColor(log.duration)
  const statusColor = getStatusColor(log.status)

  console.log(
    `${colors.cyan}[API]${colors.reset} ` +
    `${colors.blue}${log.method}${colors.reset} ` +
    `${log.route} ` +
    `${statusColor}${log.status}${colors.reset} ` +
    `${durationColor}${log.duration.toFixed(2)}ms${colors.reset}`
  )
}

// Wrapper for API handlers that adds timing
export function withApiPerf<T extends NextRequest>(
  routeName: string,
  handler: (request: T) => Promise<NextResponse>
) {
  return async (request: T): Promise<NextResponse> => {
    const startTime = performance.now()
    const method = request.method

    try {
      const response = await handler(request)
      const duration = performance.now() - startTime

      logApiPerf({
        route: routeName,
        method,
        duration,
        status: response.status,
        timestamp: new Date().toISOString(),
      })

      // Add timing header for client-side correlation
      response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`)

      return response
    } catch (error) {
      const duration = performance.now() - startTime

      logApiPerf({
        route: routeName,
        method,
        duration,
        status: 500,
        timestamp: new Date().toISOString(),
      })

      throw error
    }
  }
}

// Simple timing utility for measuring database queries
export async function timeQuery<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start

    const durationColor = getDurationColor(duration)
    console.log(
      `${colors.cyan}[DB]${colors.reset} ` +
      `${queryName} ` +
      `${durationColor}${duration.toFixed(2)}ms${colors.reset}`
    )

    return result
  } catch (error) {
    const duration = performance.now() - start
    console.log(
      `${colors.cyan}[DB]${colors.reset} ` +
      `${queryName} ` +
      `${colors.red}FAILED ${duration.toFixed(2)}ms${colors.reset}`
    )
    throw error
  }
}
