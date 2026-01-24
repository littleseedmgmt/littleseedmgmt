import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ShiftRecord {
  id: string
  school_id: string
  teacher_id: string
  classroom_id: string | null
  date: string
  start_time: string
  end_time: string
  actual_start: string | null
  actual_end: string | null
  status: string
  shift_type: string
  break1_start: string | null
  break1_end: string | null
  lunch_start: string | null
  lunch_end: string | null
  break2_start: string | null
  break2_end: string | null
  notes: string | null
  teacher: {
    id: string
    first_name: string
    last_name: string
    photo_url: string | null
  }
  classroom: {
    id: string
    name: string
  } | null
}

// GET /api/staff/shifts - Get shifts for teachers
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
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('shifts')
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, photo_url),
        classroom:classrooms(id, name)
      `)
      .order('start_time')

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    }

    // Date filtering
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    } else {
      query = query.eq('date', date)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching shifts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json((data || []) as unknown as ShiftRecord[])
  } catch (error) {
    console.error('Error in GET /api/staff/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/staff/shifts - Create a new shift
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      school_id, teacher_id, classroom_id, date, start_time, end_time,
      shift_type, break1_start, break1_end, lunch_start, lunch_end,
      break2_start, break2_end, notes
    } = body

    if (!school_id || !teacher_id || !date || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, teacher_id, date, start_time, end_time' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('shifts')
      .insert({
        school_id,
        teacher_id,
        classroom_id,
        date,
        start_time,
        end_time,
        shift_type: shift_type || 'regular',
        break1_start,
        break1_end,
        lunch_start,
        lunch_end,
        break2_start,
        break2_end,
        notes,
        status: 'scheduled',
      })
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, photo_url),
        classroom:classrooms(id, name)
      `)
      .single()

    if (error) {
      console.error('Error creating shift:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/staff/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
