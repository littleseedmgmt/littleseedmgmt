import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface StudentRecord {
  id: string
  school_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  classroom_id: string | null
  guardian_name: string
  guardian_phone: string | null
  status: string
  enrollment_date: string | null
  classroom: { id: string; name: string } | null
  school: { id: string; name: string }
}

// GET /api/students - List students
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const schoolId = searchParams.get('school_id')
    const classroomId = searchParams.get('classroom_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('students')
      .select(`
        id, school_id, first_name, last_name, date_of_birth,
        classroom_id, guardian_name, guardian_phone, status,
        enrollment_date,
        classroom:classrooms(id, name),
        school:schools(id, name)
      `)
      .order('last_name')

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    if (classroomId) {
      query = query.eq('classroom_id', classroomId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching students:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json((data || []) as unknown as StudentRecord[])
  } catch (error) {
    console.error('Error in GET /api/students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
