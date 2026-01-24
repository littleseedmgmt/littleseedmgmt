import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface TeacherRecord {
  id: string
  school_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  role: string
  classroom_title: string | null
  regular_shift_start: string | null
  regular_shift_end: string | null
  status: string
  photo_url: string | null
  hire_date: string
  school: { id: string; name: string }
}

// GET /api/staff - List all teachers
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const schoolId = searchParams.get('school_id')
    const status = searchParams.get('status') || 'active'
    const role = searchParams.get('role')

    let query = supabase
      .from('teachers')
      .select(`
        id, school_id, first_name, last_name, email, phone,
        role, classroom_title, regular_shift_start, regular_shift_end,
        status, photo_url, hire_date,
        school:schools(id, name)
      `)
      .order('last_name')

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (role) {
      query = query.eq('role', role)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching staff:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const teachers = (data || []) as unknown as TeacherRecord[]

    return NextResponse.json(teachers)
  } catch (error) {
    console.error('Error in GET /api/staff:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
