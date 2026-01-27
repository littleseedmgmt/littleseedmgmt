'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useComponentPerf } from '@/contexts/PerfContext'
import { perfFetch } from '@/lib/perf'
import { School } from '@/types/database'
import { useEffect, useState, useRef } from 'react'

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
  break2SubName?: string | null,
  lunchSubName?: string | null
): TimeBlock[] {
  const segments: TimeBlock[] = []

  // Collect all break periods with their times
  const breaks: { start: string; end: string; type: 'break' | 'lunch'; subName?: string | null }[] = []

  if (break1Start && break1End) {
    breaks.push({ start: break1Start, end: break1End, type: 'break', subName: break1SubName })
  }
  if (lunchStart && lunchEnd) {
    breaks.push({ start: lunchStart, end: lunchEnd, type: 'lunch', subName: lunchSubName })
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
  lunch_start: string | null
  lunch_end: string | null
  lunch_sub_name: string | null
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
    total_students_present?: number
  }
}

// Minimal optimization interfaces
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

  // Minimal optimization state
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>('actual')
  const [minimalResults, setMinimalResults] = useState<Map<string, MinimalOptimizationResult>>(new Map())

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(new Date())
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
    }
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDatePicker])

  // Sync picker month when date picker opens
  const openDatePicker = () => {
    setPickerMonth(new Date(currentDate))
    setShowDatePicker(true)
  }

  const selectDate = (date: Date) => {
    setCurrentDate(date)
    setShowDatePicker(false)
  }

  // Generate calendar days for the picker
  const getCalendarDays = () => {
    const year = pickerMonth.getFullYear()
    const month = pickerMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }

    return days
  }

  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === "Little Seeds Children's Center") return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  // Use local date, not UTC (toISOString converts to UTC which causes off-by-one errors)
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

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
    // Results will be loaded by useEffect when currentDate changes
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    // Results will be loaded by useEffect when currentDate changes
  }

  // Load saved optimization results from database
  const loadSavedOptimization = async (schoolsToLoad: { id: string }[], dateStr: string) => {
    const results = new Map<string, OptimizationResult>()
    const minResults = new Map<string, MinimalOptimizationResult>()

    await Promise.all(schoolsToLoad.map(async (school) => {
      try {
        const res = await fetch(`/api/calendar/optimization-results?school_id=${school.id}&date=${dateStr}`)
        if (res.ok) {
          const data = await res.json()
          if (data.regular) {
            results.set(school.id, data.regular)
          }
          if (data.minimal) {
            minResults.set(school.id, data.minimal)
          }
        }
      } catch (err) {
        console.error(`Error loading saved optimization for school ${school.id}:`, err)
      }
    }))

    setOptimizationResults(results)
    setMinimalResults(minResults)
  }

  // Run optimization for all schools (both regular and minimal)
  const runOptimization = async () => {
    const schoolsToOptimize = currentSchool ? [currentSchool] : schools
    console.log('[Optimize] runOptimization called, schools:', schoolsToOptimize.length)
    if (schoolsToOptimize.length === 0) {
      console.log('[Optimize] No schools to optimize, returning')
      return
    }

    setOptimizing(true)
    const results = new Map<string, OptimizationResult>()
    const minResults = new Map<string, MinimalOptimizationResult>()

    try {
      const dateStr = formatDate(currentDate)
      console.log('[Optimize] Date being used:', dateStr)

      await Promise.all(schoolsToOptimize.map(async (school) => {
        console.log(`[Optimize] Starting optimization for school: ${school.name} (${school.id})`)
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

          console.log(`[Optimize] ${school.name} - Regular API status: ${regularRes.status}, Minimal API status: ${minimalRes.status}`)

          if (regularRes.ok) {
            const data = await regularRes.json()
            console.log(`[Optimize] ${school.name} - Regular result:`, {
              total_students: data.total_students,
              available_teachers: data.available_teachers,
              teachers_needed: data.teachers_needed,
              breaks_count: data.breaks?.length
            })
            results.set(school.id, data)
          } else {
            const errorText = await regularRes.text()
            console.error(`[Optimize] ${school.name} - Regular API error:`, errorText)
          }
          if (minimalRes.ok) {
            const data = await minimalRes.json()
            console.log(`[Optimize] ${school.name} - Minimal result:`, {
              current_teachers: data.current_teachers,
              minimal_teachers_needed: data.minimal_teachers_needed
            })
            minResults.set(school.id, data)
          } else {
            const errorText = await minimalRes.text()
            console.error(`[Optimize] ${school.name} - Minimal API error:`, errorText)
          }
        } catch (err) {
          console.error(`[Optimize] Error optimizing for school ${school.id}:`, err)
        }
      }))

      console.log('[Optimize] All optimizations complete. Results count:', results.size, 'MinResults count:', minResults.size)
      setOptimizationResults(results)
      setMinimalResults(minResults)
    } catch (error) {
      console.error('[Optimize] Error running optimization:', error)
    } finally {
      setOptimizing(false)
      console.log('[Optimize] Optimization finished')
    }
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
          optimizedBreak.break2_sub_name,
          optimizedBreak.lunch_sub_name
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

  // Fallback: fetch schools directly if auth context doesn't have them
  const [fallbackSchools, setFallbackSchools] = useState<School[]>([])

  useEffect(() => {
    console.log('[Calendar] useEffect triggered:', { authLoading, schoolsCount: schoolsLength, currentSchool: currentSchool?.name })

    // Don't fetch until auth is ready
    if (authLoading) {
      console.log('[Calendar] Waiting for auth...')
      return
    }

    // If no schools from auth context, try fetching directly from API
    if (schoolsLength === 0 && !currentSchool && fallbackSchools.length === 0) {
      console.log('[Calendar] No schools from auth, fetching from API...')
      fetch('/api/schools')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          console.log('[Calendar] Fallback schools fetched:', data.length)
          if (Array.isArray(data) && data.length > 0) {
            setFallbackSchools(data)
          } else {
            // Truly no schools available
            setSchedules([])
            setLoading(false)
            markDataReady()
          }
        })
        .catch(() => {
          setSchedules([])
          setLoading(false)
          markDataReady()
        })
      return
    }

    const fetchSchedules = async () => {
      // Use fallback schools if auth context is empty
      const effectiveSchools = schoolsLength > 0 ? schools : fallbackSchools
      const schoolsToFetch = currentSchool ? [currentSchool] : effectiveSchools
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

        // Load saved optimization results for this date (non-blocking)
        // Don't await - let it load in the background so page renders quickly
        console.log('[Calendar] Loading saved optimization results...')
        loadSavedOptimization(schoolsToFetch, dateStr)
          .then(() => console.log('[Calendar] Optimization results loaded'))
          .catch(err => console.error('[Calendar] Error loading optimization:', err))
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, currentSchool, schoolsLength, authLoading, fallbackSchools.length])

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

            <div className="relative" ref={datePickerRef}>
              <button
                onClick={openDatePicker}
                className={`px-4 py-2 min-w-[250px] text-center font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${isToday ? 'text-brand' : 'text-gray-900'}`}
              >
                {dayOfWeek}, {dateDisplay}
                <svg className="w-4 h-4 inline-block ml-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 w-[300px]">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1))}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="font-semibold text-gray-900">
                      {MONTHS[pickerMonth.getMonth()]} {pickerMonth.getFullYear()}
                    </span>
                    <button
                      onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1))}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {getCalendarDays().map((date, idx) => (
                      <div key={idx}>
                        {date ? (
                          <button
                            onClick={() => selectDate(date)}
                            className={`w-full aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${
                              formatDate(date) === formatDate(currentDate)
                                ? 'bg-brand text-white font-semibold'
                                : formatDate(date) === formatDate(new Date())
                                ? 'bg-brand/10 text-brand font-semibold hover:bg-brand/20'
                                : 'hover:bg-gray-100 text-gray-900'
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        ) : (
                          <div className="w-full aspect-square" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => selectDate(new Date())}
                      className="flex-1 px-3 py-2 text-sm font-medium text-brand border border-brand rounded-lg hover:bg-brand/5"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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

      {/* ACTUAL SCENARIO - Regular schedule views */}
      {scenarioMode === 'actual' && (
        <>
          {/* Day View - Timeline Mode (Hour-based grid) */}
          {view === 'day' && dayViewMode === 'timeline' && (
            <div className="flex flex-col gap-6">
              {getScheduleWithBreaks().map((schedule) => (
                <SchoolTimelineCard
                  key={schedule.school.id}
                  schedule={schedule}
                  coverageSummary={optimizationResults.get(schedule.school.id)?.coverage_summary}
                />
              ))}
            </div>
          )}

          {/* Day View - Schedule Mode (Block-based) */}
          {view === 'day' && dayViewMode === 'schedule' && (
            <div className="flex flex-col gap-6">
              {getScheduleWithBreaks().map((schedule) => (
                <SchoolDayCard
                  key={schedule.school.id}
                  schedule={schedule}
                  formatTimeRange={formatTimeRange}
                  coverageSummary={optimizationResults.get(schedule.school.id)?.coverage_summary}
                />
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
          {/* Use schedules array order to maintain consistent school ordering */}
          {schedules.map((schedule) => {
            const result = minimalResults.get(schedule.school.id)
            if (!result) return null
            return (
              <MinimalScenarioCard
                key={schedule.school.id}
                result={result}
                getShortName={getShortName}
                coverageSummary={optimizationResults.get(schedule.school.id)?.coverage_summary}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// Timeline view - clean table layout with equal-width columns for readability
function SchoolTimelineCard({
  schedule,
  coverageSummary
}: {
  schedule: SchoolDaySchedule
  coverageSummary?: {
    total_teachers: number
    teachers_needed_peak: number
    teachers_needed_nap: number
    total_students_present?: number
  }
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
      {/* School Header with Coverage Summary */}
      <div className="bg-green-100 px-4 py-3 border-b border-green-200 print:bg-green-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {getShortName(schedule.school.name)}
          </h2>
          {coverageSummary && (
            <div className="flex items-center gap-6 text-sm">
              {coverageSummary.total_students_present !== undefined && (
                <div className="text-center" title="Students marked present for this date">
                  <span className="text-xl font-bold text-purple-600">{coverageSummary.total_students_present}</span>
                  <span className="text-gray-600 ml-1">Students</span>
                </div>
              )}
              <div className="text-center">
                <span className="text-xl font-bold text-brand">{coverageSummary.total_teachers}</span>
                <span className="text-gray-600 ml-1">Available</span>
              </div>
              <div className="text-center" title="Teachers needed based on student-to-teacher ratios at 10am">
                <span className="text-xl font-bold text-gray-700">{coverageSummary.teachers_needed_peak}</span>
                <span className="text-gray-600 ml-1">Peak Need</span>
              </div>
              <div className="text-center" title="Teachers needed during nap time (relaxed ratios)">
                <span className="text-xl font-bold text-blue-600">{coverageSummary.teachers_needed_nap}</span>
                <span className="text-gray-600 ml-1">Nap Time</span>
              </div>
              {coverageSummary.total_teachers > coverageSummary.teachers_needed_peak && (
                <div className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-medium">
                  +{coverageSummary.total_teachers - coverageSummary.teachers_needed_peak} buffer
                </div>
              )}
              {coverageSummary.total_teachers < coverageSummary.teachers_needed_peak && (
                <div className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-medium">
                  -{coverageSummary.teachers_needed_peak - coverageSummary.total_teachers} short
                </div>
              )}
            </div>
          )}
        </div>
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
                    {/* No coverage warning for breaks/lunch without substitute */}
                    {(block.type === 'break' || block.type === 'lunch') && !block.substitute_name && (
                      <div className="text-red-500 font-semibold text-xs mt-1">
                        No coverage
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
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-semibold">No coverage</span>
          <span className="text-gray-700">= No substitute available</span>
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
  formatTimeRange,
  coverageSummary
}: {
  schedule: SchoolDaySchedule
  formatTimeRange: (start: string, end: string) => string
  coverageSummary?: {
    total_teachers: number
    teachers_needed_peak: number
    teachers_needed_nap: number
    total_students_present?: number
  }
}) {
  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === "Little Seeds Children's Center") return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* School Header with Coverage Summary */}
      <div className="bg-green-100 px-4 py-3 border-b border-green-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {getShortName(schedule.school.name)}
          </h2>
          {coverageSummary && (
            <div className="flex items-center gap-6 text-sm">
              {coverageSummary.total_students_present !== undefined && (
                <div className="text-center" title="Students marked present for this date">
                  <span className="text-xl font-bold text-purple-600">{coverageSummary.total_students_present}</span>
                  <span className="text-gray-600 ml-1">Students</span>
                </div>
              )}
              <div className="text-center">
                <span className="text-xl font-bold text-brand">{coverageSummary.total_teachers}</span>
                <span className="text-gray-600 ml-1">Available</span>
              </div>
              <div className="text-center" title="Teachers needed based on student-to-teacher ratios at 10am">
                <span className="text-xl font-bold text-gray-700">{coverageSummary.teachers_needed_peak}</span>
                <span className="text-gray-600 ml-1">Peak Need</span>
              </div>
              <div className="text-center" title="Teachers needed during nap time (relaxed ratios)">
                <span className="text-xl font-bold text-blue-600">{coverageSummary.teachers_needed_nap}</span>
                <span className="text-gray-600 ml-1">Nap Time</span>
              </div>
              {coverageSummary.total_teachers > coverageSummary.teachers_needed_peak && (
                <div className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-medium">
                  +{coverageSummary.total_teachers - coverageSummary.teachers_needed_peak} buffer
                </div>
              )}
              {coverageSummary.total_teachers < coverageSummary.teachers_needed_peak && (
                <div className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-medium">
                  -{coverageSummary.teachers_needed_peak - coverageSummary.total_teachers} short
                </div>
              )}
            </div>
          )}
        </div>
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
                  {/* No coverage warning for breaks/lunch without substitute */}
                  {(block.type === 'break' || block.type === 'lunch') && !block.substitute_name && (
                    <div className="text-red-500 text-xs font-semibold">No coverage</div>
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
  getShortName,
  coverageSummary
}: {
  result: MinimalOptimizationResult
  getShortName: (name: string) => string
  coverageSummary?: {
    total_teachers: number
    teachers_needed_peak: number
    teachers_needed_nap: number
    total_students_present?: number
  }
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
      {/* School Header with coverage comparison */}
      <div className="bg-orange-100 px-4 py-3 border-b border-orange-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-lg font-bold text-gray-900">
            {getShortName(result.school_name)}
          </h2>
          <div className="flex items-center gap-6">
            {/* Current Staff */}
            <div className="text-center">
              <span className="text-2xl font-bold text-brand">{result.current_teachers}</span>
              <span className="text-xs text-gray-600 block">Available</span>
            </div>
            {/* Peak Need from ratios */}
            {coverageSummary && (
              <div className="text-center" title="Teachers needed based purely on student-to-teacher ratios">
                <span className="text-2xl font-bold text-gray-500">{coverageSummary.teachers_needed_peak}</span>
                <span className="text-xs text-gray-600 block">Peak Need</span>
              </div>
            )}
            {/* Minimal considering qualifications */}
            <div className="text-center" title="Minimum achievable considering teacher qualifications">
              <span className="text-2xl font-bold text-orange-600">{result.minimal_teachers_needed}</span>
              <span className="text-xs text-gray-600 block">Minimal</span>
            </div>
            {result.potential_savings > 0 && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                Save {result.potential_savings} position{result.potential_savings > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
        {/* Explanation */}
        <div className="mt-2 text-xs text-gray-600">
          <span className="font-medium">Peak Need</span> = teachers required by ratios alone.{' '}
          <span className="font-medium">Minimal</span> = achievable minimum considering qualifications (e.g., infant-certified teachers).
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
                      {/* Substitute info - highlighted */}
                      {block.sub_name && (
                        <div className="text-green-700 font-semibold text-xs mt-1">
                          {block.sub_name}
                        </div>
                      )}
                      {/* No coverage warning for breaks/lunch without substitute */}
                      {(block.type === 'break' || block.type === 'lunch') && !block.sub_name && (
                        <div className="text-red-500 font-semibold text-xs mt-1">
                          No coverage
                        </div>
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
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-6 text-xs">
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
        <div className="flex items-center gap-2">
          <span className="text-green-700 font-semibold">Green text</span>
          <span className="text-gray-700">= Substitute covering</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-semibold">No coverage</span>
          <span className="text-gray-700">= No substitute available</span>
        </div>
      </div>
    </div>
  )
}
