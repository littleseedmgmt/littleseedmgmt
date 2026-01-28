import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Teacher {
  id: string
  first_name: string
  last_name: string
  role: string
  classroom_title: string | null
  regular_shift_start: string | null
  regular_shift_end: string | null
  lunch_break_start: string | null
  lunch_break_end: string | null
  qualifications: string | null
}

interface Student {
  id: string
  classroom_id: string
  nap_start: string | null
  nap_end: string | null
}

interface Classroom {
  id: string
  name: string
  age_group: string
  nap_start: string | null
  nap_end: string | null
}

interface RatioSettings {
  infant: number
  toddler: number
  twos: number
  threes: number
  preschool: number
  pre_k: number
  [key: string]: number
}

interface MinimalScheduleBlock {
  start_time: string
  end_time: string
  classroom_name: string
  type: 'work' | 'break' | 'lunch'
  notes?: string
  sub_name?: string  // Who covers during break/lunch
}

interface MinimalTeacherSchedule {
  teacher_id: string
  teacher_name: string
  role: string
  is_essential: boolean
  reason: string
  blocks: MinimalScheduleBlock[]
}

interface MinimalOptimizationResult {
  success: boolean
  date: string
  school_id: string
  school_name: string
  current_teachers: number
  minimal_teachers_needed: number
  potential_savings: number
  essential_teachers: MinimalTeacherSchedule[]
  surplus_teachers: { id: string; name: string; reason: string }[]
  warnings: string[]
}

// Helper: Convert time string to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

// Helper: Convert minutes to time string
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// Helper: Check if a teacher is infant-qualified
function isInfantQualified(teacher: Teacher): boolean {
  if (!teacher.qualifications) return false
  const quals = teacher.qualifications.toLowerCase()
  return quals.includes('infant') || teacher.role === 'lead_teacher'
}

// Helper: Check if time is during nap period for a classroom
// Uses CLASSROOM-LEVEL nap schedules (e.g., "all 2-year-olds nap 12:00-14:30")
function isDuringNapForClassroom(
  timeMinutes: number,
  classroom: Classroom
): boolean {
  // Check classroom-level nap schedule
  if (classroom.nap_start && classroom.nap_end) {
    const napStart = timeToMinutes(classroom.nap_start)
    const napEnd = timeToMinutes(classroom.nap_end)
    return timeMinutes >= napStart && timeMinutes < napEnd
  }
  return false
}

// POST /api/calendar/optimize-minimal - Calculate minimal staff scenario
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { school_id, date } = body

    if (!school_id || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, date' },
        { status: 400 }
      )
    }

    // Fetch school
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', school_id)
      .single()

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const school = schoolData as { id: string; name: string }

    // Fetch data in parallel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [teachersRes, classroomsRes, studentsRes, attendanceRes, settingsRes, ptoRes, dailySummaryRes] = await Promise.all([
      supabase.from('teachers').select('*').eq('school_id', school_id).eq('status', 'active'),
      supabase.from('classrooms').select('*').eq('school_id', school_id),
      supabase.from('students').select('*').eq('school_id', school_id).eq('status', 'enrolled'),
      supabase.from('attendance').select('*').eq('school_id', school_id).eq('date', date).eq('status', 'present'),
      (supabase as any).from('school_settings').select('*').or(`school_id.is.null,school_id.eq.${school_id}`),
      // Fetch approved PTO requests that cover the selected date
      supabase.from('pto_requests').select('teacher_id').eq('school_id', school_id).eq('status', 'approved').lte('start_date', date).gte('end_date', date),
      // Fetch director's daily summary for teacher absences AND student counts
      (supabase as any).from('director_daily_summaries').select('teacher_absences, student_counts').eq('school_id', school_id).eq('date', date).maybeSingle()
    ])

    const allTeachers = (teachersRes.data || []) as Teacher[]
    const ptoRecords = (ptoRes.data || []) as { teacher_id: string }[]
    const dailySummary = dailySummaryRes.data as {
      teacher_absences: string[]
      student_counts?: { age_group: string; count: number }[]
    } | null

    // Get set of teacher IDs who are out on PTO for this date
    const teachersOnPTO = new Set(ptoRecords.map(p => p.teacher_id))

    // Get teacher names who are absent from director's daily summary
    const absentTeacherNames = new Set(
      (dailySummary?.teacher_absences || []).map(name => name.toLowerCase().trim())
    )

    // Filter out teachers who are on PTO OR marked absent in daily summary
    const teachers = allTeachers.filter(t => {
      // Check PTO by ID
      if (teachersOnPTO.has(t.id)) return false
      // Check daily summary by name (first name match)
      const firstName = t.first_name.toLowerCase().trim()
      const fullName = `${t.first_name} ${t.last_name}`.toLowerCase().trim()
      if (absentTeacherNames.has(firstName) || absentTeacherNames.has(fullName)) return false
      return true
    })
    const classrooms = (classroomsRes.data || []) as Classroom[]
    const students = (studentsRes.data || []) as Student[]
    const attendance = (attendanceRes.data || []) as { student_id: string }[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = (settingsRes.data || []) as { setting_key: string; setting_value: any }[]

    // Get ratio settings
    const normalRatiosSetting = settings.find((s: { setting_key: string }) => s.setting_key === 'ratio_normal')
    const napRatiosSetting = settings.find((s: { setting_key: string }) => s.setting_key === 'ratio_naptime')
    const playgroundTimesSetting = settings.find((s: { setting_key: string }) => s.setting_key === 'playground_times')

    const normalRatios: RatioSettings = normalRatiosSetting?.setting_value || {
      infant: 4, toddler: 4, twos: 12, threes: 12, preschool: 12, pre_k: 12
    }
    const napRatios: RatioSettings = napRatiosSetting?.setting_value || {
      infant: 12, toddler: 12, twos: 24, threes: 24, preschool: 24, pre_k: 24
    }

    // Playground/outdoor times - when classrooms with same ratio can be combined
    interface PlaygroundPeriod {
      start: string
      end: string
      age_groups: string[]
    }
    interface PlaygroundTimes {
      morning?: PlaygroundPeriod
      afternoon?: PlaygroundPeriod
    }
    const playgroundTimes: PlaygroundTimes = playgroundTimesSetting?.setting_value || {
      morning: { start: '09:30', end: '11:00', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] },
      afternoon: { start: '15:30', end: '16:30', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] }
    }

    // Helper: Check if a time is during playground time for a specific age group
    const isDuringPlayground = (timeMinutes: number, ageGroup: string): boolean => {
      for (const period of Object.values(playgroundTimes)) {
        if (!period) continue
        const start = timeToMinutes(period.start)
        const end = timeToMinutes(period.end)
        if (timeMinutes >= start && timeMinutes < end && period.age_groups.includes(ageGroup)) {
          return true
        }
      }
      return false
    }

    // Circle time - when preschoolers (2s, 3s, 4s) are combined for story time
    // This frees up teachers to take breaks. Typically 10-15 minutes before major activities.
    const circleTimesSetting = settings.find((s: { setting_key: string }) => s.setting_key === 'circle_times')
    interface CircleTimePeriod {
      start: string
      end: string
      age_groups: string[]
    }
    const defaultCircleTimes: CircleTimePeriod[] = [
      { start: '09:15', end: '09:30', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] },
      { start: '11:45', end: '12:00', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] },
      { start: '14:45', end: '15:00', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] },
    ]
    const circleTimes: CircleTimePeriod[] = circleTimesSetting?.setting_value || defaultCircleTimes

    // Helper: Check if a time is during circle time for a specific age group
    const isDuringCircleTime = (timeMinutes: number, ageGroup: string): boolean => {
      for (const period of circleTimes) {
        const start = timeToMinutes(period.start)
        const end = timeToMinutes(period.end)
        if (timeMinutes >= start && timeMinutes < end && period.age_groups.includes(ageGroup)) {
          return true
        }
      }
      return false
    }

    const warnings: string[] = []

    // Get present students count
    // Priority: 1) Director override (student_counts), 2) Attendance records, 3) All enrolled
    let presentStudents: Student[] = []
    const studentsByClassroom = new Map<string, Student[]>()
    let totalStudentsFromDirector = 0

    // Check if director override has student counts (source of truth when present)
    if (dailySummary?.student_counts && dailySummary.student_counts.length > 0) {
      console.log('[Optimize-Minimal] Using director override student counts:', dailySummary.student_counts)
      // Director override: map age_group -> classroom(s) and use the counts
      // If multiple classrooms exist for the same age group, divide students equally
      for (const { age_group, count } of dailySummary.student_counts) {
        // Find ALL classrooms matching this age group
        const matchingClassrooms = classrooms.filter(c => c.age_group === age_group)
        if (matchingClassrooms.length > 0 && count > 0) {
          // Divide students equally among classrooms with this age group
          const studentsPerClassroom = Math.floor(count / matchingClassrooms.length)
          let remainder = count % matchingClassrooms.length

          for (const classroom of matchingClassrooms) {
            // Distribute remainder to first classrooms
            const thisClassroomCount = studentsPerClassroom + (remainder > 0 ? 1 : 0)
            if (remainder > 0) remainder--

            // Create placeholder student objects for the count
            const placeholderStudents: Student[] = []
            for (let i = 0; i < thisClassroomCount; i++) {
              placeholderStudents.push({
                id: `director-override-${age_group}-${classroom.id}-${i}`,
                classroom_id: classroom.id,
                nap_start: null,
                nap_end: null
              })
            }
            studentsByClassroom.set(classroom.id, placeholderStudents)
            presentStudents.push(...placeholderStudents)
          }
          totalStudentsFromDirector += count
        }
      }
      console.log('[Optimize-Minimal] Total students from director override:', totalStudentsFromDirector)
    } else if (attendance.length > 0) {
      // Use attendance records
      const presentStudentIds = new Set(attendance.map(a => a.student_id))
      presentStudents = students.filter(s => presentStudentIds.has(s.id))
      // Count students per classroom
      for (const student of presentStudents) {
        if (student.classroom_id) {
          const existing = studentsByClassroom.get(student.classroom_id) || []
          existing.push(student)
          studentsByClassroom.set(student.classroom_id, existing)
        }
      }
    } else {
      // No attendance data - use all enrolled students for planning
      presentStudents = students
      if (students.length > 0) {
        warnings.push('No attendance data for this date - using all enrolled students for calculation')
      }
      // Count students per classroom
      for (const student of presentStudents) {
        if (student.classroom_id) {
          const existing = studentsByClassroom.get(student.classroom_id) || []
          existing.push(student)
          studentsByClassroom.set(student.classroom_id, existing)
        }
      }
    }

    // Check if we have any students
    if (presentStudents.length === 0) {
      warnings.push('No enrolled students found for this school')
    }

    // Get working teachers (exclude directors)
    const workingTeachers = teachers.filter(t =>
      t.role !== 'director' &&
      t.role !== 'assistant_director' &&
      t.regular_shift_start &&
      t.regular_shift_end
    )

    // All potential substitutes including directors (they can help cover breaks/lunch)
    const allPotentialSubs = teachers.filter(t =>
      t.regular_shift_start &&
      t.regular_shift_end
    )

    // Track substitute assignments to prevent double-booking
    // Maps substitute ID -> array of { start, end } time ranges they're covering
    const substituteAssignments = new Map<string, { start: number; end: number }[]>()

    // Helper: Check if a teacher is working at a given time
    const isTeacherWorking = (teacher: Teacher, timeMinutes: number): boolean => {
      if (!teacher.regular_shift_start || !teacher.regular_shift_end) return false
      const start = timeToMinutes(teacher.regular_shift_start)
      const end = timeToMinutes(teacher.regular_shift_end)
      return timeMinutes >= start && timeMinutes < end
    }

    // Helper: Check if a substitute is already assigned during a time range
    const isSubstituteAssigned = (subId: string, startTime: number, endTime: number): boolean => {
      const assignments = substituteAssignments.get(subId)
      if (!assignments) return false
      for (const assignment of assignments) {
        if (startTime < assignment.end && assignment.start < endTime) {
          return true
        }
      }
      return false
    }

    // Helper: Record a substitute assignment
    const recordSubstituteAssignment = (subId: string, startTime: number, endTime: number) => {
      const existing = substituteAssignments.get(subId) || []
      existing.push({ start: startTime, end: endTime })
      substituteAssignments.set(subId, existing)
    }

    // Track break assignments for all essential teachers (to check for conflicts)
    const breakAssignments = new Map<string, { break1: number; break2: number; lunchStart?: number; lunchEnd?: number }>()

    // Helper: Check if teacher is on break at a given time
    const isTeacherOnBreak = (teacherId: string, timeMinutes: number): boolean => {
      const assignment = breakAssignments.get(teacherId)
      if (!assignment) return false
      if (timeMinutes >= assignment.break1 && timeMinutes < assignment.break1 + 10) return true
      if (timeMinutes >= assignment.break2 && timeMinutes < assignment.break2 + 10) return true
      if (assignment.lunchStart !== undefined && assignment.lunchEnd !== undefined) {
        if (timeMinutes >= assignment.lunchStart && timeMinutes < assignment.lunchEnd) return true
      }
      return false
    }

    // Helper: Count teachers currently available in a classroom at a given time
    const getClassroomTeacherCount = (classroomName: string, timeMinutes: number): number => {
      let count = 0
      for (const teacher of workingTeachers) {
        if (!essentialTeacherIds.has(teacher.id)) continue // Only count essential teachers in minimal scenario
        if (teacher.classroom_title !== classroomName) continue
        if (!isTeacherWorking(teacher, timeMinutes)) continue
        if (isTeacherOnBreak(teacher.id, timeMinutes)) continue
        if (isSubstituteAssigned(teacher.id, timeMinutes, timeMinutes + 1)) continue
        count++
      }
      return count
    }

    // Helper: Get required teachers for a classroom by name at a given time
    const getRequiredTeachersForClassroom = (classroomName: string, timeMinutes: number): number => {
      const classroom = classrooms.find(c => c.name === classroomName)
      if (!classroom) return 0
      const classroomStudents = studentsByClassroom.get(classroom.id) || []
      const studentCount = classroomStudents.length
      if (studentCount === 0) return 0
      const isNapTime = isDuringNapForClassroom(timeMinutes, classroom)
      const ageGroup = classroom.age_group as keyof RatioSettings
      const ratio = isNapTime ? (napRatios[ageGroup] || 12) : (normalRatios[ageGroup] || 12)
      return Math.ceil(studentCount / ratio)
    }

    // Helper: Get ratio for an age group
    const getRatioForAgeGroup = (ageGroup: string, isNapTime: boolean): number => {
      const ratios = isNapTime ? napRatios : normalRatios
      return ratios[ageGroup] || 12
    }

    // Helper: Get list of teachers who are "freed" during playground time
    const getFreedTeachersDuringPlayground = (timeMinutes: number): Set<string> => {
      const freedTeachers = new Set<string>()

      // Group classrooms by their ratio requirement
      const classroomsByRatio = new Map<number, { classroom: Classroom; studentCount: number; teachers: Teacher[] }[]>()

      for (const classroom of classrooms) {
        const ageGroup = classroom.age_group
        if (!isDuringPlayground(timeMinutes, ageGroup)) continue

        const studentCount = (studentsByClassroom.get(classroom.id) || []).length
        if (studentCount === 0) continue

        const isNapTime = isDuringNapForClassroom(timeMinutes, classroom)
        const ratio = getRatioForAgeGroup(ageGroup, isNapTime)

        // Find teachers assigned to this classroom (only essential ones in minimal scenario)
        const classroomTeachers = workingTeachers.filter(t =>
          essentialTeacherIds.has(t.id) && t.classroom_title === classroom.name
        )

        const existing = classroomsByRatio.get(ratio) || []
        existing.push({ classroom, studentCount, teachers: classroomTeachers })
        classroomsByRatio.set(ratio, existing)
      }

      // For each ratio group, determine which teachers are freed
      for (const [ratio, rooms] of classroomsByRatio) {
        if (rooms.length <= 1) continue

        const totalStudents = rooms.reduce((sum, r) => sum + r.studentCount, 0)
        const combinedTeachers = Math.ceil(totalStudents / ratio)
        const allTeachers = rooms.flatMap(r => r.teachers)

        if (allTeachers.length > combinedTeachers) {
          const freedCount = allTeachers.length - combinedTeachers
          for (let i = allTeachers.length - freedCount; i < allTeachers.length; i++) {
            freedTeachers.add(allTeachers[i].id)
          }
        }
      }

      return freedTeachers
    }

    // Helper: Get list of teachers who are "freed" during circle time
    const getFreedTeachersDuringCircleTime = (timeMinutes: number): Set<string> => {
      const freedTeachers = new Set<string>()

      const classroomsInCircleTime: { classroom: Classroom; studentCount: number; teachers: Teacher[] }[] = []

      for (const classroom of classrooms) {
        const ageGroup = classroom.age_group
        if (!isDuringCircleTime(timeMinutes, ageGroup)) continue

        const studentCount = (studentsByClassroom.get(classroom.id) || []).length
        if (studentCount === 0) continue

        const classroomTeachers = workingTeachers.filter(t =>
          essentialTeacherIds.has(t.id) && t.classroom_title === classroom.name
        )
        classroomsInCircleTime.push({ classroom, studentCount, teachers: classroomTeachers })
      }

      if (classroomsInCircleTime.length <= 1) return freedTeachers

      const totalStudents = classroomsInCircleTime.reduce((sum, r) => sum + r.studentCount, 0)
      const combinedTeachersNeeded = Math.ceil(totalStudents / 12)
      const allTeachers = classroomsInCircleTime.flatMap(r => r.teachers)

      if (allTeachers.length > combinedTeachersNeeded) {
        const freedCount = allTeachers.length - combinedTeachersNeeded
        for (let i = allTeachers.length - freedCount; i < allTeachers.length; i++) {
          freedTeachers.add(allTeachers[i].id)
        }
      }

      return freedTeachers
    }

    // Helper: Check if there's at least one infant-qualified teacher in a classroom at a given time
    const hasInfantQualifiedTeacher = (classroomName: string, timeMinutes: number, excludeTeacherId?: string): boolean => {
      for (const teacher of workingTeachers) {
        if (!essentialTeacherIds.has(teacher.id)) continue
        if (teacher.id === excludeTeacherId) continue
        if (teacher.classroom_title !== classroomName) continue
        if (!isTeacherWorking(teacher, timeMinutes)) continue
        if (isTeacherOnBreak(teacher.id, timeMinutes)) continue
        if (isSubstituteAssigned(teacher.id, timeMinutes, timeMinutes + 1)) continue
        if (isInfantQualified(teacher)) return true
      }
      return false
    }

    // Helper: Check if a teacher can substitute for someone in a different classroom
    // KEY RULE: Any teacher can help any classroom as long as RATIO is maintained
    // INFANT SPECIAL RULE: Non-infant-qualified can help infant room ONLY IF accompanied by infant-qualified
    const canTeacherSubstitute = (substitute: Teacher, teacherOnBreak: Teacher, breakTime: number, breakDuration: number = 10): boolean => {
      // Directors and assistant directors can always help anyone
      if (substitute.role === 'director' || substitute.role === 'assistant_director') return true

      // Teachers without a classroom assignment (floaters) can help anyone
      if (!substitute.classroom_title) {
        // But check infant qualification rule
        const targetClassroom = classrooms.find(c => c.name === teacherOnBreak.classroom_title)
        const isInfantRoom = targetClassroom?.age_group === 'infant' || targetClassroom?.age_group === 'toddler'
        if (isInfantRoom && !isInfantQualified(substitute)) {
          // Non-qualified can help infant room ONLY if there's already an infant-qualified teacher there
          if (!hasInfantQualifiedTeacher(teacherOnBreak.classroom_title || '', breakTime, teacherOnBreak.id)) {
            return false
          }
        }
        return true
      }

      // Teachers WITH a classroom can help someone in the SAME classroom
      if (substitute.classroom_title === teacherOnBreak.classroom_title) return true

      // ANY teacher can leave their classroom and help ANY other classroom
      // The ONLY rule is: ratio must be maintained in their own classroom

      // Check if substitute's classroom would still have good ratio without them
      const subClassroomName = substitute.classroom_title
      const currentTeachers = getClassroomTeacherCount(subClassroomName, breakTime)
      const requiredTeachers = getRequiredTeachersForClassroom(subClassroomName, breakTime)

      // If removing this teacher still leaves enough coverage, they can help elsewhere
      if (currentTeachers > requiredTeachers) {
        // INFANT SPECIAL RULE: Non-infant-qualified can help infant room
        // ONLY IF there's already an infant-qualified teacher present
        const targetClassroom = classrooms.find(c => c.name === teacherOnBreak.classroom_title)
        const isInfantRoom = targetClassroom?.age_group === 'infant' || targetClassroom?.age_group === 'toddler'
        if (isInfantRoom && !isInfantQualified(substitute)) {
          if (!hasInfantQualifiedTeacher(teacherOnBreak.classroom_title || '', breakTime, teacherOnBreak.id)) {
            return false // Can't be alone with infants without qualification
          }
        }
        return true
      }

      // PLAYGROUND/CIRCLE TIME OPTIMIZATION: During these times, teachers who are "freed"
      // due to combined ratios can substitute for others
      const freedPlaygroundTeachers = getFreedTeachersDuringPlayground(breakTime)
      const freedCircleTimeTeachers = getFreedTeachersDuringCircleTime(breakTime)

      if (freedPlaygroundTeachers.has(substitute.id) || freedCircleTimeTeachers.has(substitute.id)) {
        // Still check infant rule
        const targetClassroom = classrooms.find(c => c.name === teacherOnBreak.classroom_title)
        const isInfantRoom = targetClassroom?.age_group === 'infant' || targetClassroom?.age_group === 'toddler'
        if (isInfantRoom && !isInfantQualified(substitute)) {
          if (!hasInfantQualifiedTeacher(teacherOnBreak.classroom_title || '', breakTime, teacherOnBreak.id)) {
            return false
          }
        }
        return true
      }

      // Ratio not maintained - cannot leave classroom
      return false
    }

    // Helper: Check if teacher has any break/lunch that overlaps with a time range
    const doesTeacherBreakOverlap = (teacher: Teacher, startTime: number, endTime: number): boolean => {
      const assignment = breakAssignments.get(teacher.id)
      if (assignment) {
        // Check break1 (10 minutes)
        const break1End = assignment.break1 + 10
        if (startTime < break1End && assignment.break1 < endTime) return true
        // Check break2 (10 minutes)
        const break2End = assignment.break2 + 10
        if (startTime < break2End && assignment.break2 < endTime) return true
        // Check lunch period
        if (assignment.lunchStart !== undefined && assignment.lunchEnd !== undefined) {
          if (startTime < assignment.lunchEnd && assignment.lunchStart < endTime) return true
        }
      }
      // Also check from teacher's own lunch_break_start/end fields
      if (teacher.lunch_break_start && teacher.lunch_break_end) {
        const lunchStart = timeToMinutes(teacher.lunch_break_start)
        const lunchEnd = timeToMinutes(teacher.lunch_break_end)
        if (startTime < lunchEnd && lunchStart < endTime) return true
      }
      return false
    }

    // Helper: Find a substitute teacher for a given break time
    const findSubstitute = (
      teacherOnBreak: Teacher,
      breakTime: number,
      breakDuration: number,
      includingDirectors: boolean = false
    ): string | null => {
      // Get the classroom of the teacher on break
      const teacherClassroom = classrooms.find(c => c.name === teacherOnBreak.classroom_title)
      const isInfantRoom = teacherClassroom?.age_group === 'infant' || teacherClassroom?.age_group === 'toddler'

      // Use all potential subs (including directors) or just essential teachers
      const candidates = includingDirectors ? allPotentialSubs : allPotentialSubs.filter(t => essentialTeacherIds.has(t.id))

      const breakEndTime = breakTime + breakDuration

      // Find available teachers who can cover
      for (const sub of candidates) {
        if (sub.id === teacherOnBreak.id) continue // Can't substitute yourself
        if (!isTeacherWorking(sub, breakTime)) continue // Not working at this time

        // Check if sub has ANY break/lunch that overlaps with the coverage period
        if (doesTeacherBreakOverlap(sub, breakTime, breakEndTime)) continue

        // Check if already assigned to cover someone else during this time
        if (isSubstituteAssigned(sub.id, breakTime, breakEndTime)) continue

        // Check infant qualification if needed
        if (isInfantRoom && !isInfantQualified(sub)) continue

        // CRITICAL: Check if this teacher can substitute
        // Directors, floaters, same-classroom teachers, freed playground teachers,
        // OR teachers whose classroom still has good ratio can substitute
        if (!canTeacherSubstitute(sub, teacherOnBreak, breakTime, breakDuration)) continue

        // Found a valid substitute - record the assignment
        recordSubstituteAssignment(sub.id, breakTime, breakEndTime)

        return `${sub.first_name} helps`
      }

      // If no regular substitute found and we haven't already tried directors, try them as fallback
      if (!includingDirectors) {
        const directors = allPotentialSubs.filter(t =>
          t.role === 'director' || t.role === 'assistant_director'
        )
        for (const director of directors) {
          if (director.id === teacherOnBreak.id) continue
          if (!isTeacherWorking(director, breakTime)) continue
          if (doesTeacherBreakOverlap(director, breakTime, breakEndTime)) continue
          if (isSubstituteAssigned(director.id, breakTime, breakEndTime)) continue
          if (isInfantRoom && !isInfantQualified(director)) continue
          // Directors don't need classroom check - they can always help

          recordSubstituteAssignment(director.id, breakTime, breakEndTime)
          return `${director.first_name} helps`
        }
      }

      return null // No substitute found
    }

    // Active classrooms (with students)
    const activeClassrooms = classrooms.filter(c => {
      const count = studentsByClassroom.get(c.id)?.length || 0
      return count > 0
    })

    // Calculate staffing needs throughout the day (every 30 minutes)
    const timeSlots: { time: number; needs: Map<string, { required: number; isNap: boolean }> }[] = []

    for (let time = 7 * 60; time <= 18 * 60; time += 30) {
      const needs = new Map<string, { required: number; isNap: boolean }>()

      for (const classroom of activeClassrooms) {
        const studentCount = studentsByClassroom.get(classroom.id)?.length || 0
        if (studentCount === 0) continue

        const isNap = isDuringNapForClassroom(time, classroom)
        const ageGroup = classroom.age_group as keyof RatioSettings
        const ratio = isNap ? (napRatios[ageGroup] || 12) : (normalRatios[ageGroup] || 12)
        const required = Math.ceil(studentCount / ratio)

        needs.set(classroom.id, { required, isNap })
      }

      timeSlots.push({ time, needs })
    }

    // Identify infant/toddler classrooms that need qualified teachers
    const infantClassrooms = activeClassrooms.filter(c =>
      c.age_group === 'infant' || c.age_group === 'toddler'
    )

    // Calculate minimum teachers needed
    // 1. For infant rooms: need infant-qualified teachers
    // 2. For other rooms: any teacher can cover

    let minInfantQualifiedNeeded = 0
    let minOtherNeeded = 0

    for (const slot of timeSlots) {
      let infantNeed = 0
      let otherNeed = 0

      slot.needs.forEach((need, classroomId) => {
        const classroom = classrooms.find(c => c.id === classroomId)
        if (classroom?.age_group === 'infant' || classroom?.age_group === 'toddler') {
          infantNeed += need.required
        } else {
          otherNeed += need.required
        }
      })

      minInfantQualifiedNeeded = Math.max(minInfantQualifiedNeeded, infantNeed)
      minOtherNeeded = Math.max(minOtherNeeded, otherNeed)
    }

    const minimalTeachersNeeded = minInfantQualifiedNeeded + minOtherNeeded

    // Select essential teachers
    // Priority: 1) Infant-qualified for infant rooms, 2) Lead teachers, 3) Others by shift coverage

    const infantQualifiedTeachers = workingTeachers.filter(t => isInfantQualified(t))
    const otherTeachers = workingTeachers.filter(t => !isInfantQualified(t))

    // Check if we have enough infant-qualified teachers
    if (infantQualifiedTeachers.length < minInfantQualifiedNeeded) {
      warnings.push(`Need ${minInfantQualifiedNeeded} infant-qualified teachers but only have ${infantQualifiedTeachers.length}. Cannot reduce staff for infant rooms.`)
    }

    // Select teachers for minimal scenario
    const essentialTeacherIds = new Set<string>()
    const essentialTeachers: MinimalTeacherSchedule[] = []
    const surplusTeachers: { id: string; name: string; reason: string }[] = []

    // First, select infant-qualified teachers for infant rooms
    const selectedInfant = infantQualifiedTeachers.slice(0, minInfantQualifiedNeeded)
    for (const teacher of selectedInfant) {
      essentialTeacherIds.add(teacher.id)
    }

    // Then, select other teachers (infant-qualified can also cover non-infant rooms)
    const remainingInfantQualified = infantQualifiedTeachers.slice(minInfantQualifiedNeeded)
    const availableForOther = [...remainingInfantQualified, ...otherTeachers]
    const selectedOther = availableForOther.slice(0, minOtherNeeded)
    for (const teacher of selectedOther) {
      essentialTeacherIds.add(teacher.id)
    }

    // First pass: Calculate and record all break times for essential teachers
    for (const teacher of workingTeachers) {
      if (essentialTeacherIds.has(teacher.id)) {
        if (teacher.regular_shift_start && teacher.regular_shift_end) {
          const shiftStart = timeToMinutes(teacher.regular_shift_start)
          const shiftEnd = timeToMinutes(teacher.regular_shift_end)
          const lunchStart = teacher.lunch_break_start ? timeToMinutes(teacher.lunch_break_start) : undefined
          const lunchEnd = teacher.lunch_break_end ? timeToMinutes(teacher.lunch_break_end) : (lunchStart ? lunchStart + 60 : undefined)

          // Calculate break times (staggered)
          const break1Time = shiftStart + 120 // 2 hours after start
          const break2Time = lunchEnd ? lunchEnd + 120 : shiftEnd - 90 // 2 hours after lunch

          breakAssignments.set(teacher.id, {
            break1: break1Time,
            break2: break2Time,
            lunchStart,
            lunchEnd
          })
        }
      }
    }

    // Build schedules for essential teachers
    // They may need to float between classrooms
    for (const teacher of workingTeachers) {
      if (essentialTeacherIds.has(teacher.id)) {
        const isInfant = isInfantQualified(teacher)
        const blocks: MinimalScheduleBlock[] = []

        // Determine primary classroom assignment
        let primaryClassroom = teacher.classroom_title || ''

        // If infant-qualified and we need them in infant room
        if (isInfant && infantClassrooms.length > 0) {
          // Assign to an infant classroom
          const assignedInfant = infantClassrooms.find(c =>
            !essentialTeachers.some(t => t.blocks.some(b => b.classroom_name === c.name))
          ) || infantClassrooms[0]
          primaryClassroom = assignedInfant?.name || primaryClassroom
        }

        // Build work blocks based on shift times
        if (teacher.regular_shift_start && teacher.regular_shift_end) {
          const shiftStart = timeToMinutes(teacher.regular_shift_start)
          const shiftEnd = timeToMinutes(teacher.regular_shift_end)
          const lunchStart = teacher.lunch_break_start ? timeToMinutes(teacher.lunch_break_start) : null
          const lunchEnd = teacher.lunch_break_end ? timeToMinutes(teacher.lunch_break_end) : (lunchStart ? lunchStart + 60 : null)

          // Calculate break times (staggered)
          const break1Time = shiftStart + 120 // 2 hours after start
          const break2Time = lunchEnd ? lunchEnd + 120 : shiftEnd - 90 // 2 hours after lunch

          let currentTime = shiftStart
          const breakPoints: { time: number; type: 'break' | 'lunch'; duration: number }[] = []

          if (break1Time > shiftStart + 60) {
            breakPoints.push({ time: break1Time, type: 'break', duration: 10 })
          }
          if (lunchStart && lunchEnd) {
            breakPoints.push({ time: lunchStart, type: 'lunch', duration: lunchEnd - lunchStart })
          }
          if (break2Time < shiftEnd - 30 && break2Time > (lunchEnd || shiftStart + 180)) {
            breakPoints.push({ time: break2Time, type: 'break', duration: 10 })
          }

          breakPoints.sort((a, b) => a.time - b.time)

          for (const bp of breakPoints) {
            if (currentTime < bp.time) {
              blocks.push({
                start_time: minutesToTime(currentTime),
                end_time: minutesToTime(bp.time),
                classroom_name: primaryClassroom,
                type: 'work'
              })
            }
            // Find substitute for this break/lunch
            const includingDirectors = bp.type === 'lunch' // Directors can help cover lunch
            const subName = findSubstitute(teacher, bp.time, bp.duration, includingDirectors)

            blocks.push({
              start_time: minutesToTime(bp.time),
              end_time: minutesToTime(bp.time + bp.duration),
              classroom_name: bp.type === 'lunch' ? 'Lunch' : 'Break',
              type: bp.type,
              notes: bp.type === 'break' ? '10 minute break' : 'Lunch break',
              sub_name: subName || undefined
            })
            currentTime = bp.time + bp.duration
          }

          if (currentTime < shiftEnd) {
            blocks.push({
              start_time: minutesToTime(currentTime),
              end_time: minutesToTime(shiftEnd),
              classroom_name: primaryClassroom,
              type: 'work'
            })
          }
        }

        essentialTeachers.push({
          teacher_id: teacher.id,
          teacher_name: `${teacher.first_name} ${teacher.last_name}`,
          role: teacher.role,
          is_essential: true,
          reason: isInfant ? 'Infant-qualified - required for infant/toddler rooms' : 'Required to meet ratio requirements',
          blocks
        })
      } else {
        surplusTeachers.push({
          id: teacher.id,
          name: `${teacher.first_name} ${teacher.last_name}`,
          reason: isInfantQualified(teacher)
            ? 'Infant-qualified but sufficient coverage exists'
            : 'Ratios can be maintained without this position'
        })
      }
    }

    // Use actual essential_teachers count for consistency
    // (the calculated minimalTeachersNeeded may differ from actual selection due to qualification constraints)
    const actualMinimal = essentialTeachers.length
    const actualSavings = surplusTeachers.length

    const result: MinimalOptimizationResult = {
      success: true,
      date,
      school_id,
      school_name: school.name,
      current_teachers: workingTeachers.length,
      minimal_teachers_needed: actualMinimal,
      potential_savings: actualSavings,
      essential_teachers: essentialTeachers,
      surplus_teachers: surplusTeachers,
      warnings
    }

    // Save optimization result to database for future retrieval
    // First delete any existing record, then insert fresh
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('optimization_results')
      .delete()
      .eq('school_id', school_id)
      .eq('date', date)
      .eq('result_type', 'minimal')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: saveError } = await (supabase as any)
      .from('optimization_results')
      .insert({
        school_id,
        date,
        result_type: 'minimal',
        result_data: result
      })

    if (saveError) {
      console.error('[Optimize-Minimal] Error saving result:', saveError.message, saveError)
    } else {
      console.log('[Optimize-Minimal] Result saved successfully for', school_id, date)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in POST /api/calendar/optimize-minimal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
