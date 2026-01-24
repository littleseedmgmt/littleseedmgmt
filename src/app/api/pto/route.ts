import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface PTORecord {
  id: string
  school_id: string
  teacher_id: string
  start_date: string
  end_date: string
  type: string
  hours_requested: number
  status: string
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  teacher: {
    id: string
    first_name: string
    last_name: string
    photo_url: string | null
  }
  school: {
    id: string
    name: string
  }
}

// GET /api/pto - List PTO requests
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const schoolId = searchParams.get('school_id')
    const teacherId = searchParams.get('teacher_id')
    const status = searchParams.get('status') // pending, approved, rejected
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('pto_requests')
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, photo_url),
        school:schools(id, name)
      `)
      .order('created_at', { ascending: false })

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('start_date', startDate)
    }

    if (endDate) {
      query = query.lte('end_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching PTO requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json((data || []) as unknown as PTORecord[])
  } catch (error) {
    console.error('Error in GET /api/pto:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/pto - Submit new PTO request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { school_id, teacher_id, start_date, end_date, type, hours_requested, notes } = body

    if (!school_id || !teacher_id || !start_date || !end_date || !type || !hours_requested) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, teacher_id, start_date, end_date, type, hours_requested' },
        { status: 400 }
      )
    }

    // Validate PTO type
    const validTypes = ['vacation', 'sick', 'personal', 'unpaid']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid PTO type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('pto_requests')
      .insert({
        school_id,
        teacher_id,
        start_date,
        end_date,
        type,
        hours_requested,
        notes,
        status: 'pending',
      })
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, photo_url),
        school:schools(id, name)
      `)
      .single()

    if (error) {
      console.error('Error creating PTO request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/pto:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
