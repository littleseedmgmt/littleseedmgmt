import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface StudentRecord {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  status: string
}

interface ClassroomRecord {
  id: string
  name: string
  school_id: string
  school: { id: string; name: string }
  students?: StudentRecord[]
}

// GET /api/classrooms - List classrooms with optional student data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const schoolId = searchParams.get('school_id')
    const includeStudents = searchParams.get('include_students') === 'true'

    let query = supabase
      .from('classrooms')
      .select(`
        *,
        school:schools(id, name)
        ${includeStudents ? ',students(id, first_name, last_name, date_of_birth, status)' : ''}
      `)
      .order('name')

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching classrooms:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const classrooms = (data || []) as ClassroomRecord[]

    // Filter to only enrolled students if students are included
    if (includeStudents && classrooms.length > 0) {
      const filteredData = classrooms.map(classroom => ({
        ...classroom,
        students: (classroom.students || []).filter(s => s.status === 'enrolled'),
      }))
      return NextResponse.json(filteredData)
    }

    return NextResponse.json(classrooms)
  } catch (error) {
    console.error('Error in GET /api/classrooms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
