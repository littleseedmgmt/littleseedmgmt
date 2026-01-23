import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/attendance - List attendance records with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const schoolId = searchParams.get('school_id')
    const classroomId = searchParams.get('classroom_id')
    const studentId = searchParams.get('student_id')

    let query = supabase
      .from('attendance')
      .select(`
        *,
        student:students(id, first_name, last_name, classroom_id),
        school:schools(id, name)
      `)
      .eq('date', date)
      .order('created_at', { ascending: false })

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    if (classroomId) {
      query = query.eq('student.classroom_id', classroomId)
    }

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching attendance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/attendance - Create or update attendance record
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { student_id, school_id, date, status, check_in_time, check_out_time, notes } = body

    if (!student_id || !school_id || !date || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: student_id, school_id, date, status' },
        { status: 400 }
      )
    }

    // Upsert: update if exists, insert if not
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        {
          student_id,
          school_id,
          date,
          status,
          check_in_time,
          check_out_time,
          notes,
          recorded_by: user.id,
        } as any,
        {
          onConflict: 'student_id,date',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error creating attendance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
