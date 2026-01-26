'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useComponentPerf } from '@/contexts/PerfContext'
import { perfFetch } from '@/lib/perf'
import { School } from '@/types/database'
import { useEffect, useState } from 'react'

interface Teacher {
  id: string
  first_name: string
  last_name: string
  classroom_title: string | null
  role: string
  regular_shift_start: string | null
  regular_shift_end: string | null
  lunch_break_start: string | null
  lunch_break_end: string | null
}

interface Classroom {
  id: string
  name: string
  age_group: string
}

interface TimeBlock {
  start_time: string
  end_time: string
  classroom_name: string | null
  notes: string | null
  type: 'work' | 'break' | 'lunch'
  substitute_name?: string | null  // Who is covering during break
}

// Helper to convert time string to minutes since midnight for comparison
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

// Helper to build chronological time segments from a shift with breaks
function buildTimeSegments(
  shiftStart: string,
  shiftEnd: string,
  break1Start: string | null,
  break1End: string | null,
  lunchStart: string | null,
  lunchEnd: string | null,
  break2Start: string | null,
  break2End: string | null,
  classroomName: string | null,
  break1SubName?: string | null,
  break2SubName?: string | null
): TimeBlock[] {
  const segments: TimeBlock[] = []

  // Collect all break periods with their times
  const breaks: { start: string; end: string; type: 'break' | 'lunch'; subName?: string | null }[] = []

  if (break1Start && break1End) {
    breaks.push({ start: break1Start, end: break1End, type: 'break', subName: break1SubName })
  }
  if (lunchStart && lunchEnd) {
    breaks.push({ start: lunchStart, end: lunchEnd, type: 'lunch', subName: null })
  }
  if (break2Start && break2End) {
    breaks.push({ start: break2Start, end: break2End, type: 'break', subName: break2SubName })
  }

  // Sort breaks by start time
  breaks.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))

  // Build segments by iterating through the day
  let currentTime = shiftStart

  for (const brk of breaks) {
    // Add work segment before this break (if there's time)
    if (timeToMinutes(currentTime) < timeToMinutes(brk.start)) {
      segments.push({
        start_time: currentTime,
        end_time: brk.start,
        classroom_name: classroomName,
        notes: null,
        type: 'work'
      })
    }

    // Add the break segment
    segments.push({
      start_time: brk.start,
      end_time: brk.end,
      classroom_name: null,
      notes: brk.type === 'lunch' ? 'Lunch' : '10 min break',
      type: brk.type,
      substitute_name: brk.subName
    })

    currentTime = brk.end
  }

  // Add final work segment after last break (if there's time)
  if (timeToMinutes(currentTime) < timeToMinutes(shiftEnd)) {
    segments.push({
      start_time: currentTime,
      end_time: shiftEnd,
      classroom_name: classroomName,
      notes: null,
      type: 'work'
    })
  }

  // If no breaks at all, just add the full shift as work
  if (segments.length === 0) {
    segments.push({
      start_time: shiftStart,
      end_time: shiftEnd,
      classroom_name: classroomName,
      notes: null,
      type: 'work'
    })
  }

  return segments
}

interface StaffDaySchedule {
  teacher: Teacher
  blocks: TimeBlock[]
}

interface SchoolDaySchedule {
  school: School
  staff: StaffDaySchedule[]
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type DayViewMode = 'schedule' | 'timeline'

interface OptimizedBreak {
  teacher_id: string
  teacher_name: string
  break1_start: string
  break1_end: string
  break1_sub_name: string | null
  break2_start: string
  break2_end: string
  break2_sub_name: string | null
}

interface StaffingAlert {
  type: 'surplus' | 'shortage'
  message: string
  count: number
  time_range?: string
}

interface OptimizationResult {
  success: boolean
  school_name: string
  breaks: OptimizedBreak[]
  alerts: StaffingAlert[]
  coverage_summary: {
    total_teachers: number
    teachers_needed_peak: number
    teachers_needed_nap: number
  }
}

// Minimal optimization interfaces
interface MinimalScheduleBlock {
  start_time: string
  end_time: string
  classroom_name: string
  type: 'work' | 'break' | 'lunch'
  notes?: string
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
  school_id: string
  school_name: string
  current_teachers: number
  minimal_teachers_needed: number
  potential_savings: number
  essential_teachers: MinimalTeacherSchedule[]
  surplus_teachers: { id: string; name: string; reason: string }[]
  warnings: string[]
}

type ScenarioMode = 'actual' | 'optimized'

export default function CalendarPage() {
  const { schools, currentSchool, isOwner, loading: authLoading } = useAuth()
  const { markDataReady } = useComponentPerf('CalendarPage')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week'>('day')
  const [dayViewMode, setDayViewMode] = useState<DayViewMode>('timeline')
  const [schedules, setSchedules] = useState<SchoolDaySchedule[]>([])
  const [loading, setLoading] = useState(true)

  // Optimization state
  const [optimizing, setOptimizing] = useState(false)
  const [optimizationResults, setOptimizationResults] = useState<Map<string, OptimizationResult>>(new Map())
  const [showAlerts, setShowAlerts] = useState(true)

  // Minimal optimization state
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>('actual')
  const [minimalResults, setMinimalResults] = useState<Map<string, MinimalOptimizationResult>>(new Map())

  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === "Little Seeds Children's Center") return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  const formatTime = (time: string) => {
    // Convert "HH:MM:SS" or "HH:MM" to display format like "8:30"
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const m = minutes || '00'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return m === '00' ? `${hour}` : `${hour}:${m}`
  }

  const formatTimeRange = (start: string, end: string) => {
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  const navigateDay = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Run optimization for all schools (both regular and minimal)
  const runOptimization = async () => {
    const schoolsToOptimize = currentSchool ? [currentSchool] : schools
    if (schoolsToOptimize.length === 0) return

    setOptimizing(true)
    const results = new Map<string, OptimizationResult>()
    const minResults = new Map<string, MinimalOptimizationResult>()

    try {
      const dateStr = formatDate(currentDate)

      await Promise.all(schoolsToOptimize.map(async (school) => {
        try {
          // Fetch both regular and minimal optimization in parallel
          const [regularRes, minimalRes] = await Promise.all([
            fetch('/api/calendar/optimize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ school_id: school.id, date: dateStr })
            }),
            fetch('/api/calendar/optimize-minimal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ school_id: school.id, date: dateStr })
            })
          ])

          if (regularRes.ok) {
            const data = await regularRes.json()
            results.set(school.id, data)
          }
          if (minimalRes.ok) {
            const data = await minimalRes.json()
            minResults.set(school.id, data)
          }
        } catch (err) {
          console.error(`Error optimizing for school ${school.id}:`, err)
        }
      }))

      setOptimizationResults(results)
      setMinimalResults(minResults)
    } catch (error) {
      console.error('Error running optimization:', error)
    } finally {
      setOptimizing(false)
    }
  }

  // Get all alerts across all schools
  const getAllAlerts = (): { school: string; alert: StaffingAlert }[] => {
    const alerts: { school: string; alert: StaffingAlert }[] = []
    optimizationResults.forEach((result) => {
      result.alerts.forEach(alert => {
        alerts.push({ school: result.school_name, alert })
      })
    })
    return alerts
  }

  // Get optimized breaks for a teacher
  const getOptimizedBreaks = (schoolId: string, teacherId: string): OptimizedBreak | null => {
    const result = optimizationResults.get(schoolId)
    if (!result) return null
    return result.breaks.find(b => b.teacher_id === teacherId) || null
  }

  // Build schedule with optimized breaks applied
  const getScheduleWithBreaks = (): SchoolDaySchedule[] => {
    if (optimizationResults.size === 0) return schedules

    return schedules.map(schedule => {
      const updatedStaff = schedule.staff.map(staffSchedule => {
        const optimizedBreak = getOptimizedBreaks(schedule.school.id, staffSchedule.teacher.id)

        if (!optimizedBreak) return staffSchedule

        // Rebuild blocks with the optimized breaks
        const teacher = staffSchedule.teacher
        if (!teacher.regular_shift_start || !teacher.regular_shift_end) return staffSchedule

        const newBlocks = buildTimeSegments(
          teacher.regular_shift_start,
          teacher.regular_shift_end,
          optimizedBreak.break1_start,
          optimizedBreak.break1_end,
          teacher.lunch_break_start,
          teacher.lunch_break_end,
          optimizedBreak.break2_start,
          optimizedBreak.break2_end,
          teacher.classroom_title,
          optimizedBreak.break1_sub_name,
          optimizedBreak.break2_sub_name
        )

        return {
          ...staffSchedule,
          blocks: newBlocks.sort((a, b) => a.start_time.localeCompare(b.start_time))
        }
      })

      return {
        ...schedule,
        staff: updatedStaff
      }
    })
  }

  // Memoize schools length to prevent infinite loops when schools array reference changes
  const schoolsLength = schools.length

  useEffect(() => {
    console.log('[Calendar] useEffect triggered:', { authLoading, schoolsCount: schoolsLength, currentSchool: currentSchool?.name })

    // Don't fetch until auth is ready
    if (authLoading) {
      console.log('[Calendar] Waiting for auth...')
      return
    }

    // If no schools available, show empty state once (don't keep re-running)
    if (schoolsLength === 0 && !currentSchool) {
      console.log('[Calendar] No schools available, showing empty state')
      setSchedules([])
      setLoading(false)
      markDataReady()
      return
    }

    const fetchSchedules = async () => {
      const schoolsToFetch = currentSchool ? [currentSchool] : schools
      console.log('[Calendar] fetchSchedules called, schoolsToFetch:', schoolsToFetch.length)

      setLoading(true)

      try {
        const dateStr = formatDate(currentDate)

        const schedulePromises = schoolsToFetch.map(async (school) => {
          try {
            // Fetch staff and shifts for this school
            const [staffRes, shiftsRes, classroomsRes] = await Promise.all([
              perfFetch(`/api/staff?school_id=${school.id}&status=active`),
              perfFetch(`/api/staff/shifts?school_id=${school.id}&start_date=${dateStr}&end_date=${dateStr}`),
              perfFetch(`/api/classrooms?school_id=${school.id}`)
            ])

            // Parse responses defensively
            let staff: Teacher[] = []
            let shifts: unknown[] = []
            let classrooms: Classroom[] = []

            try {
              if (staffRes.ok) {
                const staffData = await staffRes.json()
                staff = Array.isArray(staffData) ? staffData : []
              } else {
                console.log(`[Calendar] Staff API returned ${staffRes.status} for school ${school.id}`)
              }
            } catch (e) { console.error('[Calendar] Error parsing staff:', e); staff = [] }

            try {
              if (shiftsRes.ok) {
                const shiftsData = await shiftsRes.json()
                shifts = Array.isArray(shiftsData) ? shiftsData : []
              } else {
                console.log(`[Calendar] Shifts API returned ${shiftsRes.status} for school ${school.id}`)
              }
            } catch (e) { console.error('[Calendar] Error parsing shifts:', e); shifts = [] }

            try {
              if (classroomsRes.ok) {
                const classroomsData = await classroomsRes.json()
                classrooms = Array.isArray(classroomsData) ? classroomsData : []
              } else {
                console.log(`[Calendar] Classrooms API returned ${classroomsRes.status} for school ${school.id}`)
              }
            } catch (e) { console.error('[Calendar] Error parsing classrooms:', e); classrooms = [] }

            console.log(`[Calendar] Data for school ${school.id}: staff=${staff.length}, shifts=${shifts.length}, classrooms=${classrooms.length}`)

            // Create a map of classroom IDs to names
            const classroomMap = new Map(classrooms.map(c => [c.id, c.name]))

            // Build schedule for each staff member
            const staffSchedules: StaffDaySchedule[] = staff
              .filter(t => t.role !== 'director' && t.role !== 'assistant_director')
              .map(teacher => {
                const teacherShifts = shifts.filter((s) => {
                  const shift = s as { teacher_id?: string }
                  return shift.teacher_id === teacher.id
                })

                let blocks: TimeBlock[] = []

                teacherShifts.forEach((s) => {
                  const shift = s as {
                    start_time: string
                    end_time: string
                    classroom_id: string | null
                    notes: string | null
                    break1_start: string | null
                    break1_end: string | null
                    lunch_start: string | null
                    lunch_end: string | null
                    break2_start: string | null
                    break2_end: string | null
                    classroom?: { name: string }
                  }

                  const classroomName = shift.classroom_id
                    ? classroomMap.get(shift.classroom_id) || shift.classroom?.name || null
                    : teacher.classroom_title

                  // Build time segments that split work around breaks
                  const segments = buildTimeSegments(
                    shift.start_time,
                    shift.end_time,
                    shift.break1_start,
                    shift.break1_end,
                    shift.lunch_start,
                    shift.lunch_end,
                    shift.break2_start,
                    shift.break2_end,
                    classroomName
                  )

                  blocks = blocks.concat(segments)
                })

                // If no shifts, use regular shift times from teacher profile
                if (blocks.length === 0 && teacher.regular_shift_start && teacher.regular_shift_end) {
                  const defaultSegments = buildTimeSegments(
                    teacher.regular_shift_start,
                    teacher.regular_shift_end,
                    null, // no break1 in teacher profile
                    null,
                    teacher.lunch_break_start,
                    teacher.lunch_break_end,
                    null, // no break2 in teacher profile
                    null,
                    teacher.classroom_title
                  )
                  blocks = blocks.concat(defaultSegments)
                }

                return {
                  teacher,
                  blocks: blocks.sort((a, b) => a.start_time.localeCompare(b.start_time))
                }
              })
              .filter(s => s.blocks.length > 0)

            return {
              school,
              staff: staffSchedules
            }
          } catch (err) {
            console.error(`Error fetching schedule for school ${school.id}:`, err)
            // Return empty schedule for this school on error
            return {
              school,
              staff: []
            }
          }
        })

        const results = await Promise.all(schedulePromises)
        console.log('[Calendar] Schedules fetched:', results.map(r => ({ school: r.school.name, staffCount: r.staff.length })))
        setSchedules(results)
      } catch (error) {
        console.error('[Calendar] Error fetching schedules:', error)
        setSchedules([])
      } finally {
        console.log('[Calendar] Loading complete')
        setLoading(false)
        markDataReady()
      }
    }

    fetchSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, currentSchool, schoolsLength, authLoading])

  const dayOfWeek = DAYS_OF_WEEK[currentDate.getDay()]
  const dateDisplay = `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`
  const isToday = formatDate(currentDate) === formatDate(new Date())

  if (authLoading || loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 mt-1">
            {isOwner && !currentSchool ? 'All Schools' : currentSchool?.name ? getShortName(currentSchool.name) : 'Select a school'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
          </div>

          {/* Day View Mode Toggle (only show when in day view) */}
          {view === 'day' && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDayViewMode('timeline')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  dayViewMode === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setDayViewMode('schedule')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  dayViewMode === 'schedule' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Schedule
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDay(-1)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="px-4 py-2 min-w-[250px] text-center">
              <span className={`font-medium ${isToday ? 'text-brand' : 'text-gray-900'}`}>
                {dayOfWeek}, {dateDisplay}
              </span>
            </div>

            <button
              onClick={() => navigateDay(1)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-brand border border-brand rounded-lg hover:bg-brand/5"
            >
              Today
            </button>

            {/* Recalculate Button */}
            <button
              onClick={runOptimization}
              disabled={optimizing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand/90 disabled:opacity-50"
            >
              {optimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Recalculate
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Toggle - Only show after optimization has run */}
      {minimalResults.size > 0 && (
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">View Scenario:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setScenarioMode('actual')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                scenarioMode === 'actual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Actual Staff
            </button>
            <button
              onClick={() => setScenarioMode('optimized')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                scenarioMode === 'optimized' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Minimal Staff (Hypothetical)
            </button>
          </div>
          {scenarioMode === 'optimized' && (
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              This shows the minimum staff needed to maintain ratios
            </span>
          )}
        </div>
      )}

      {/* Staffing Alerts */}
      {getAllAlerts().length > 0 && showAlerts && (
        <div className="mb-6 space-y-3">
          {getAllAlerts().map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                item.alert.type === 'surplus'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.alert.type === 'surplus' ? (
                  <div className="p-2 bg-blue-100 rounded-full">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                ) : (
                  <div className="p-2 bg-red-100 rounded-full">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className={`font-medium ${item.alert.type === 'surplus' ? 'text-blue-900' : 'text-red-900'}`}>
                    {item.school}: {item.alert.type === 'surplus' ? 'Teacher Surplus' : 'Teacher Shortage'}
                  </p>
                  <p className={`text-sm ${item.alert.type === 'surplus' ? 'text-blue-700' : 'text-red-700'}`}>
                    {item.alert.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAlerts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Coverage Summary */}
      {optimizationResults.size > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from(optimizationResults.entries()).map(([schoolId, result]) => (
            <div key={schoolId} className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-2">{getShortName(result.school_name)}</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-brand">{result.coverage_summary.total_teachers}</p>
                  <p className="text-xs text-gray-500">Available</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-700">{result.coverage_summary.teachers_needed_peak}</p>
                  <p className="text-xs text-gray-500">Peak Need</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{result.coverage_summary.teachers_needed_nap}</p>
                  <p className="text-xs text-gray-500">Nap Time</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ACTUAL SCENARIO - Regular schedule views */}
      {scenarioMode === 'actual' && (
        <>
          {/* Day View - Timeline Mode (Hour-based grid) */}
          {view === 'day' && dayViewMode === 'timeline' && (
            <div className="flex flex-col gap-6">
              {getScheduleWithBreaks().map((schedule) => (
                <SchoolTimelineCard key={schedule.school.id} schedule={schedule} />
              ))}
            </div>
          )}

          {/* Day View - Schedule Mode (Block-based) */}
          {view === 'day' && dayViewMode === 'schedule' && (
            <div className="flex flex-col gap-6">
              {getScheduleWithBreaks().map((schedule) => (
                <SchoolDayCard key={schedule.school.id} schedule={schedule} formatTimeRange={formatTimeRange} />
              ))}
            </div>
          )}

          {/* Week View (simplified) */}
          {view === 'week' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-gray-500 text-center">Week view coming soon. Use Day view for detailed schedules.</p>
            </div>
          )}

          {/* Empty state */}
          {getScheduleWithBreaks().length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">No schedules available</p>
              <p className="text-sm text-gray-400 mt-1">Staff schedules will appear here once created</p>
            </div>
          )}
        </>
      )}

      {/* OPTIMIZED SCENARIO - Minimal staff view */}
      {scenarioMode === 'optimized' && minimalResults.size > 0 && (
        <div className="space-y-6">
          {Array.from(minimalResults.entries()).map(([schoolId, result]) => (
            <MinimalScenarioCard key={schoolId} result={result} getShortName={getShortName} />
          ))}
        </div>
      )}
    </div>
  )
}

// Timeline view - clean table layout with equal-width columns for readability
function SchoolTimelineCard({
  schedule
}: {
  schedule: SchoolDaySchedule
}) {
  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === "Little Seeds Children's Center") return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  // Format time for display
  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const m = minutes || '00'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    const ampm = h >= 12 ? 'pm' : 'am'
    return m === '00' ? `${hour}${ampm}` : `${hour}:${m}${ampm}`
  }

  // Get background color based on block type
  const getBlockBg = (type: 'work' | 'break' | 'lunch') => {
    switch (type) {
      case 'break': return 'bg-yellow-50'
      case 'lunch': return 'bg-blue-50'
      default: return 'bg-white'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:rounded-none print:border-black">
      {/* School Header */}
      <div className="bg-green-100 px-4 py-3 border-b border-green-200 print:bg-green-50">
        <h2 className="text-lg font-bold text-gray-900 text-center">
          {getShortName(schedule.school.name)}
        </h2>
      </div>

      {/* Schedule Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {schedule.staff.map((staffSchedule, staffIdx) => (
              <tr
                key={staffSchedule.teacher.id}
                className={staffIdx > 0 ? 'border-t-2 border-gray-300' : ''}
              >
                {/* Staff Name - Fixed width */}
                <td className="w-24 min-w-[96px] px-3 py-3 font-bold text-gray-900 border-r-2 border-gray-300 bg-gray-50 align-top text-sm">
                  {staffSchedule.teacher.first_name}
                </td>

                {/* Time Blocks - Equal width columns */}
                {staffSchedule.blocks.map((block, idx) => (
                  <td
                    key={idx}
                    className={`min-w-[140px] px-3 py-2 border-r border-gray-200 align-top ${getBlockBg(block.type)}`}
                  >
                    {/* Time Range - Bold and prominent */}
                    <div className="font-bold text-gray-900 text-sm whitespace-nowrap">
                      {formatTimeDisplay(block.start_time)} - {formatTimeDisplay(block.end_time)}
                    </div>

                    {/* Block type label for breaks/lunch */}
                    {block.type === 'break' && (
                      <div className="text-yellow-700 font-semibold text-xs mt-1">
                        10 minute break
                      </div>
                    )}
                    {block.type === 'lunch' && (
                      <div className="text-blue-700 font-semibold text-xs mt-1">
                        Lunch break
                      </div>
                    )}

                    {/* Classroom/Role info */}
                    {block.classroom_name && (
                      <div className="text-gray-600 text-xs mt-1">
                        {block.classroom_name}
                      </div>
                    )}

                    {/* Substitute info - highlighted */}
                    {block.substitute_name && (
                      <div className="text-green-700 font-semibold text-xs mt-1">
                        {block.substitute_name}
                      </div>
                    )}
                  </td>
                ))}

                {/* Fill remaining space */}
                <td className="bg-gray-50"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex gap-6 text-xs print:bg-white">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
          <span className="text-gray-700 font-medium">10 min Break</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 border border-blue-300 rounded"></div>
          <span className="text-gray-700 font-medium">Lunch</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-700 font-semibold">Green text</span>
          <span className="text-gray-700">= Substitute covering</span>
        </div>
      </div>

      {/* Empty state for school */}
      {schedule.staff.length === 0 && (
        <div className="p-6 text-center text-gray-500 text-sm">
          No staff schedules for this day
        </div>
      )}
    </div>
  )
}

// Schedule view - compact card layout for quick overview
function SchoolDayCard({
  schedule,
  formatTimeRange
}: {
  schedule: SchoolDaySchedule
  formatTimeRange: (start: string, end: string) => string
}) {
  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === "Little Seeds Children's Center") return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* School Header */}
      <div className="bg-green-100 px-4 py-3 border-b border-green-200">
        <h2 className="text-lg font-bold text-gray-900 text-center">
          {getShortName(schedule.school.name)}
        </h2>
      </div>

      {/* Staff Cards */}
      <div className="p-4 space-y-4">
        {schedule.staff.map((staffSchedule) => (
          <div key={staffSchedule.teacher.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Staff Name Header */}
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <span className="font-bold text-gray-900">{staffSchedule.teacher.first_name} {staffSchedule.teacher.last_name}</span>
              {staffSchedule.teacher.classroom_title && (
                <span className="text-gray-500 ml-2 text-sm">({staffSchedule.teacher.classroom_title})</span>
              )}
            </div>

            {/* Schedule Blocks as horizontal flow */}
            <div className="flex flex-wrap gap-2 p-3">
              {staffSchedule.blocks.map((block, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-2 rounded-lg border ${
                    block.type === 'break' ? 'bg-yellow-50 border-yellow-300' :
                    block.type === 'lunch' ? 'bg-blue-50 border-blue-300' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="font-bold text-gray-900 text-sm">
                    {formatTimeRange(block.start_time, block.end_time)}
                  </div>
                  {block.type === 'break' && (
                    <div className="text-yellow-700 text-xs font-semibold">10 min break</div>
                  )}
                  {block.type === 'lunch' && (
                    <div className="text-blue-700 text-xs font-semibold">Lunch</div>
                  )}
                  {block.classroom_name && block.type === 'work' && (
                    <div className="text-gray-600 text-xs">{block.classroom_name}</div>
                  )}
                  {block.substitute_name && (
                    <div className="text-green-700 text-xs font-semibold">{block.substitute_name}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state for school */}
      {schedule.staff.length === 0 && (
        <div className="p-6 text-center text-gray-500 text-sm">
          No staff schedules for this day
        </div>
      )}
    </div>
  )
}

// Minimal Scenario Card - Shows hypothetical minimal staff schedule
function MinimalScenarioCard({
  result,
  getShortName
}: {
  result: MinimalOptimizationResult
  getShortName: (name: string) => string
}) {
  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const m = minutes || '00'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    const ampm = h >= 12 ? 'pm' : 'am'
    return m === '00' ? `${hour}${ampm}` : `${hour}:${m}${ampm}`
  }

  return (
    <div className="bg-white rounded-xl border-2 border-orange-300 overflow-hidden">
      {/* School Header with savings summary */}
      <div className="bg-orange-100 px-4 py-3 border-b border-orange-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {getShortName(result.school_name)} - Minimal Staff Scenario
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span className="text-2xl font-bold text-gray-600">{result.current_teachers}</span>
              <span className="text-xs text-gray-500 block">Current</span>
            </div>
            <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="text-center">
              <span className="text-2xl font-bold text-orange-600">{result.minimal_teachers_needed}</span>
              <span className="text-xs text-gray-500 block">Minimal</span>
            </div>
            {result.potential_savings > 0 && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                Save {result.potential_savings} position{result.potential_savings > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          {result.warnings.map((warning, idx) => (
            <p key={idx} className="text-sm text-yellow-800">⚠️ {warning}</p>
          ))}
        </div>
      )}

      {/* Essential Teachers Section */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          Essential Staff ({result.essential_teachers.length})
        </h3>

        {/* Essential Teachers Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse">
            <tbody>
              {result.essential_teachers.map((teacher) => (
                <tr key={teacher.teacher_id} className="border-t border-gray-200">
                  <td className="w-32 min-w-[128px] px-3 py-3 font-bold text-gray-900 border-r border-gray-200 bg-green-50 align-top text-sm">
                    <div>{teacher.teacher_name.split(' ')[0]}</div>
                    <div className="text-xs font-normal text-green-700">{teacher.reason.split(' - ')[0]}</div>
                  </td>
                  {teacher.blocks.map((block, idx) => (
                    <td
                      key={idx}
                      className={`min-w-[130px] px-3 py-2 border-r border-gray-200 align-top ${
                        block.type === 'break' ? 'bg-yellow-50' :
                        block.type === 'lunch' ? 'bg-blue-50' :
                        'bg-white'
                      }`}
                    >
                      <div className="font-bold text-gray-900 text-sm whitespace-nowrap">
                        {formatTimeDisplay(block.start_time)} - {formatTimeDisplay(block.end_time)}
                      </div>
                      {block.type === 'break' && (
                        <div className="text-yellow-700 font-semibold text-xs">10 minute break</div>
                      )}
                      {block.type === 'lunch' && (
                        <div className="text-blue-700 font-semibold text-xs">Lunch break</div>
                      )}
                      {block.type === 'work' && block.classroom_name && (
                        <div className="text-gray-600 text-xs">{block.classroom_name}</div>
                      )}
                    </td>
                  ))}
                  <td className="bg-gray-50"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Surplus Teachers Section */}
        {result.surplus_teachers.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Potentially Surplus Staff ({result.surplus_teachers.length})
            </h3>
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <p className="text-xs text-red-600 mb-3">
                These positions could potentially be reduced while maintaining required ratios:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.surplus_teachers.map((teacher) => (
                  <div key={teacher.id} className="bg-white rounded-lg border border-red-200 p-3">
                    <div className="font-semibold text-gray-900">{teacher.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{teacher.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
          <span className="text-gray-700 font-medium">Essential Staff</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
          <span className="text-gray-700 font-medium">10 min Break</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 border border-blue-300 rounded"></div>
          <span className="text-gray-700 font-medium">Lunch</span>
        </div>
      </div>
    </div>
  )
}
