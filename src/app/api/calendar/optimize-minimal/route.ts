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
function isDuringNapForClassroom(
  timeMinutes: number,
  students: Student[],
  classroomId: string
): boolean {
  const classroomStudents = students.filter(s => s.classroom_id === classroomId)
  if (classroomStudents.length === 0) return false

  let nappingCount = 0
  for (const student of classroomStudents) {
    if (student.nap_start && student.nap_end) {
      const napStart = timeToMinutes(student.nap_start)
      const napEnd = timeToMinutes(student.nap_end)
      if (timeMinutes >= napStart && timeMinutes < napEnd) {
        nappingCount++
      }
    }
  }

  return nappingCount / classroomStudents.length > 0.7
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
    const [teachersRes, classroomsRes, studentsRes, attendanceRes, settingsRes] = await Promise.all([
      supabase.from('teachers').select('*').eq('school_id', school_id).eq('status', 'active'),
      supabase.from('classrooms').select('*').eq('school_id', school_id),
      supabase.from('students').select('*').eq('school_id', school_id).eq('status', 'enrolled'),
      supabase.from('attendance').select('*').eq('school_id', school_id).eq('date', date).eq('status', 'present'),
      (supabase as any).from('school_settings').select('*').or(`school_id.is.null,school_id.eq.${school_id}`)
    ])

    const teachers = (teachersRes.data || []) as Teacher[]
    const classrooms = (classroomsRes.data || []) as Classroom[]
    const students = (studentsRes.data || []) as Student[]
    const attendance = (attendanceRes.data || []) as { student_id: string }[]
    const settings = (settingsRes.data || []) as { setting_key: string; setting_value: RatioSettings }[]

    // Get ratio settings
    const normalRatiosSetting = settings.find((s: { setting_key: string }) => s.setting_key === 'ratio_normal')
    const napRatiosSetting = settings.find((s: { setting_key: string }) => s.setting_key === 'ratio_naptime')

    const normalRatios: RatioSettings = normalRatiosSetting?.setting_value || {
      infant: 4, toddler: 4, twos: 12, threes: 12, preschool: 12, pre_k: 12
    }
    const napRatios: RatioSettings = napRatiosSetting?.setting_value || {
      infant: 12, toddler: 12, twos: 24, threes: 24, preschool: 24, pre_k: 24
    }

    const warnings: string[] = []

    // Get present students
    // If no attendance records for this date, assume all enrolled students are present
    let presentStudents: Student[]
    if (attendance.length === 0) {
      // No attendance data - use all enrolled students for planning
      presentStudents = students
      if (students.length > 0) {
        warnings.push('No attendance data for this date - using all enrolled students for calculation')
      }
    } else {
      const presentStudentIds = new Set(attendance.map(a => a.student_id))
      presentStudents = students.filter(s => presentStudentIds.has(s.id))
    }

    // Check if we have any students
    if (presentStudents.length === 0) {
      warnings.push('No enrolled students found for this school')
    }

    // Count students per classroom
    const studentsByClassroom = new Map<string, Student[]>()
    for (const student of presentStudents) {
      if (student.classroom_id) {
        const existing = studentsByClassroom.get(student.classroom_id) || []
        existing.push(student)
        studentsByClassroom.set(student.classroom_id, existing)
      }
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

        const isNap = isDuringNapForClassroom(time, presentStudents, classroom.id)
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
