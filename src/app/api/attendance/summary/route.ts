import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface SchoolRecord {
  id: string
  name: string
}

interface AttendanceRecord {
  status: string
}

// GET /api/attendance/summary - Get attendance summary for a date
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

    // Get all schools the user has access to
    let schoolsQuery = supabase.from('schools').select('id, name').eq('status', 'active')

    if (schoolId) {
      schoolsQuery = schoolsQuery.eq('id', schoolId)
    }

    const { data: schoolsData, error: schoolsError } = await schoolsQuery

    if (schoolsError) {
      return NextResponse.json({ error: schoolsError.message }, { status: 500 })
    }

    const schools = (schoolsData || []) as SchoolRecord[]

    // Get summary for each school
    const summaries = await Promise.all(
      schools.map(async (school) => {
        // Get total enrolled students
        const { count: totalStudents } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('status', 'enrolled')

        // Get attendance records for today
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('status')
          .eq('school_id', school.id)
          .eq('date', date)

        const attendance = (attendanceData || []) as AttendanceRecord[]
        const present = attendance.filter(a => a.status === 'present').length
        const absent = attendance.filter(a => a.status === 'absent').length
        const late = attendance.filter(a => a.status === 'late').length
        const excused = attendance.filter(a => a.status === 'excused').length
        const notRecorded = (totalStudents || 0) - attendance.length

        return {
          school_id: school.id,
          school_name: school.name,
          date,
          total_students: totalStudents || 0,
          present,
          absent,
          late,
          excused,
          not_recorded: notRecorded,
          attendance_rate: totalStudents ? Math.round(((present + late) / totalStudents) * 100) : 0,
        }
      })
    )

    // Calculate organization totals if viewing all schools
    const totals = {
      total_students: summaries.reduce((sum, s) => sum + s.total_students, 0),
      present: summaries.reduce((sum, s) => sum + s.present, 0),
      absent: summaries.reduce((sum, s) => sum + s.absent, 0),
      late: summaries.reduce((sum, s) => sum + s.late, 0),
      excused: summaries.reduce((sum, s) => sum + s.excused, 0),
      not_recorded: summaries.reduce((sum, s) => sum + s.not_recorded, 0),
    }

    const totalAttendanceRate = totals.total_students
      ? Math.round(((totals.present + totals.late) / totals.total_students) * 100)
      : 0

    return NextResponse.json({
      date,
      schools: summaries,
      totals: {
        ...totals,
        attendance_rate: totalAttendanceRate,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/attendance/summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
