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
  break2_start: string
  break2_end: string
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

    // Fetch all required data in parallel
    const [
      schoolRes,
      teachersRes,
      classroomsRes,
      studentsRes,
      attendanceRes,
      settingsRes
    ] = await Promise.all([
      supabase.from('schools').select('*').eq('id', school_id).single(),
      supabase.from('teachers').select('*').eq('school_id', school_id).eq('status', 'active'),
      supabase.from('classrooms').select('*').eq('school_id', school_id),
      supabase.from('students').select('*').eq('school_id', school_id).eq('status', 'enrolled'),
      supabase.from('attendance').select('*').eq('school_id', school_id).eq('date', date).eq('status', 'present'),
      supabase.from('school_settings').select('*').or(`school_id.is.null,school_id.eq.${school_id}`)
    ])

    if (schoolRes.error) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const school = schoolRes.data
    const teachers = (teachersRes.data || []) as Teacher[]
    const classrooms = (classroomsRes.data || []) as Classroom[]
    const students = (studentsRes.data || []) as Student[]
    const attendance = attendanceRes.data || []
    const settings = settingsRes.data || []

    // Get ratio settings
    const normalRatiosSetting = settings.find(s => s.setting_key === 'ratio_normal')
    const napRatiosSetting = settings.find(s => s.setting_key === 'ratio_naptime')

    const normalRatios: RatioSettings = normalRatiosSetting?.setting_value || {
      infant: 4, toddler: 4, twos: 12, threes: 12, preschool: 12, pre_k: 12
    }
    const napRatios: RatioSettings = napRatiosSetting?.setting_value || {
      infant: 12, toddler: 12, twos: 24, threes: 24, preschool: 24, pre_k: 24
    }

    // Get present students (those with attendance marked)
    const presentStudentIds = new Set(attendance.map((a: { student_id: string }) => a.student_id))
    const presentStudents = students.filter(s => presentStudentIds.has(s.id))

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

    for (const teacher of workingTeachers) {
      if (!teacher.regular_shift_start || !teacher.regular_shift_end || !teacher.lunch_break_start) {
        continue
      }

      const shiftStart = timeToMinutes(teacher.regular_shift_start)
      const shiftEnd = timeToMinutes(teacher.regular_shift_end)
      const lunchStart = timeToMinutes(teacher.lunch_break_start)
      const lunchEnd = teacher.lunch_break_end ? timeToMinutes(teacher.lunch_break_end) : lunchStart + 60

      // Find best break1 slot (before lunch)
      let break1Time = shiftStart + 120 // Default: 2 hours after shift start
      for (const slot of breakSlots) {
        if (slot.start > shiftStart + 60 && slot.end < lunchStart - 30) {
          // Prefer nap time slots
          if (slot.isNapTime) {
            break1Time = slot.start
            break
          }
          if (!breakAssignments.has(`${slot.start}`)) {
            break1Time = slot.start
          }
        }
      }

      // Find best break2 slot (after lunch)
      let break2Time = lunchEnd + 120 // Default: 2 hours after lunch
      for (const slot of breakSlots) {
        if (slot.start > lunchEnd + 60 && slot.end < shiftEnd - 30) {
          // Prefer nap time slots
          if (slot.isNapTime) {
            break2Time = slot.start
            break
          }
          if (!breakAssignments.has(`${slot.start}`)) {
            break2Time = slot.start
          }
        }
      }

      breakAssignments.set(teacher.id, { break1: break1Time, break2: break2Time })

      optimizedBreaks.push({
        teacher_id: teacher.id,
        teacher_name: `${teacher.first_name} ${teacher.last_name}`,
        break1_start: minutesToTime(break1Time),
        break1_end: minutesToTime(break1Time + 10),
        break2_start: minutesToTime(break2Time),
        break2_end: minutesToTime(break2Time + 10)
      })
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
