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
  classroomName: string | null
): TimeBlock[] {
  const segments: TimeBlock[] = []

  // Collect all break periods with their times
  const breaks: { start: string; end: string; type: 'break' | 'lunch' }[] = []

  if (break1Start && break1End) {
    breaks.push({ start: break1Start, end: break1End, type: 'break' })
  }
  if (lunchStart && lunchEnd) {
    breaks.push({ start: lunchStart, end: lunchEnd, type: 'lunch' })
  }
  if (break2Start && break2End) {
    breaks.push({ start: break2Start, end: break2End, type: 'break' })
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
      type: brk.type
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

// Hour slots for timeline view (7am to 6pm)
const HOUR_SLOTS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

type DayViewMode = 'schedule' | 'timeline'

export default function CalendarPage() {
  const { schools, currentSchool, isOwner, loading: authLoading } = useAuth()
  const { markDataReady } = useComponentPerf('CalendarPage')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week'>('day')
  const [dayViewMode, setDayViewMode] = useState<DayViewMode>('timeline')
  const [schedules, setSchedules] = useState<SchoolDaySchedule[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    console.log('[Calendar] useEffect triggered:', { authLoading, schoolsCount: schools.length, currentSchool: currentSchool?.name })

    // Don't fetch until auth is ready
    if (authLoading) {
      console.log('[Calendar] Waiting for auth...')
      return
    }

    const fetchSchedules = async () => {
      const schoolsToFetch = currentSchool ? [currentSchool] : schools
      console.log('[Calendar] fetchSchedules called, schoolsToFetch:', schoolsToFetch.length)

      // If no schools available yet, stop loading
      if (!schoolsToFetch || schoolsToFetch.length === 0) {
        console.log('[Calendar] No schools available, showing empty state')
        setSchedules([])
        setLoading(false)
        markDataReady()
        return
      }

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
  }, [currentDate, currentSchool, schools, authLoading])

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
          </div>
        </div>
      </div>

      {/* Day View - Timeline Mode (Hour-based grid) */}
      {view === 'day' && dayViewMode === 'timeline' && (
        <div className="flex flex-col gap-6">
          {schedules.map((schedule) => (
            <SchoolTimelineCard key={schedule.school.id} schedule={schedule} />
          ))}
        </div>
      )}

      {/* Day View - Schedule Mode (Block-based) */}
      {view === 'day' && dayViewMode === 'schedule' && (
        <div className="flex flex-col gap-6">
          {schedules.map((schedule) => (
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
      {schedules.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No schedules available</p>
          <p className="text-sm text-gray-400 mt-1">Staff schedules will appear here once created</p>
        </div>
      )}
    </div>
  )
}

// Timeline view - shows hour-by-hour grid like a spreadsheet
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

  // Convert time string to decimal hour (e.g., "09:30" -> 9.5)
  const timeToDecimal = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours + (minutes || 0) / 60
  }

  // Format hour for display
  const formatHour = (hour: number): string => {
    if (hour === 12) return '12'
    if (hour > 12) return `${hour - 12}`
    return `${hour}`
  }

  // Format time for display in cells
  const formatTimeShort = (time: string): string => {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const m = minutes || '00'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return m === '00' ? `${hour}` : `${hour}:${m}`
  }

  // Calculate the column span and position for a time block
  const getBlockStyle = (startTime: string, endTime: string) => {
    const startHour = timeToDecimal(startTime)
    const endHour = timeToDecimal(endTime)
    const startOffset = Math.max(0, startHour - 7) // Start from 7am
    const duration = endHour - startHour

    // Each hour is ~60px wide
    const hourWidth = 60
    const left = startOffset * hourWidth
    const width = duration * hourWidth

    return {
      left: `${left}px`,
      width: `${Math.max(width, 50)}px`, // Minimum 50px width
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* School Header */}
      <div className="bg-green-100 px-4 py-2 border-b border-green-200">
        <h2 className="text-base font-semibold text-gray-900 text-center">
          {getShortName(schedule.school.name)}
        </h2>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Hour Headers */}
          <div className="flex border-b border-gray-300">
            {/* Staff name column header */}
            <div className="w-[80px] min-w-[80px] px-2 py-1 bg-gray-50 border-r border-gray-300 text-xs font-medium text-gray-500">
              Staff
            </div>
            {/* Hour columns */}
            {HOUR_SLOTS.map((hour) => (
              <div
                key={hour}
                className="w-[60px] min-w-[60px] px-1 py-1 text-center text-xs font-medium text-gray-500 border-r border-gray-200 bg-gray-50"
              >
                {formatHour(hour)}
                <span className="text-gray-400 ml-0.5">{hour < 12 ? 'am' : 'pm'}</span>
              </div>
            ))}
          </div>

          {/* Staff Rows */}
          {schedule.staff.map((staffSchedule, staffIdx) => (
            <div
              key={staffSchedule.teacher.id}
              className={`flex ${staffIdx > 0 ? 'border-t border-gray-200' : ''}`}
            >
              {/* Staff Name */}
              <div className="w-[80px] min-w-[80px] px-2 py-2 font-medium text-xs text-gray-900 border-r border-gray-300 bg-white flex items-start">
                {staffSchedule.teacher.first_name}
              </div>

              {/* Timeline area with blocks */}
              <div className="flex-1 relative" style={{ height: 'auto', minHeight: '50px' }}>
                {/* Hour grid lines */}
                <div className="absolute inset-0 flex">
                  {HOUR_SLOTS.map((hour) => (
                    <div
                      key={hour}
                      className="w-[60px] min-w-[60px] border-r border-gray-100 h-full"
                    />
                  ))}
                </div>

                {/* Time blocks positioned absolutely */}
                <div className="relative py-1 flex flex-wrap gap-y-1">
                  {staffSchedule.blocks.map((block, idx) => {
                    const style = getBlockStyle(block.start_time, block.end_time)
                    return (
                      <div
                        key={idx}
                        className={`absolute top-1 px-1 py-0.5 text-xs border rounded ${
                          block.type === 'break' ? 'bg-yellow-100 border-yellow-400' :
                          block.type === 'lunch' ? 'bg-blue-100 border-blue-400' :
                          'bg-green-50 border-green-300'
                        }`}
                        style={{
                          left: style.left,
                          width: style.width,
                          minWidth: '50px',
                        }}
                      >
                        <div className="font-medium text-gray-900 truncate">
                          {formatTimeShort(block.start_time)} - {formatTimeShort(block.end_time)}
                        </div>
                        {block.classroom_name && (
                          <div className="text-gray-700 truncate text-[10px]">
                            {block.classroom_name}
                          </div>
                        )}
                        {block.notes && (
                          <div className={`truncate text-[10px] font-medium ${
                            block.type === 'break' ? 'text-yellow-700' :
                            block.type === 'lunch' ? 'text-blue-700' :
                            'text-gray-500'
                          }`}>
                            {block.notes}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
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

// Schedule view - shows blocks in a flowing table layout
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

  // Get background and text colors for each block type
  const getBlockStyles = (type: 'work' | 'break' | 'lunch') => {
    switch (type) {
      case 'break':
        return 'bg-yellow-100 border-yellow-300'
      case 'lunch':
        return 'bg-blue-100 border-blue-300'
      default:
        return 'bg-white border-gray-200'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* School Header */}
      <div className="bg-green-100 px-4 py-3 border-b border-green-200">
        <h2 className="text-lg font-semibold text-gray-900 text-center">
          {getShortName(schedule.school.name)}
        </h2>
      </div>

      {/* Schedule Table - Spreadsheet Style */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <tbody>
            {schedule.staff.map((staffSchedule, staffIdx) => (
              <tr key={staffSchedule.teacher.id} className={staffIdx > 0 ? 'border-t-2 border-gray-300' : ''}>
                {/* Staff Name Cell */}
                <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap border-r-2 border-gray-300 bg-gray-50 align-middle min-w-[100px] w-[100px]">
                  {staffSchedule.teacher.first_name}
                </td>

                {/* Time Blocks as individual cells */}
                {staffSchedule.blocks.map((block, idx) => (
                  <td
                    key={idx}
                    className={`px-3 py-2 border-r border-gray-200 align-top min-w-[120px] ${getBlockStyles(block.type)}`}
                  >
                    {/* Time Range */}
                    <div className="font-semibold text-gray-900 whitespace-nowrap">
                      {formatTimeRange(block.start_time, block.end_time)}
                    </div>
                    {/* Room/Activity - Second Row */}
                    {block.classroom_name && (
                      <div className="text-gray-700 mt-1 text-xs">
                        {block.classroom_name}
                      </div>
                    )}
                    {/* Notes/Break label - Third Row */}
                    {block.notes && (
                      <div className={`mt-1 text-xs font-medium ${
                        block.type === 'break' ? 'text-yellow-700' :
                        block.type === 'lunch' ? 'text-blue-700' :
                        'text-gray-500'
                      }`}>
                        {block.notes}
                      </div>
                    )}
                  </td>
                ))}

                {/* Fill remaining space */}
                <td className="bg-white"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span className="text-gray-600">Break</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-gray-600">Lunch</span>
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
