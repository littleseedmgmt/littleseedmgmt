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
}

interface OptimizedBreak {
  teacher_id: string
  teacher_name: string
  break1_start: string
  break1_end: string
  break1_sub_name: string | null  // Who covers during break 1
  break2_start: string
  break2_end: string
  break2_sub_name: string | null  // Who covers during break 2
  lunch_start: string | null
  lunch_end: string | null
  lunch_sub_name: string | null   // Who covers during lunch
}

interface StaffingAlert {
  type: 'surplus' | 'shortage'
  message: string
  count: number
  time_range?: string
  classroom?: string
}

interface OptimizationResult {
  success: boolean
  date: string
  school_id: string
  school_name: string
  breaks: OptimizedBreak[]
  alerts: StaffingAlert[]
  coverage_summary: {
    total_teachers: number
    teachers_needed_peak: number
    teachers_needed_nap: number
    total_students_present: number  // Students marked present for the day
  }
  // Debug info - remove after testing
  _debug?: {
    director_override_found: boolean
    teacher_absences: string[]
    student_counts_from_director: { age_group: string; count: number }[] | null
    all_teachers_count: number
    filtered_teachers_count: number
    filtered_teachers: string[]
  }
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

// Helper: Check if time is during nap period for a classroom
// Uses CLASSROOM-LEVEL nap schedules (e.g., "all 2-year-olds nap 12:00-14:30")
// NOT individual student nap times
function isDuringNapForClassroom(timeMinutes: number, classroom: Classroom): boolean {
  // Check classroom-level nap schedule
  if (classroom.nap_start && classroom.nap_end) {
    const napStart = timeToMinutes(classroom.nap_start)
    const napEnd = timeToMinutes(classroom.nap_end)
    return timeMinutes >= napStart && timeMinutes < napEnd
  }
  return false
}

// Helper: Check if a teacher is infant-qualified
function isInfantQualified(teacher: Teacher): boolean {
  if (!teacher.qualifications) return false
  const quals = teacher.qualifications.toLowerCase()
  return quals.includes('infant') || teacher.role === 'director' || teacher.role === 'assistant_director'
}

// Helper: Get required teachers for a classroom at a given time
function getRequiredTeachers(
  classroom: Classroom,
  studentCount: number,
  isNapTime: boolean,
  normalRatios: RatioSettings,
  napRatios: RatioSettings
): number {
  const ageGroup = classroom.age_group as keyof RatioSettings
  const ratio = isNapTime ? (napRatios[ageGroup] || 12) : (normalRatios[ageGroup] || 12)
  return Math.ceil(studentCount / ratio)
}

// POST /api/calendar/optimize - Run break optimization
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

    // Fetch school first (single query has different return type)
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', school_id)
      .single()

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const school = schoolData as { id: string; name: string }

    // Fetch remaining data in parallel (all array queries)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [teachersRes, classroomsRes, studentsRes, attendanceRes, settingsRes, ptoRes, dailySummaryRes] = await Promise.all([
      supabase.from('teachers').select('*').eq('school_id', school_id).eq('status', 'active'),
      supabase.from('classrooms').select('*').eq('school_id', school_id),
      supabase.from('students').select('*').eq('school_id', school_id).eq('status', 'enrolled'),
      supabase.from('attendance').select('*').eq('school_id', school_id).eq('date', date).eq('status', 'present'),
      (supabase as any).from('school_settings').select('*').or(`school_id.is.null,school_id.eq.${school_id}`),
      // Fetch approved PTO requests that cover the selected date
      supabase.from('pto_requests').select('teacher_id').eq('school_id', school_id).eq('status', 'approved').lte('start_date', date).gte('end_date', date),
      // Fetch director's daily summary for teacher absences, student counts, AND schedule changes
      (supabase as any).from('director_daily_summaries').select('teacher_absences, student_counts, schedule_changes').eq('school_id', school_id).eq('date', date).maybeSingle()
    ])

    let allTeachers = (teachersRes.data || []) as Teacher[]
    const classrooms = (classroomsRes.data || []) as Classroom[]
    const students = (studentsRes.data || []) as Student[]
    const attendance = (attendanceRes.data || []) as { student_id: string }[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = (settingsRes.data || []) as { setting_key: string; setting_value: any }[]
    const ptoRecords = (ptoRes.data || []) as { teacher_id: string }[]
    const dailySummary = dailySummaryRes.data as {
      teacher_absences: string[]
      student_counts?: { age_group: string; count: number }[]
      schedule_changes?: { name: string; note: string }[]
    } | null

    // DEBUG: Log director override data
    console.log('[Optimize] Date requested:', date)
    console.log('[Optimize] Director daily summary found:', dailySummary ? 'YES' : 'NO')
    if (dailySummary) {
      console.log('[Optimize] Teacher absences:', dailySummary.teacher_absences)
      console.log('[Optimize] Student counts:', dailySummary.student_counts)
      console.log('[Optimize] Schedule changes:', dailySummary.schedule_changes)
    }

    // Check for teachers from OTHER schools who are helping at THIS school today
    // If a name in schedule_changes isn't found in this school's teachers, look them up
    if (dailySummary?.schedule_changes) {
      const namesInScheduleChanges = dailySummary.schedule_changes.map(c => c.name.toLowerCase().trim())
      const localTeacherNames = new Set(allTeachers.map(t => t.first_name.toLowerCase().trim()))
      const localTeacherFullNames = new Set(allTeachers.map(t => `${t.first_name} ${t.last_name}`.toLowerCase().trim()))

      // Find names that aren't in this school's teacher list
      const externalNames = namesInScheduleChanges.filter(name =>
        !localTeacherNames.has(name) && !localTeacherFullNames.has(name)
      )

      if (externalNames.length > 0) {
        console.log('[Optimize] Looking for external teachers:', externalNames)
        // Fetch teachers from other schools by first name match
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: externalTeachers } = await (supabase as any)
          .from('teachers')
          .select('*')
          .neq('school_id', school_id)
          .eq('status', 'active')

        if (externalTeachers) {
          for (const extTeacher of externalTeachers as Teacher[]) {
            const firstName = extTeacher.first_name.toLowerCase().trim()
            const fullName = `${extTeacher.first_name} ${extTeacher.last_name}`.toLowerCase().trim()
            if (externalNames.includes(firstName) || externalNames.includes(fullName)) {
              console.log(`[Optimize] Adding external teacher: ${extTeacher.first_name} ${extTeacher.last_name}`)
              // Mark as floater at this school (no classroom assignment here)
              allTeachers.push({
                ...extTeacher,
                classroom_title: null, // They float at this school
              })
            }
          }
        }
      }
    }

    // Build a map of schedule overrides from director's schedule_changes
    // This handles cases like "Tam comes in at 1" or "Christina leaves at 2pm"
    const scheduleOverrides = new Map<string, { startOverride?: number; endOverride?: number }>()
    // Track teachers working at another school (e.g., "Aura at Mariner Square")
    const teachersAtOtherSchool = new Set<string>()

    if (dailySummary?.schedule_changes) {
      for (const change of dailySummary.schedule_changes) {
        const name = change.name.toLowerCase().trim()
        const note = change.note.toLowerCase()

        // Parse "at [other school]" - teacher is working elsewhere, exclude from this schedule
        // Matches: "at Mariner Square", "Mariner Square", "at MS", "MS", "working at Harbor Bay", etc.
        const schoolNames = ['mariner square', 'mariner', 'ms', 'little seeds', 'harbor bay', 'hb', 'ls']
        const atOtherSchoolMatch = note.match(/(?:^at\s+|working\s+at\s+|assigned\s+to\s+|helping\s+at\s+|^)([a-z\s]+)/i)
        if (atOtherSchoolMatch) {
          const location = atOtherSchoolMatch[1].trim().toLowerCase()
          // Check if the matched location is a known school name
          if (schoolNames.some(school => location.includes(school) || school.includes(location))) {
            teachersAtOtherSchool.add(name)
            console.log(`[Optimize] ${name} working at another location: ${location}`)
            continue // Skip other parsing for this teacher
          }
        }

        // Parse "comes in at X" or "arrives at X" patterns
        const comesInMatch = note.match(/(?:comes?\s*in|arrives?|starts?)\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
        if (comesInMatch) {
          let hour = parseInt(comesInMatch[1])
          const minutes = comesInMatch[2] ? parseInt(comesInMatch[2]) : 0
          const ampm = comesInMatch[3]?.toLowerCase()
          // Handle PM times
          if (ampm === 'pm' && hour < 12) hour += 12
          if (ampm === 'am' && hour === 12) hour = 0
          // If no am/pm specified and hour is 1-6, assume PM (afternoon arrival)
          if (!ampm && hour >= 1 && hour <= 6) hour += 12
          const override = scheduleOverrides.get(name) || {}
          override.startOverride = hour * 60 + minutes
          scheduleOverrides.set(name, override)
          console.log(`[Optimize] Schedule override for ${name}: starts at ${hour}:${minutes.toString().padStart(2, '0')}`)
        }

        // Parse "leaves at X" or "goes home at X" patterns
        const leavesMatch = note.match(/(?:leaves?|going\s*home|goes?\s*home|departs?|ends?)\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
        if (leavesMatch) {
          let hour = parseInt(leavesMatch[1])
          const minutes = leavesMatch[2] ? parseInt(leavesMatch[2]) : 0
          const ampm = leavesMatch[3]?.toLowerCase()
          if (ampm === 'pm' && hour < 12) hour += 12
          if (ampm === 'am' && hour === 12) hour = 0
          // If no am/pm specified and hour is 1-6, assume PM
          if (!ampm && hour >= 1 && hour <= 6) hour += 12
          const override = scheduleOverrides.get(name) || {}
          override.endOverride = hour * 60 + minutes
          scheduleOverrides.set(name, override)
          console.log(`[Optimize] Schedule override for ${name}: ends at ${hour}:${minutes.toString().padStart(2, '0')}`)
        }
      }
    }

    // Get set of teacher IDs who are out on PTO for this date
    const teachersOnPTO = new Set(ptoRecords.map(p => p.teacher_id))

    // Get teacher names who are absent from director's daily summary
    const absentTeacherNames = new Set(
      (dailySummary?.teacher_absences || []).map(name => name.toLowerCase().trim())
    )
    // Also add teachers working at other schools to absent list
    for (const name of teachersAtOtherSchool) {
      absentTeacherNames.add(name)
    }
    console.log('[Optimize] Absent teacher names (lowercase):', Array.from(absentTeacherNames))

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
    console.log('[Optimize] All teachers count:', allTeachers.length, 'After filtering:', teachers.length)
    console.log('[Optimize] Filtered teacher names:', teachers.map(t => t.first_name))


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

    // Circle time - when preschoolers (2s, 3s, 4s) are combined for story time
    // This frees up teachers to take breaks. Typically 10-15 minutes before major activities.
    // Director or lead teacher reads to all kids combined.
    const circleTimesSetting = settings.find((s: { setting_key: string }) => s.setting_key === 'circle_times')
    interface CircleTimePeriod {
      start: string
      end: string
      age_groups: string[]
    }
    const defaultCircleTimes: CircleTimePeriod[] = [
      { start: '09:15', end: '09:30', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] }, // Before playground
      { start: '11:45', end: '12:00', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] }, // Before lunch
      { start: '14:45', end: '15:00', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] }, // After nap, before afternoon activities
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

    // Helper: Get ratio for an age group
    const getRatioForAgeGroup = (ageGroup: string, isNapTime: boolean): number => {
      const ratios = isNapTime ? napRatios : normalRatios
      return ratios[ageGroup as keyof RatioSettings] || 12
    }

    // Helper: Calculate teachers needed during playground time (combined by ratio)
    // Returns a map of ratio -> teachers freed up during playground
    const getPlaygroundSavings = (timeMinutes: number): Map<string, number> => {
      const savings = new Map<string, number>()

      // Group classrooms by their ratio requirement
      const classroomsByRatio = new Map<number, { classroom: Classroom; studentCount: number }[]>()

      for (const classroom of classrooms) {
        const ageGroup = classroom.age_group
        if (!isDuringPlayground(timeMinutes, ageGroup)) continue

        const studentCount = (studentsByClassroom.get(classroom.id) || []).length
        if (studentCount === 0) continue

        const isNapTime = isDuringNapForClassroom(timeMinutes, classroom)
        const ratio = getRatioForAgeGroup(ageGroup, isNapTime)

        const existing = classroomsByRatio.get(ratio) || []
        existing.push({ classroom, studentCount })
        classroomsByRatio.set(ratio, existing)
      }

      // For each ratio group, calculate savings
      for (const [ratio, rooms] of classroomsByRatio) {
        if (rooms.length <= 1) continue // Need at least 2 classrooms to combine

        // Calculate teachers needed if separate
        const separateTeachers = rooms.reduce((sum, r) => sum + Math.ceil(r.studentCount / ratio), 0)

        // Calculate teachers needed if combined
        const totalStudents = rooms.reduce((sum, r) => sum + r.studentCount, 0)
        const combinedTeachers = Math.ceil(totalStudents / ratio)

        const freed = separateTeachers - combinedTeachers
        if (freed > 0) {
          savings.set(`ratio_${ratio}`, freed)
        }
      }

      return savings
    }

    // Helper: Get list of teachers who are "freed" during playground time
    // These are teachers from combined classrooms who aren't needed outdoors
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

        // Find teachers assigned to this classroom
        const classroomTeachers = workingTeachers.filter(t => t.classroom_title === classroom.name)

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

        // The "extra" teachers beyond what's needed combined are freed
        // We keep the first N teachers needed, the rest are freed
        if (allTeachers.length > combinedTeachers) {
          const freedCount = allTeachers.length - combinedTeachers
          // Free the last N teachers (arbitrary choice - could be smarter)
          for (let i = allTeachers.length - freedCount; i < allTeachers.length; i++) {
            freedTeachers.add(allTeachers[i].id)
          }
        }
      }

      return freedTeachers
    }

    // Helper: Get list of teachers who are "freed" during circle time
    // During circle time, preschoolers (2s, 3s, 4s) are combined with 1-2 teachers (usually director)
    // This frees other teachers to take breaks
    const getFreedTeachersDuringCircleTime = (timeMinutes: number): Set<string> => {
      const freedTeachers = new Set<string>()

      // Check if any classroom is during circle time
      const classroomsInCircleTime: { classroom: Classroom; studentCount: number; teachers: Teacher[] }[] = []

      for (const classroom of classrooms) {
        const ageGroup = classroom.age_group
        if (!isDuringCircleTime(timeMinutes, ageGroup)) continue

        const studentCount = (studentsByClassroom.get(classroom.id) || []).length
        if (studentCount === 0) continue

        // Find teachers assigned to this classroom
        const classroomTeachers = workingTeachers.filter(t => t.classroom_title === classroom.name)
        classroomsInCircleTime.push({ classroom, studentCount, teachers: classroomTeachers })
      }

      if (classroomsInCircleTime.length <= 1) return freedTeachers // Need multiple classrooms to combine

      // During circle time, all preschool kids are combined
      // Usually need 1-2 teachers (director + maybe 1 more) for combined group
      const totalStudents = classroomsInCircleTime.reduce((sum, r) => sum + r.studentCount, 0)
      const combinedTeachersNeeded = Math.ceil(totalStudents / 12) // Preschool ratio 1:12
      const allTeachers = classroomsInCircleTime.flatMap(r => r.teachers)

      // The "extra" teachers beyond what's needed combined are freed
      if (allTeachers.length > combinedTeachersNeeded) {
        const freedCount = allTeachers.length - combinedTeachersNeeded
        // Free the last N teachers
        for (let i = allTeachers.length - freedCount; i < allTeachers.length; i++) {
          freedTeachers.add(allTeachers[i].id)
        }
      }

      return freedTeachers
    }

    // Helper: Get list of teachers who are "freed" during nap time consolidation
    // When multiple preschool classrooms nap simultaneously, kids consolidate into fewer nap rooms
    // This frees up teachers who can then cover lunches for others
    const getFreedTeachersDuringNap = (timeMinutes: number): Set<string> => {
      const freedTeachers = new Set<string>()

      // Only preschool classrooms consolidate for nap — infants have separate nap handling
      const nappingClassrooms: { classroom: Classroom; studentCount: number; teachers: Teacher[] }[] = []

      for (const classroom of classrooms) {
        const ageGroup = classroom.age_group
        if (infantAgeGroups.has(ageGroup)) continue // Skip infant rooms
        if (!isDuringNapForClassroom(timeMinutes, classroom)) continue

        const studentCount = (studentsByClassroom.get(classroom.id) || []).length
        if (studentCount === 0) continue

        const classroomTeachers = workingTeachers.filter(t => classroomNamesMatch(t.classroom_title, classroom.name))
        nappingClassrooms.push({ classroom, studentCount, teachers: classroomTeachers })
      }

      if (nappingClassrooms.length <= 1) return freedTeachers

      // Calculate teachers needed if nap rooms are consolidated
      const totalNappingStudents = nappingClassrooms.reduce((sum, r) => sum + r.studentCount, 0)
      const napRatio = napRatios.twos || 24
      const napTeachersNeeded = Math.ceil(totalNappingStudents / napRatio)

      const allNapTeachers = nappingClassrooms.flatMap(r => r.teachers)

      // Teachers beyond what's needed for nap rooms are freed for coverage
      if (allNapTeachers.length > napTeachersNeeded) {
        const freedCount = allNapTeachers.length - napTeachersNeeded
        for (let i = allNapTeachers.length - freedCount; i < allNapTeachers.length; i++) {
          freedTeachers.add(allNapTeachers[i].id)
        }
      }

      return freedTeachers
    }

    // Get present students count
    // Priority: 1) Director override (student_counts), 2) Attendance records, 3) All enrolled
    let presentStudents: Student[] = []
    const studentsByClassroom = new Map<string, Student[]>()
    let totalStudentsFromDirector = 0

    // Check if director override has student counts (source of truth when present)
    if (dailySummary?.student_counts && dailySummary.student_counts.length > 0) {
      console.log('[Optimize] Using director override student counts:', dailySummary.student_counts)
      // Director override: map age_group -> classroom(s) and use the counts
      // If multiple classrooms exist for the same age group, divide students equally

      // Age group equivalents for flexible matching (different schools use different terms)
      const ageGroupEquivalents: Record<string, string[]> = {
        'twos': ['twos', 'toddler'],      // Some schools use "toddler" for 2yr
        'toddler': ['toddler', 'twos'],   // Some schools use "twos" for toddler age
        'infant': ['infant'],
        'threes': ['threes'],
        'pre_k': ['pre_k', 'preschool'],
        'preschool': ['preschool', 'pre_k'],
      }

      for (const { age_group, count } of dailySummary.student_counts) {
        // Find ALL classrooms matching this age group (with fallback equivalents)
        const equivalents = ageGroupEquivalents[age_group] || [age_group]
        const matchingClassrooms = classrooms.filter(c => equivalents.includes(c.age_group))
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
                nap_start: null, // Default nap times could be added if needed
                nap_end: null
              })
            }
            studentsByClassroom.set(classroom.id, placeholderStudents)
            presentStudents.push(...placeholderStudents)
          }
          totalStudentsFromDirector += count
        }
      }
      console.log('[Optimize] Total students from director override:', totalStudentsFromDirector)
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
      // Count students per classroom
      for (const student of presentStudents) {
        if (student.classroom_id) {
          const existing = studentsByClassroom.get(student.classroom_id) || []
          existing.push(student)
          studentsByClassroom.set(student.classroom_id, existing)
        }
      }
    }

    // Filter to working teachers (exclude directors for main staffing count)
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

    const alerts: StaffingAlert[] = []
    const optimizedBreaks: OptimizedBreak[] = []

    // Calculate peak staffing needs (10am - typical busy time)
    const peakTime = 10 * 60 // 10:00 AM in minutes
    let peakTeachersNeeded = 0

    // Calculate nap time staffing needs (1pm - typical nap time)
    const napTime = 13 * 60 // 1:00 PM in minutes
    let napTeachersNeeded = 0

    for (const classroom of classrooms) {
      const classroomStudents = studentsByClassroom.get(classroom.id) || []
      const studentCount = classroomStudents.length

      if (studentCount === 0) continue

      const isInfantRoom = classroom.age_group === 'infant' || classroom.age_group === 'toddler'
      const isNapAtPeak = isDuringNapForClassroom(peakTime, classroom)
      const isNapAt1pm = isDuringNapForClassroom(napTime, classroom)

      peakTeachersNeeded += getRequiredTeachers(classroom, studentCount, isNapAtPeak, normalRatios, napRatios)
      napTeachersNeeded += getRequiredTeachers(classroom, studentCount, isNapAt1pm, normalRatios, napRatios)
    }

    // Check for staffing surplus or shortage
    // Include directors in the available count since they can help with coverage
    const directors = teachers.filter(t => t.role === 'director' || t.role === 'assistant_director')
    const totalTeachers = workingTeachers.length + directors.length

    if (totalTeachers > peakTeachersNeeded + 2) {
      alerts.push({
        type: 'surplus',
        message: `You have ${totalTeachers - peakTeachersNeeded} extra teachers. Consider sending some home or to another school.`,
        count: totalTeachers - peakTeachersNeeded
      })
    }

    if (totalTeachers < peakTeachersNeeded) {
      alerts.push({
        type: 'shortage',
        message: `You need ${peakTeachersNeeded - totalTeachers} more teachers during peak hours. Consider calling in a floater.`,
        count: peakTeachersNeeded - totalTeachers,
        time_range: '9:00 AM - 12:00 PM'
      })
    }

    // Optimize break times
    // Strategy: Stagger breaks so that at any given time, we maintain required ratios
    // Only 1 teacher per "section" can take a break at a time.
    //
    // Section logic (based on real-world feedback):
    // - Mariner Square has separate infant (5-6 teachers) and preschool (7-8 teachers) sections
    //   that operate independently, so 1 infant + 1 preschool break can overlap
    // - Little Seeds & Harbor Bay run tight: max 1 break at a time across the whole school
    //
    // We determine sections automatically: if both infant AND preschool groups each have
    // >= 4 teachers, they are independent sections. Otherwise, the whole school is one section.

    // Determine teacher sections based on classroom age group
    const infantAgeGroups = new Set(['infant', 'toddler'])
    const getTeacherSection = (teacher: Teacher): string => {
      if (!teacher.classroom_title) return 'preschool' // floaters default to preschool section
      const classroom = classrooms.find(c => classroomNamesMatch(teacher.classroom_title, c.name))
      if (classroom && infantAgeGroups.has(classroom.age_group)) return 'infant'
      return 'preschool'
    }

    // Helper: flexible classroom name matching (same logic as calendar page)
    const classroomNamesMatch = (teacherClassroom: string | null, dbClassroomName: string): boolean => {
      if (!teacherClassroom) return false
      if (teacherClassroom === dbClassroomName) return true
      const teacherLower = teacherClassroom.toLowerCase().trim()
      const dbLower = dbClassroomName.toLowerCase().trim()
      if (dbLower.includes(teacherLower) || teacherLower.includes(dbLower)) return true
      if (dbLower.startsWith(teacherLower) || teacherLower.startsWith(dbLower)) return true
      const parenMatch = dbLower.match(/\(([^)]+)\)/)
      if (parenMatch) {
        const insideParens = parenMatch[1].trim()
        if (insideParens === teacherLower || insideParens.includes(teacherLower) || teacherLower.includes(insideParens)) return true
      }
      return false
    }

    // Helper: Get the coverage section of a substitute teacher
    // This determines WHICH teachers they can cover for (infant vs preschool)
    // Directors can cover anyone ('any'), floaters based on qualifications
    const getSubCoverageSection = (sub: Teacher): string => {
      if (sub.role === 'director' || sub.role === 'assistant_director') return 'any'
      if (!sub.classroom_title || sub.classroom_title === 'anywhere') {
        // Floater without classroom: section based on qualifications
        return isInfantQualified(sub) ? 'infant' : 'preschool'
      }
      return getTeacherSection(sub)
    }

    // Count teachers per section to decide if sections are independent
    const infantTeachers = workingTeachers.filter(t => getTeacherSection(t) === 'infant')
    const preschoolTeachers = workingTeachers.filter(t => getTeacherSection(t) === 'preschool')
    const hasIndependentSections = infantTeachers.length >= 4 && preschoolTeachers.length >= 4

    console.log('[Optimize] Sections:', hasIndependentSections ? 'INDEPENDENT' : 'SINGLE',
      `(infant: ${infantTeachers.length}, preschool: ${preschoolTeachers.length})`)

    // Get the effective section key for a teacher (used for slot tracking)
    // If sections aren't independent, everyone shares the same "all" section
    const getEffectiveSection = (teacher: Teacher): string => {
      if (!hasIndependentSections) return 'all'
      return getTeacherSection(teacher)
    }

    const breakSlots: { start: number; end: number; isNapTime: boolean }[] = []

    // Generate possible break slots (every 15 minutes)
    for (let time = 9 * 60; time < 17 * 60; time += 15) {
      // Check if any classroom is during nap time
      const isNap = classrooms.some(c => isDuringNapForClassroom(time, c))
      breakSlots.push({
        start: time,
        end: time + 10,
        isNapTime: isNap
      })
    }

    // Assign breaks to each teacher
    const breakAssignments = new Map<string, { break1: number; break2: number | null }>()

    // Track which slots are used per section to stagger breaks
    // Key: "section:slotStartTime", Value: teacher ids using that slot
    const usedSlotsBySection = new Map<string, string[]>()

    // Track substitute assignments to prevent double-booking
    // Maps substitute ID -> array of { start, end } time ranges they're covering
    const substituteAssignments = new Map<string, { start: number; end: number }[]>()

    // Helper: Check if a teacher is working at a given time
    // Respects schedule overrides from director's daily summary (e.g., "Tam comes in at 1")
    const isTeacherWorking = (teacher: Teacher, timeMinutes: number): boolean => {
      if (!teacher.regular_shift_start || !teacher.regular_shift_end) return false
      let start = timeToMinutes(teacher.regular_shift_start)
      let end = timeToMinutes(teacher.regular_shift_end)

      // Check for schedule overrides from director's daily summary
      const teacherNameLower = teacher.first_name.toLowerCase().trim()
      const override = scheduleOverrides.get(teacherNameLower)
      if (override) {
        if (override.startOverride !== undefined) start = override.startOverride
        if (override.endOverride !== undefined) end = override.endOverride
      }

      return timeMinutes >= start && timeMinutes < end
    }

    // Helper: Check if teacher is on break/lunch at given time
    const isTeacherOnBreak = (teacherId: string, timeMinutes: number): boolean => {
      const assignment = breakAssignments.get(teacherId)
      if (!assignment) return false
      // Check break1
      if (timeMinutes >= assignment.break1 && timeMinutes < assignment.break1 + 10) return true
      // Check break2 (only if they have one)
      if (assignment.break2 !== null && timeMinutes >= assignment.break2 && timeMinutes < assignment.break2 + 10) return true
      return false
    }

    // Helper: Check if teacher has any break/lunch that overlaps with a time range
    const doesTeacherBreakOverlap = (teacher: Teacher, startTime: number, endTime: number): boolean => {
      const assignment = breakAssignments.get(teacher.id)
      if (assignment) {
        // Check break1 (10 minutes)
        const break1End = assignment.break1 + 10
        if (startTime < break1End && assignment.break1 < endTime) return true
        // Check break2 (10 minutes) - only if they have one
        if (assignment.break2 !== null) {
          const break2End = assignment.break2 + 10
          if (startTime < break2End && assignment.break2 < endTime) return true
        }
      }
      // Check lunch period
      if (teacher.lunch_break_start && teacher.lunch_break_end) {
        const lunchStart = timeToMinutes(teacher.lunch_break_start)
        const lunchEnd = timeToMinutes(teacher.lunch_break_end)
        if (startTime < lunchEnd && lunchStart < endTime) return true
      }
      return false
    }

    // Helper: Check if a substitute is already assigned during a time range
    const isSubstituteAssigned = (subId: string, startTime: number, endTime: number): boolean => {
      const assignments = substituteAssignments.get(subId)
      if (!assignments) return false

      // Check if any existing assignment overlaps with the requested time range
      for (const assignment of assignments) {
        // Overlap exists if: start1 < end2 AND start2 < end1
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

    // Helper: Count teachers currently available in a classroom at a given time
    // (not on break, not on lunch, not already assigned as substitute elsewhere)
    const getClassroomTeacherCount = (classroomName: string, timeMinutes: number): number => {
      let count = 0
      for (const teacher of workingTeachers) {
        if (teacher.classroom_title !== classroomName) continue
        if (!isTeacherWorking(teacher, timeMinutes)) continue
        if (isTeacherOnBreak(teacher.id, timeMinutes)) continue

        // Check if on lunch
        if (teacher.lunch_break_start && teacher.lunch_break_end) {
          const lunchStart = timeToMinutes(teacher.lunch_break_start)
          const lunchEnd = timeToMinutes(teacher.lunch_break_end)
          if (timeMinutes >= lunchStart && timeMinutes < lunchEnd) continue
        }

        // Check if already assigned as substitute at this time
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
      return getRequiredTeachers(classroom, studentCount, isNapTime, normalRatios, napRatios)
    }

    // Helper: Check if there's at least one infant-qualified teacher in a classroom at a given time
    const hasInfantQualifiedTeacher = (classroomName: string, timeMinutes: number, excludeTeacherId?: string): boolean => {
      for (const teacher of workingTeachers) {
        if (teacher.id === excludeTeacherId) continue
        if (teacher.classroom_title !== classroomName) continue
        if (!isTeacherWorking(teacher, timeMinutes)) continue
        if (isTeacherOnBreak(teacher.id, timeMinutes)) continue
        if (teacher.lunch_break_start && teacher.lunch_break_end) {
          const lunchStart = timeToMinutes(teacher.lunch_break_start)
          const lunchEnd = timeToMinutes(teacher.lunch_break_end)
          if (timeMinutes >= lunchStart && timeMinutes < lunchEnd) continue
        }
        if (isSubstituteAssigned(teacher.id, timeMinutes, timeMinutes + 1)) continue
        if (isInfantQualified(teacher)) return true
      }
      // Also check if any director/floater is assigned to help
      for (const teacher of allPotentialSubs) {
        if (teacher.id === excludeTeacherId) continue
        if (teacher.role !== 'director' && teacher.role !== 'assistant_director') continue
        if (!isTeacherWorking(teacher, timeMinutes)) continue
        if (isInfantQualified(teacher)) return true
      }
      return false
    }

    // Helper: Check if a teacher can substitute for someone in a different classroom
    // KEY RULE: Any teacher can help any classroom as long as RATIO is maintained
    // INFANT SPECIAL RULE: Non-infant-qualified can help infant room ONLY IF accompanied by infant-qualified
    const canTeacherSubstitute = (substitute: Teacher, teacherOnBreak: Teacher, breakTime: number, breakDuration: number = 10): boolean => {
      // Directors and assistant directors can always help anyone (they typically have qualifications)
      if (substitute.role === 'director' || substitute.role === 'assistant_director') {
        return true
      }

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
          // Check if there's an infant-qualified teacher remaining in the infant room
          if (!hasInfantQualifiedTeacher(teacherOnBreak.classroom_title || '', breakTime, teacherOnBreak.id)) {
            return false // Can't be alone with infants without qualification
          }
        }
        return true
      }

      // PLAYGROUND/CIRCLE/NAP TIME OPTIMIZATION: During these times, teachers who are "freed"
      // due to combined ratios can substitute for others even if their own room needs them normally
      const freedPlaygroundTeachers = getFreedTeachersDuringPlayground(breakTime)
      const freedCircleTimeTeachers = getFreedTeachersDuringCircleTime(breakTime)
      const freedNapTeachers = getFreedTeachersDuringNap(breakTime)

      if (freedPlaygroundTeachers.has(substitute.id) || freedCircleTimeTeachers.has(substitute.id) || freedNapTeachers.has(substitute.id)) {
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

    // Helper: Find a substitute teacher for a given break time
    // Uses tiered priority:
    //   TIER 0: Same-classroom colleague (during nap when ratio allows)
    //   TIER 1: Floaters (their primary job)
    //   TIER 2: Same-section teachers with spare capacity
    //   TIER 3: Directors (last resort)
    // Respects qualification boundaries: infant teachers stay in infant room, preschool covers preschool
    // Directors and floaters are exempt from boundaries and can cover anyone
    // breakDuration: duration in minutes (10 for short breaks, 60 for lunch)
    const findSubstitute = (
      teacherOnBreak: Teacher,
      breakTime: number,
      breakDuration: number,
      classrooms: Classroom[],
      includingDirectors: boolean = false
    ): string | null => {
      // Get the classroom of the teacher on break
      const teacherClassroom = classrooms.find(c => classroomNamesMatch(teacherOnBreak.classroom_title, c.name))
      const isInfantRoom = teacherClassroom?.age_group === 'infant' || teacherClassroom?.age_group === 'toddler'
      const breakEndTime = breakTime + breakDuration

      // Determine which section the teacher on break belongs to
      const onBreakSection = getTeacherSection(teacherOnBreak)

      // Basic validation for any substitute candidate (doesn't check classroom capacity)
      const isBasicValidCandidate = (sub: Teacher): boolean => {
        if (sub.id === teacherOnBreak.id) return false
        if (!isTeacherWorking(sub, breakTime)) return false
        if (doesTeacherBreakOverlap(sub, breakTime, breakEndTime)) return false
        if (isSubstituteAssigned(sub.id, breakTime, breakEndTime)) return false
        if (isInfantRoom && !isInfantQualified(sub)) return false
        // INFANT ROOM SPECIAL RULE: Same-room colleagues cannot cover each other's breaks
        // because all infant teachers are needed to maintain ratio (1:4).
        // They need an external person (director/floater) to come in.
        if (isInfantRoom && teacherOnBreak.classroom_title && classroomNamesMatch(sub.classroom_title, teacherOnBreak.classroom_title)) {
          return false
        }
        return true
      }

      // Full validation including classroom capacity check
      const isValidCandidate = (sub: Teacher): boolean => {
        if (!isBasicValidCandidate(sub)) return false
        if (!canTeacherSubstitute(sub, teacherOnBreak, breakTime, breakDuration)) return false
        return true
      }

      // Qualification boundary check: don't cross infant/preschool boundary
      // Rule: infant teachers help infant teachers, non-infant teachers help among themselves
      // Directors are exempt (they can cover anyone)
      // Truly floating staff (no classroom or 'anywhere') can cover any section
      const passesQualificationBoundary = (sub: Teacher): boolean => {
        if (sub.role === 'director' || sub.role === 'assistant_director') return true
        // Truly floating staff (no classroom or generic 'anywhere') can cover any section
        if (!sub.classroom_title || sub.classroom_title.toLowerCase() === 'anywhere') return true
        const subSection = getSubCoverageSection(sub)
        if (onBreakSection === 'infant' && subSection !== 'infant') return false
        if (onBreakSection === 'preschool' && subSection !== 'preschool') return false
        return true
      }

      // Use all potential subs (including directors) or just working teachers
      const candidates = includingDirectors ? allPotentialSubs : workingTeachers

      // TIER 0: Same-classroom colleague
      // During nap time (1:24 ratio for 2+), one teacher can cover the other's lunch
      // They don't need to "leave" their room - they're already there
      if (teacherOnBreak.classroom_title && teacherClassroom) {
        const isNapTime = isDuringNapForClassroom(breakTime, teacherClassroom)
        if (isNapTime && !isInfantRoom) {
          // Find colleagues in the same classroom
          const sameRoomColleagues = candidates.filter(s =>
            s.id !== teacherOnBreak.id &&
            classroomNamesMatch(s.classroom_title, teacherOnBreak.classroom_title!)
          )
          for (const colleague of sameRoomColleagues) {
            if (!isBasicValidCandidate(colleague)) continue
            // During nap time, check if the remaining teachers (excluding the one on break) meet ratio
            // Note: getClassroomTeacherCount already excludes the teacher on break since their lunch overlaps
            const classroomStudents = studentsByClassroom.get(teacherClassroom.id) || []
            const napRatio = napRatios[teacherClassroom.age_group as keyof RatioSettings] || 24
            const requiredDuringNap = Math.ceil(classroomStudents.length / napRatio)
            const currentInRoom = getClassroomTeacherCount(teacherOnBreak.classroom_title!, breakTime)
            // If the remaining teachers (colleague included) meet the nap ratio, they can cover
            // No need to subtract 1 - the colleague stays in the room, they don't "leave" to cover
            if (currentInRoom >= requiredDuringNap) {
              recordSubstituteAssignment(colleague.id, breakTime, breakEndTime)
              return `${colleague.first_name} covers`
            }
          }
        }
      }

      // TIER 1: Floaters (first choice — this is their primary job)
      // Floaters assigned to a specific room must stay in their section (infant covers infant, preschool covers preschool)
      // Truly floating staff (no classroom or 'anywhere') can cover any section
      const floaters = candidates.filter(s =>
        s.role === 'floater' || (!s.classroom_title && s.role !== 'director' && s.role !== 'assistant_director')
      )
      for (const sub of floaters) {
        if (!passesQualificationBoundary(sub)) continue
        if (!isBasicValidCandidate(sub)) continue
        recordSubstituteAssignment(sub.id, breakTime, breakEndTime)
        return `${sub.first_name} helps`
      }

      // TIER 2: Regular teachers from the same section with spare classroom capacity
      // SKIP for infant/toddler rooms - they should only be covered by directors (TIER 3)
      // This prevents Pat (infant) from covering Shelly/Sherry (toddler) etc.
      if (!isInfantRoom) {
        const regularTeachers = candidates.filter(s =>
          s.role !== 'floater' && s.role !== 'director' && s.role !== 'assistant_director' && s.classroom_title
        )
        for (const sub of regularTeachers) {
          if (!passesQualificationBoundary(sub)) continue
          if (!isValidCandidate(sub)) continue
          recordSubstituteAssignment(sub.id, breakTime, breakEndTime)
          return `${sub.first_name} helps`
        }
      }

      // TIER 3: Directors (last resort — they have operational responsibilities)
      const directors = allPotentialSubs.filter(t =>
        t.role === 'director' || t.role === 'assistant_director'
      )
      for (const director of directors) {
        if (!isBasicValidCandidate(director)) continue
        recordSubstituteAssignment(director.id, breakTime, breakEndTime)
        return `${director.first_name} helps`
      }

      return null // No substitute found
    }

    for (const teacher of workingTeachers) {
      if (!teacher.regular_shift_start || !teacher.regular_shift_end) {
        continue
      }

      // Get base shift times and apply schedule overrides (e.g., "Tam comes in at 1")
      let shiftStart = timeToMinutes(teacher.regular_shift_start)
      let shiftEnd = timeToMinutes(teacher.regular_shift_end)
      const teacherNameLower = teacher.first_name.toLowerCase().trim()
      const override = scheduleOverrides.get(teacherNameLower)
      if (override) {
        if (override.startOverride !== undefined) shiftStart = override.startOverride
        if (override.endOverride !== undefined) shiftEnd = override.endOverride
      }

      // Get lunch times if available, but skip if lunch is outside the effective shift
      let lunchStart = teacher.lunch_break_start ? timeToMinutes(teacher.lunch_break_start) : null
      let lunchEnd = teacher.lunch_break_end
        ? timeToMinutes(teacher.lunch_break_end)
        : (lunchStart ? lunchStart + 60 : null)

      // If lunch ends before shift starts (due to late arrival override), skip lunch
      if (lunchEnd && lunchEnd <= shiftStart) {
        lunchStart = null
        lunchEnd = null
      }
      // If lunch starts after shift ends (due to early departure override), skip lunch
      if (lunchStart && lunchStart >= shiftEnd) {
        lunchStart = null
        lunchEnd = null
      }

      // Calculate total work hours to determine number of breaks
      // Rule: 1 ten-minute break per 4 hours worked
      const lunchDuration = (lunchStart && lunchEnd) ? (lunchEnd - lunchStart) : 0
      const totalWorkMinutes = (shiftEnd - shiftStart) - lunchDuration
      const totalWorkHours = totalWorkMinutes / 60
      const numberOfBreaks = Math.floor(totalWorkHours / 4) // 1 break per 4 hours

      // Calculate IDEAL break times at the midpoint of each work period
      // This spaces breaks evenly through the day, not clustered near lunch
      let idealBreak1: number
      let idealBreak2: number | null = null // Only set if they qualify for 2 breaks

      if (numberOfBreaks === 0) {
        // Less than 4 hours - no breaks needed, but assign a placeholder
        idealBreak1 = shiftStart + Math.floor((shiftEnd - shiftStart) / 2)
      } else if (numberOfBreaks === 1) {
        // 4-7.99 hours - one break at midpoint
        if (lunchStart && lunchEnd) {
          // With lunch: break in the longer work period (morning or afternoon)
          const morningDuration = lunchStart - shiftStart
          const afternoonDuration = shiftEnd - lunchEnd
          if (morningDuration >= afternoonDuration) {
            idealBreak1 = shiftStart + Math.floor(morningDuration / 2)
          } else {
            idealBreak1 = lunchEnd + Math.floor(afternoonDuration / 2)
          }
        } else {
          // No lunch: break at midpoint
          idealBreak1 = shiftStart + Math.floor((shiftEnd - shiftStart) / 2)
        }
      } else {
        // 8+ hours - two breaks
        if (lunchStart && lunchEnd) {
          // With lunch: break1 = middle of morning, break2 = middle of afternoon
          const morningWorkDuration = lunchStart - shiftStart
          idealBreak1 = shiftStart + Math.floor(morningWorkDuration / 2)

          const afternoonWorkDuration = shiftEnd - lunchEnd
          idealBreak2 = lunchEnd + Math.floor(afternoonWorkDuration / 2)
        } else {
          // No lunch: split shift into thirds
          const totalWork = shiftEnd - shiftStart
          idealBreak1 = shiftStart + Math.floor(totalWork / 3)
          idealBreak2 = shiftStart + Math.floor((totalWork * 2) / 3)
        }
      }

      // Determine this teacher's section for break staggering
      const teacherSection = getEffectiveSection(teacher)

      // Find the best slot closest to ideal break1 time
      // Only 1 teacher per section can use the same time slot
      let break1Time = idealBreak1
      let bestBreak1Distance = Infinity
      for (const slot of breakSlots) {
        // Must be within shift and before lunch (with buffer)
        const beforeLunch = lunchStart ? slot.end <= lunchStart - 20 : true
        if (slot.start >= shiftStart + 30 && slot.end <= shiftEnd && beforeLunch) {
          const sectionKey = `${teacherSection}:${slot.start}`
          const slotUsage = usedSlotsBySection.get(sectionKey)?.length || 0
          if (slotUsage < 1) { // Max 1 teacher per section per time slot
            const distance = Math.abs(slot.start - idealBreak1)
            if (distance < bestBreak1Distance) {
              bestBreak1Distance = distance
              break1Time = slot.start
            }
          }
        }
      }

      // Find the best slot closest to ideal break2 time (only if they qualify for 2 breaks)
      let break2Time: number | null = null
      if (idealBreak2 !== null) {
        break2Time = idealBreak2
        let bestBreak2Distance = Infinity
        for (const slot of breakSlots) {
          // Must be after lunch (with buffer) and before shift end
          const afterLunch = lunchEnd ? slot.start >= lunchEnd + 30 : true
          if (afterLunch && slot.end <= shiftEnd - 20) {
            const sectionKey = `${teacherSection}:${slot.start}`
            const slotUsage = usedSlotsBySection.get(sectionKey)?.length || 0
            if (slotUsage < 1) { // Max 1 teacher per section per time slot
              const distance = Math.abs(slot.start - idealBreak2)
              if (distance < bestBreak2Distance) {
                bestBreak2Distance = distance
                break2Time = slot.start
              }
            }
          }
        }

        // Ensure minimum gap between breaks
        if (break2Time !== null && break2Time <= break1Time + 60) {
          break2Time = Math.min(break1Time + 120, shiftEnd - 40)
        }
      }

      // Track slot usage per section
      const break1Key = `${teacherSection}:${break1Time}`
      const break1Users = usedSlotsBySection.get(break1Key) || []
      break1Users.push(teacher.id)
      usedSlotsBySection.set(break1Key, break1Users)

      // Only track break2 slot if they have one
      if (break2Time !== null) {
        const break2Key = `${teacherSection}:${break2Time}`
        const break2Users = usedSlotsBySection.get(break2Key) || []
        break2Users.push(teacher.id)
        usedSlotsBySection.set(break2Key, break2Users)
      }

      breakAssignments.set(teacher.id, { break1: break1Time, break2: break2Time })
    }

    // Now generate optimized breaks with substitute info
    for (const teacher of workingTeachers) {
      const assignment = breakAssignments.get(teacher.id)
      if (!assignment) continue

      // Apply schedule overrides to determine effective shift times
      const teacherNameLower = teacher.first_name.toLowerCase().trim()
      const override = scheduleOverrides.get(teacherNameLower)
      let effectiveShiftStart = teacher.regular_shift_start ? timeToMinutes(teacher.regular_shift_start) : 0
      let effectiveShiftEnd = teacher.regular_shift_end ? timeToMinutes(teacher.regular_shift_end) : 24 * 60
      if (override) {
        if (override.startOverride !== undefined) effectiveShiftStart = override.startOverride
        if (override.endOverride !== undefined) effectiveShiftEnd = override.endOverride
      }

      // Check if this teacher needs break substitutes
      // Rules:
      // 1. Floaters (no classroom) don't need coverage - they're flexible
      // 2. Preschool teachers (2s, 3s, 4s, pre-k) don't need coverage - kids combine outside
      // 3. Infant/toddler teachers need coverage from directors only (not other teachers)
      const teacherClassroom = classrooms.find(c => classroomNamesMatch(teacher.classroom_title, c.name))
      const isFloater = !teacher.classroom_title
      const isPreschoolRoom = teacherClassroom && !infantAgeGroups.has(teacherClassroom.age_group)
      const isInfantOrToddlerRoom = teacherClassroom && infantAgeGroups.has(teacherClassroom.age_group)

      let break1Sub: string | null
      if (isFloater) {
        break1Sub = 'Flexible coverage' // Floaters don't need substitutes
      } else if (isPreschoolRoom) {
        break1Sub = 'Kids outside, sufficient coverage' // Preschool rooms combine during breaks
      } else if (isInfantOrToddlerRoom) {
        // Infant/toddler breaks need director coverage only
        break1Sub = findSubstitute(teacher, assignment.break1, 10, classrooms, true) // true = include directors
      } else {
        break1Sub = findSubstitute(teacher, assignment.break1, 10, classrooms, false)
      }

      // Only calculate break2 substitute if they have a second break (8+ hour shift)
      let break2Sub: string | null = null
      if (assignment.break2 !== null) {
        if (isFloater) {
          break2Sub = 'Flexible coverage' // Floaters don't need substitutes
        } else if (isPreschoolRoom) {
          break2Sub = 'Kids outside, sufficient coverage' // Preschool rooms combine during breaks
        } else if (isInfantOrToddlerRoom) {
          // Infant/toddler breaks need director coverage only
          break2Sub = findSubstitute(teacher, assignment.break2, 10, classrooms, true) // true = include directors
        } else {
          break2Sub = findSubstitute(teacher, assignment.break2, 10, classrooms, false)
        }
      }

      // Determine effective lunch times considering schedule overrides
      // If lunch is outside the effective shift (due to late arrival/early departure), skip it
      let effectiveLunchStart: string | null = teacher.lunch_break_start
      let effectiveLunchEnd: string | null = teacher.lunch_break_end
      if (effectiveLunchStart && effectiveLunchEnd) {
        const lunchStartMins = timeToMinutes(effectiveLunchStart)
        const lunchEndMins = timeToMinutes(effectiveLunchEnd)
        // Skip lunch if it ends before shift starts or starts after shift ends
        if (lunchEndMins <= effectiveShiftStart || lunchStartMins >= effectiveShiftEnd) {
          effectiveLunchStart = null
          effectiveLunchEnd = null
        }
      }

      // Calculate lunch substitute if teacher has lunch break within their effective shift
      // Include directors as potential substitutes for lunch coverage
      // Aides/assistants and floaters don't need coverage - they're helpers, not primary staff
      const isAide = teacher.role === 'assistant' || teacher.qualifications?.toLowerCase().includes('aide')
      let lunchSub: string | null = null
      if (effectiveLunchStart && effectiveLunchEnd) {
        if (isFloater || isAide) {
          lunchSub = 'No coverage needed' // Helpers/aides are not counted in ratios
        } else {
          const lunchStart = timeToMinutes(effectiveLunchStart)
          const lunchEnd = timeToMinutes(effectiveLunchEnd)
          const lunchDuration = lunchEnd - lunchStart
          lunchSub = findSubstitute(teacher, lunchStart, lunchDuration, classrooms, true)
        }
      }

      optimizedBreaks.push({
        teacher_id: teacher.id,
        teacher_name: `${teacher.first_name} ${teacher.last_name}`,
        break1_start: minutesToTime(assignment.break1),
        break1_end: minutesToTime(assignment.break1 + 10),
        break1_sub_name: break1Sub,
        break2_start: assignment.break2 !== null ? minutesToTime(assignment.break2) : '',
        break2_end: assignment.break2 !== null ? minutesToTime(assignment.break2 + 10) : '',
        break2_sub_name: break2Sub,
        lunch_start: effectiveLunchStart,
        lunch_end: effectiveLunchEnd,
        lunch_sub_name: lunchSub
      })
    }

    // Save optimized breaks to the shifts table
    // This persists the optimization so it's available in future sessions
    for (const optimizedBreak of optimizedBreaks) {
      // Find the teacher to get their shift times
      const teacher = workingTeachers.find(t => t.id === optimizedBreak.teacher_id)
      if (!teacher) continue

      // Apply schedule overrides to get effective shift times
      // This handles "Tam comes in at 1" type overrides
      const teacherNameLower = teacher.first_name.toLowerCase().trim()
      const override = scheduleOverrides.get(teacherNameLower)
      let effectiveStartTime = teacher.regular_shift_start
      let effectiveEndTime = teacher.regular_shift_end
      if (override) {
        if (override.startOverride !== undefined) {
          effectiveStartTime = minutesToTime(override.startOverride)
        }
        if (override.endOverride !== undefined) {
          effectiveEndTime = minutesToTime(override.endOverride)
        }
      }

      // Try to update existing shift record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingShift } = await (supabase as any)
        .from('shifts')
        .select('id')
        .eq('teacher_id', optimizedBreak.teacher_id)
        .eq('date', date)
        .eq('school_id', school_id)
        .single()

      if (existingShift) {
        // Update existing shift with optimized breaks AND effective times
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('shifts')
          .update({
            start_time: effectiveStartTime,
            end_time: effectiveEndTime,
            break1_start: optimizedBreak.break1_start,
            break1_end: optimizedBreak.break1_end,
            lunch_start: optimizedBreak.lunch_start,
            lunch_end: optimizedBreak.lunch_end,
            break2_start: optimizedBreak.break2_start,
            break2_end: optimizedBreak.break2_end,
          })
          .eq('id', existingShift.id)

        if (updateError) {
          console.error(`[Optimize] Error updating shift for teacher ${optimizedBreak.teacher_id}:`, updateError)
        }
      } else {
        // Create new shift record with optimized breaks AND effective times
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase as any)
          .from('shifts')
          .insert({
            school_id,
            teacher_id: optimizedBreak.teacher_id,
            date,
            start_time: effectiveStartTime,
            end_time: effectiveEndTime,
            break1_start: optimizedBreak.break1_start,
            break1_end: optimizedBreak.break1_end,
            lunch_start: optimizedBreak.lunch_start,
            lunch_end: optimizedBreak.lunch_end,
            break2_start: optimizedBreak.break2_start,
            break2_end: optimizedBreak.break2_end,
            status: 'scheduled',
            shift_type: 'regular',
          })

        if (insertError) {
          console.error(`[Optimize] Error creating shift for teacher ${optimizedBreak.teacher_id}:`, insertError)
        }
      }
    }

    const result: OptimizationResult = {
      success: true,
      date,
      school_id,
      school_name: school.name,
      breaks: optimizedBreaks,
      alerts,
      coverage_summary: {
        total_teachers: totalTeachers,
        teachers_needed_peak: peakTeachersNeeded,
        teachers_needed_nap: napTeachersNeeded,
        total_students_present: presentStudents.length
      },
      // Debug info - remove after testing
      _debug: {
        director_override_found: !!dailySummary,
        teacher_absences: dailySummary?.teacher_absences || [],
        student_counts_from_director: dailySummary?.student_counts || null,
        all_teachers_count: allTeachers.length,
        filtered_teachers_count: teachers.length,
        filtered_teachers: teachers.map(t => t.first_name)
      }
    }

    // Save optimization result to database for future retrieval
    // First delete any existing record, then insert fresh
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('optimization_results')
      .delete()
      .eq('school_id', school_id)
      .eq('date', date)
      .eq('result_type', 'regular')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: saveError } = await (supabase as any)
      .from('optimization_results')
      .insert({
        school_id,
        date,
        result_type: 'regular',
        result_data: result
      })

    if (saveError) {
      console.error('[Optimize] Error saving result:', saveError.message, saveError)
    } else {
      console.log('[Optimize] Result saved successfully for', school_id, date)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in POST /api/calendar/optimize:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
