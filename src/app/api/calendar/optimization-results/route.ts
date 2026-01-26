import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/calendar/optimization-results - Load saved optimization results
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const school_id = searchParams.get('school_id')
    const date = searchParams.get('date')

    if (!school_id || !date) {
      return NextResponse.json(
        { error: 'Missing required params: school_id, date' },
        { status: 400 }
      )
    }

    // Fetch saved optimization results for this school and date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: results, error } = await (supabase as any)
      .from('optimization_results')
      .select('*')
      .eq('school_id', school_id)
      .eq('date', date)

    if (error) {
      // Table might not exist yet - return empty results
      console.log('[optimization-results] Error fetching:', error.message)
      return NextResponse.json({ regular: null, minimal: null })
    }

    // Parse results into regular and minimal
    const regular = results?.find((r: { result_type: string }) => r.result_type === 'regular')
    const minimal = results?.find((r: { result_type: string }) => r.result_type === 'minimal')

    return NextResponse.json({
      regular: regular?.result_data || null,
      minimal: minimal?.result_data || null
    })
  } catch (error) {
    console.error('Error in GET /api/calendar/optimization-results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
