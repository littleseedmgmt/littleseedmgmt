import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface StudentRecord {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
}

interface AttendanceRecord {
  id: string
  student_id: string
  school_id: string
  date: string
  status: string
  check_in_time?: string
  check_out_time?: string
  notes?: string
}

interface ClassroomRecord {
  id: string
  name: string
  school_id: string
  school: { id: string; name: string }
}

// GET /api/classrooms/[id]/attendance - Get classroom students with attendance for a date
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: classroomId } = await params
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get classroom info
    const { data: classroomData, error: classroomError } = await supabase
      .from('classrooms')
      .select(`
        *,
        school:schools(id, name)
      `)
      .eq('id', classroomId)
      .single()

    if (classroomError) {
      return NextResponse.json({ error: classroomError.message }, { status: 404 })
    }

    const classroom = classroomData as unknown as ClassroomRecord

    // Get students in this classroom
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name, date_of_birth')
      .eq('classroom_id', classroomId)
      .eq('status', 'enrolled')
      .order('last_name')

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 })
    }

    const students = (studentsData || []) as StudentRecord[]

    // Get attendance records for these students on this date
    const studentIds = students.map(s => s.id)

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .in('student_id', studentIds)
      .eq('date', date)

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message }, { status: 500 })
    }

    const attendanceRecords = (attendanceData || []) as AttendanceRecord[]

    // Create a map of student_id to attendance
    const attendanceMap = new Map(
      attendanceRecords.map(a => [a.student_id, a])
    )

    // Combine students with their attendance
    const studentsWithAttendance = students.map(student => ({
      ...student,
      attendance: attendanceMap.get(student.id) || null,
    }))

    // Calculate summary
    const summary = {
      total: studentsWithAttendance.length,
      present: studentsWithAttendance.filter(s => s.attendance?.status === 'present').length,
      absent: studentsWithAttendance.filter(s => s.attendance?.status === 'absent').length,
      late: studentsWithAttendance.filter(s => s.attendance?.status === 'late').length,
      excused: studentsWithAttendance.filter(s => s.attendance?.status === 'excused').length,
      not_recorded: studentsWithAttendance.filter(s => !s.attendance).length,
    }

    return NextResponse.json({
      classroom,
      date,
      students: studentsWithAttendance,
      summary,
    })
  } catch (error) {
    console.error('Error in GET /api/classrooms/[id]/attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
