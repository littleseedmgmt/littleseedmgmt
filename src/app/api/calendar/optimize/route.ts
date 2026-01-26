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
function isDuringNap(timeMinutes: number, students: Student[], classroomId: string): boolean {
  const classroomStudents = students.filter(s => s.classroom_id === classroomId)
  if (classroomStudents.length === 0) return false

  // Check if majority of students in this classroom are napping
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

  // If more than 70% are napping, consider it nap time for ratio purposes
  return nappingCount / classroomStudents.length > 0.7
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

    // Get present students (those with attendance marked)
    // If no attendance records for this date, assume all enrolled students are present
    let presentStudents: Student[]
    if (attendance.length === 0) {
      // No attendance data - use all enrolled students for planning
      presentStudents = students
    } else {
      const presentStudentIds = new Set(attendance.map(a => a.student_id))
      presentStudents = students.filter(s => presentStudentIds.has(s.id))
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

    // Filter to working teachers (exclude directors for main staffing count)
    const workingTeachers = teachers.filter(t =>
      t.role !== 'director' &&
      t.role !== 'assistant_director' &&
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
      const isNapAtPeak = isDuringNap(peakTime, presentStudents, classroom.id)
      const isNapAt1pm = isDuringNap(napTime, presentStudents, classroom.id)

      peakTeachersNeeded += getRequiredTeachers(classroom, studentCount, isNapAtPeak, normalRatios, napRatios)
      napTeachersNeeded += getRequiredTeachers(classroom, studentCount, isNapAt1pm, normalRatios, napRatios)
    }

    // Check for staffing surplus or shortage
    const totalTeachers = workingTeachers.length

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
    // Prefer scheduling breaks during nap time when possible

    const breakSlots: { start: number; end: number; isNapTime: boolean }[] = []

    // Generate possible break slots (every 15 minutes)
    for (let time = 9 * 60; time < 17 * 60; time += 15) {
      const isNap = isDuringNap(time, presentStudents, classrooms[0]?.id || '')
      breakSlots.push({
        start: time,
        end: time + 10,
        isNapTime: isNap
      })
    }

    // Assign breaks to each teacher
    const breakAssignments = new Map<string, { break1: number; break2: number }>()

    // Track which slots are used to stagger breaks
    const usedSlots = new Map<number, string[]>() // slot start time -> teacher ids

    // Helper: Check if a teacher is working at a given time
    const isTeacherWorking = (teacher: Teacher, timeMinutes: number): boolean => {
      if (!teacher.regular_shift_start || !teacher.regular_shift_end) return false
      const start = timeToMinutes(teacher.regular_shift_start)
      const end = timeToMinutes(teacher.regular_shift_end)
      return timeMinutes >= start && timeMinutes < end
    }

    // Helper: Check if teacher is on break/lunch at given time
    const isTeacherOnBreak = (teacherId: string, timeMinutes: number): boolean => {
      const assignment = breakAssignments.get(teacherId)
      if (!assignment) return false
      // Check break1
      if (timeMinutes >= assignment.break1 && timeMinutes < assignment.break1 + 10) return true
      // Check break2
      if (timeMinutes >= assignment.break2 && timeMinutes < assignment.break2 + 10) return true
      return false
    }

    // Helper: Find a substitute teacher for a given break time
    const findSubstitute = (
      teacherOnBreak: Teacher,
      breakTime: number,
      classrooms: Classroom[]
    ): string | null => {
      // Get the classroom of the teacher on break
      const teacherClassroom = classrooms.find(c => c.name === teacherOnBreak.classroom_title)
      const isInfantRoom = teacherClassroom?.age_group === 'infant' || teacherClassroom?.age_group === 'toddler'

      // Find available teachers who can cover
      for (const sub of workingTeachers) {
        if (sub.id === teacherOnBreak.id) continue // Can't substitute yourself
        if (!isTeacherWorking(sub, breakTime)) continue // Not working at this time
        if (isTeacherOnBreak(sub.id, breakTime)) continue // Already on break

        // Check lunch time
        if (sub.lunch_break_start) {
          const lunchStart = timeToMinutes(sub.lunch_break_start)
          const lunchEnd = sub.lunch_break_end ? timeToMinutes(sub.lunch_break_end) : lunchStart + 60
          if (breakTime >= lunchStart && breakTime < lunchEnd) continue // On lunch
        }

        // Check infant qualification if needed
        if (isInfantRoom && !isInfantQualified(sub)) continue

        return `${sub.first_name} helps`
      }

      return null // No substitute found
    }

    for (const teacher of workingTeachers) {
      if (!teacher.regular_shift_start || !teacher.regular_shift_end) {
        continue
      }

      const shiftStart = timeToMinutes(teacher.regular_shift_start)
      const shiftEnd = timeToMinutes(teacher.regular_shift_end)

      // Get lunch times if available
      const lunchStart = teacher.lunch_break_start ? timeToMinutes(teacher.lunch_break_start) : null
      const lunchEnd = teacher.lunch_break_end
        ? timeToMinutes(teacher.lunch_break_end)
        : (lunchStart ? lunchStart + 60 : null)

      // Calculate midpoint for splitting breaks (before/after lunch or just middle of shift)
      const midpoint = lunchStart || Math.floor((shiftStart + shiftEnd) / 2)

      // Find best break1 slot (first half of shift, before lunch if exists)
      let break1Time = shiftStart + 120 // Default: 2 hours after shift start
      for (const slot of breakSlots) {
        const beforeLunch = lunchStart ? slot.end < lunchStart - 10 : slot.end < midpoint
        if (slot.start >= shiftStart + 60 && beforeLunch) {
          // Prefer nap time slots, and slots not heavily used
          const slotUsage = usedSlots.get(slot.start)?.length || 0
          if (slot.isNapTime && slotUsage < 2) {
            break1Time = slot.start
            break
          }
          if (slotUsage < 2) {
            break1Time = slot.start
          }
        }
      }

      // Find best break2 slot (second half of shift, after lunch if exists)
      const afterLunchStart = lunchEnd || midpoint
      let break2Time = afterLunchStart + 90 // Default: 1.5 hours after lunch/midpoint
      for (const slot of breakSlots) {
        if (slot.start >= afterLunchStart + 60 && slot.end <= shiftEnd - 30) {
          const slotUsage = usedSlots.get(slot.start)?.length || 0
          if (slot.isNapTime && slotUsage < 2) {
            break2Time = slot.start
            break
          }
          if (slotUsage < 2) {
            break2Time = slot.start
          }
        }
      }

      // Make sure break2 is after break1
      if (break2Time <= break1Time + 30) {
        break2Time = Math.min(break1Time + 120, shiftEnd - 40)
      }

      // Track slot usage
      const break1Users = usedSlots.get(break1Time) || []
      break1Users.push(teacher.id)
      usedSlots.set(break1Time, break1Users)

      const break2Users = usedSlots.get(break2Time) || []
      break2Users.push(teacher.id)
      usedSlots.set(break2Time, break2Users)

      breakAssignments.set(teacher.id, { break1: break1Time, break2: break2Time })
    }

    // Now generate optimized breaks with substitute info
    for (const teacher of workingTeachers) {
      const assignment = breakAssignments.get(teacher.id)
      if (!assignment) continue

      const break1Sub = findSubstitute(teacher, assignment.break1, classrooms)
      const break2Sub = findSubstitute(teacher, assignment.break2, classrooms)

      optimizedBreaks.push({
        teacher_id: teacher.id,
        teacher_name: `${teacher.first_name} ${teacher.last_name}`,
        break1_start: minutesToTime(assignment.break1),
        break1_end: minutesToTime(assignment.break1 + 10),
        break1_sub_name: break1Sub,
        break2_start: minutesToTime(assignment.break2),
        break2_end: minutesToTime(assignment.break2 + 10),
        break2_sub_name: break2Sub
      })
    }

    // Save optimized breaks to the shifts table
    // This persists the optimization so it's available in future sessions
    for (const optimizedBreak of optimizedBreaks) {
      // Find the teacher to get their regular shift times
      const teacher = workingTeachers.find(t => t.id === optimizedBreak.teacher_id)
      if (!teacher) continue

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
        // Update existing shift with optimized breaks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('shifts')
          .update({
            break1_start: optimizedBreak.break1_start,
            break1_end: optimizedBreak.break1_end,
            break2_start: optimizedBreak.break2_start,
            break2_end: optimizedBreak.break2_end,
          })
          .eq('id', existingShift.id)

        if (updateError) {
          console.error(`[Optimize] Error updating shift for teacher ${optimizedBreak.teacher_id}:`, updateError)
        }
      } else {
        // Create new shift record with optimized breaks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase as any)
          .from('shifts')
          .insert({
            school_id,
            teacher_id: optimizedBreak.teacher_id,
            date,
            start_time: teacher.regular_shift_start,
            end_time: teacher.regular_shift_end,
            break1_start: optimizedBreak.break1_start,
            break1_end: optimizedBreak.break1_end,
            lunch_start: teacher.lunch_break_start,
            lunch_end: teacher.lunch_break_end,
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
        teachers_needed_nap: napTeachersNeeded
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in POST /api/calendar/optimize:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
