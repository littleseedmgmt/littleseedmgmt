import { createClient } from '@/lib/supabase/server'
import { timeQuery, logApiPerf } from '@/lib/api-perf'
import { NextRequest, NextResponse } from 'next/server'

interface SchoolRecord {
  id: string
  name: string
}

interface AttendanceRecord {
  status: string
}

interface StudentCount {
  age_group: string
  count: number
  qualified_teachers: number
  aides: number
}

interface DirectorSummaryRecord {
  id: string
  school_id: string
  date: string
  student_counts: StudentCount[]
  teacher_absences: string[]
  schedule_changes: { name: string; note: string }[]
  updated_at: string
}

// GET /api/attendance/summary - Get attendance summary for a date
export async function GET(request: NextRequest) {
  const apiStart = performance.now()

  try {
    const supabase = await createClient()
    const { data: { user } } = await timeQuery('auth.getUser', () =>
      supabase.auth.getUser()
    )

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

    const { data: schoolsData, error: schoolsError } = await timeQuery('schools.select', async () => {
      const result = await schoolsQuery
      return result
    })

    if (schoolsError) {
      return NextResponse.json({ error: schoolsError.message }, { status: 500 })
    }

    const schools = (schoolsData || []) as SchoolRecord[]

    // Fetch all director summaries for the date in one query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any
    const { data: directorSummaries } = await timeQuery('director_summaries.select', async () => {
      const result = await supabaseAny
        .from('director_daily_summaries')
        .select('*')
        .eq('date', date)
        .in('school_id', schools.map(s => s.id))
      return result
    })

    const summariesMap = new Map<string, DirectorSummaryRecord>()
    if (directorSummaries) {
      for (const summary of directorSummaries) {
        summariesMap.set(summary.school_id, summary as DirectorSummaryRecord)
      }
    }

    // Get summary for each school
    const summaries = await Promise.all(
      schools.map(async (school) => {
        // Check if director summary exists for this school+date
        const directorSummary = summariesMap.get(school.id)

        // Get both queries in parallel for this school
        const [studentResult, attendanceResult] = await Promise.all([
          timeQuery(`students.count(${school.name})`, async () => {
            const result = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', school.id)
              .eq('status', 'enrolled')
            return result
          }),
          timeQuery(`attendance.select(${school.name})`, async () => {
            const result = await supabase
              .from('attendance')
              .select('status')
              .eq('school_id', school.id)
              .eq('date', date)
            return result
          }),
        ])

        const { count: totalStudents } = studentResult
        const { data: attendanceData } = attendanceResult

        const attendance = (attendanceData || []) as AttendanceRecord[]
        const systemPresent = attendance.filter(a => a.status === 'present').length
        const systemAbsent = attendance.filter(a => a.status === 'absent').length
        const systemLate = attendance.filter(a => a.status === 'late').length
        const systemExcused = attendance.filter(a => a.status === 'excused').length
        const systemNotRecorded = (totalStudents || 0) - attendance.length

        // If director summary exists, use its totals for the dashboard view
        if (directorSummary && directorSummary.student_counts.length > 0) {
          const directorTotal = directorSummary.student_counts.reduce(
            (sum: number, c: StudentCount) => sum + c.count, 0
          )
          const directorQT = directorSummary.student_counts.reduce(
            (sum: number, c: StudentCount) => sum + c.qualified_teachers, 0
          )
          const directorAides = directorSummary.student_counts.reduce(
            (sum: number, c: StudentCount) => sum + c.aides, 0
          )

          return {
            school_id: school.id,
            school_name: school.name,
            date,
            // Use director's total as "present" count (they're reporting who's there)
            total_students: totalStudents || 0,
            present: directorTotal,
            absent: 0, // Director doesn't report absences this way
            late: 0,
            excused: 0,
            not_recorded: Math.max(0, (totalStudents || 0) - directorTotal),
            attendance_rate: totalStudents ? Math.round((directorTotal / totalStudents) * 100) : 0,
            // Additional director data
            data_source: 'director_summary' as const,
            director_summary: {
              student_counts: directorSummary.student_counts,
              qualified_teachers: directorQT,
              aides: directorAides,
              teacher_absences: directorSummary.teacher_absences,
              schedule_changes: directorSummary.schedule_changes,
              updated_at: directorSummary.updated_at,
            },
            // Keep system data for reference
            system_data: {
              present: systemPresent,
              absent: systemAbsent,
              late: systemLate,
              excused: systemExcused,
              not_recorded: systemNotRecorded,
            },
          }
        }

        // No director summary - use system data
        return {
          school_id: school.id,
          school_name: school.name,
          date,
          total_students: totalStudents || 0,
          present: systemPresent,
          absent: systemAbsent,
          late: systemLate,
          excused: systemExcused,
          not_recorded: systemNotRecorded,
          attendance_rate: totalStudents ? Math.round(((systemPresent + systemLate) / totalStudents) * 100) : 0,
          data_source: 'attendance_system' as const,
        }
      })
    )

    // Calculate organization totals
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

    const response = NextResponse.json({
      date,
      schools: summaries,
      totals: {
        ...totals,
        attendance_rate: totalAttendanceRate,
      },
    })

    // Log total API time
    logApiPerf({
      route: '/api/attendance/summary',
      method: 'GET',
      duration: performance.now() - apiStart,
      status: 200,
      timestamp: new Date().toISOString(),
    })

    return response
  } catch (error) {
    console.error('Error in GET /api/attendance/summary:', error)
    logApiPerf({
      route: '/api/attendance/summary',
      method: 'GET',
      duration: performance.now() - apiStart,
      status: 500,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
