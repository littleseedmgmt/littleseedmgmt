import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase client
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

// Import after mocks are set up
const { GET } = await import('../route')

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3005'))
}

// Build a chainable query mock that resolves to the given data/error
function setupQuery(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) => resolve(result),
  }
  // Make it thenable so await works
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      return Promise.resolve(result).then(resolve, reject)
    },
    enumerable: false,
  })
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('GET /api/staff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await GET(makeRequest('/api/staff'))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns staff list for authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const teachers = [
      {
        id: 't1',
        school_id: 's1',
        first_name: 'Sarah',
        last_name: 'Johnson',
        role: 'lead',
        status: 'active',
        school: { id: 's1', name: 'Peter Pan Mariner Square' },
      },
    ]
    setupQuery({ data: teachers, error: null })

    const response = await GET(makeRequest('/api/staff'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].first_name).toBe('Sarah')
  })

  it('filters by school_id when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const chain = setupQuery({ data: [], error: null })

    await GET(makeRequest('/api/staff?school_id=s1'))

    expect(chain.eq).toHaveBeenCalledWith('school_id', 's1')
  })

  it('filters by role when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const chain = setupQuery({ data: [], error: null })

    await GET(makeRequest('/api/staff?role=lead'))

    expect(chain.eq).toHaveBeenCalledWith('role', 'lead')
  })

  it('defaults to active status filter', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const chain = setupQuery({ data: [], error: null })

    await GET(makeRequest('/api/staff'))

    expect(chain.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('skips status filter when status=all', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const chain = setupQuery({ data: [], error: null })

    await GET(makeRequest('/api/staff?status=all'))

    // Should not filter by status when 'all' is specified
    const statusCalls = chain.eq.mock.calls.filter(
      (call: unknown[]) => call[0] === 'status'
    )
    expect(statusCalls).toHaveLength(0)
  })

  it('returns 500 on database error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    setupQuery({ data: null, error: { message: 'Database connection failed' } })

    const response = await GET(makeRequest('/api/staff'))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Database connection failed')
  })
})
