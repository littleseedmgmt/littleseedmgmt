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
    const fetchSchedules = async () => {
      const schoolsToFetch = currentSchool ? [currentSchool] : schools

      // If no schools available yet, stop loading
      if (!schoolsToFetch || schoolsToFetch.length === 0) {
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
              }
            } catch { staff = [] }

            try {
              if (shiftsRes.ok) {
                const shiftsData = await shiftsRes.json()
                shifts = Array.isArray(shiftsData) ? shiftsData : []
              }
            } catch { shifts = [] }

            try {
              if (classroomsRes.ok) {
                const classroomsData = await classroomsRes.json()
                classrooms = Array.isArray(classroomsData) ? classroomsData : []
              }
            } catch { classrooms = [] }

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

                const blocks: TimeBlock[] = []

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
                  // Main work block
                  blocks.push({
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    classroom_name: shift.classroom_id ? classroomMap.get(shift.classroom_id) || shift.classroom?.name || null : teacher.classroom_title,
                    notes: shift.notes,
                    type: 'work'
                  })

                  // Break blocks
                  if (shift.break1_start && shift.break1_end) {
                    blocks.push({
                      start_time: shift.break1_start,
                      end_time: shift.break1_end,
                      classroom_name: null,
                      notes: 'Break',
                      type: 'break'
                    })
                  }

                  if (shift.lunch_start && shift.lunch_end) {
                    blocks.push({
                      start_time: shift.lunch_start,
                      end_time: shift.lunch_end,
                      classroom_name: null,
                      notes: 'Lunch',
                      type: 'lunch'
                    })
                  }

                  if (shift.break2_start && shift.break2_end) {
                    blocks.push({
                      start_time: shift.break2_start,
                      end_time: shift.break2_end,
                      classroom_name: null,
                      notes: 'Break',
                      type: 'break'
                    })
                  }
                })

                // If no shifts, use regular shift times from teacher profile
                if (blocks.length === 0 && teacher.regular_shift_start && teacher.regular_shift_end) {
                  blocks.push({
                    start_time: teacher.regular_shift_start,
                    end_time: teacher.regular_shift_end,
                    classroom_name: teacher.classroom_title,
                    notes: null,
                    type: 'work'
                  })
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
        setSchedules(results)
      } catch (error) {
        console.error('Error fetching schedules:', error)
        setSchedules([])
      } finally {
        setLoading(false)
        markDataReady()
      }
    }

    fetchSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, currentSchool, schools])

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
        <div className={`grid gap-6 ${
          schedules.length === 1 ? 'grid-cols-1' :
          schedules.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
          'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
        }`}>
          {schedules.map((schedule) => (
            <SchoolTimelineCard key={schedule.school.id} schedule={schedule} />
          ))}
        </div>
      )}

      {/* Day View - Schedule Mode (Block-based) */}
      {view === 'day' && dayViewMode === 'schedule' && (
        <div className={`grid gap-6 ${
          schedules.length === 1 ? 'grid-cols-1' :
          schedules.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
          'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
        }`}>
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
                          block.type === 'break' ? 'bg-amber-50 border-amber-300' :
                          block.type === 'lunch' ? 'bg-orange-50 border-orange-300' :
                          'bg-blue-50 border-blue-200'
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
                          <div className="text-gray-600 truncate text-[10px]">
                            {block.classroom_name}
                          </div>
                        )}
                        {block.notes && (
                          <div className="text-gray-500 truncate text-[10px]">
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* School Header */}
      <div className="bg-green-100 px-4 py-2 border-b border-green-200">
        <h2 className="text-base font-semibold text-gray-900 text-center">
          {getShortName(schedule.school.name)}
        </h2>
      </div>

      {/* Schedule Table - Spreadsheet Style */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <tbody>
            {schedule.staff.map((staffSchedule, staffIdx) => (
              <tr key={staffSchedule.teacher.id} className={staffIdx > 0 ? 'border-t border-gray-300' : ''}>
                {/* Staff Name Cell */}
                <td className="px-2 py-1 font-medium text-gray-900 whitespace-nowrap border-r border-gray-300 bg-white align-top min-w-[70px] w-[70px]">
                  {staffSchedule.teacher.first_name}
                </td>

                {/* Time Blocks as individual cells */}
                {staffSchedule.blocks.map((block, idx) => (
                  <td
                    key={idx}
                    className={`px-2 py-1 border-r border-gray-200 align-top min-w-[90px] ${
                      block.type === 'break' ? 'bg-amber-50' :
                      block.type === 'lunch' ? 'bg-orange-50' : 'bg-white'
                    }`}
                  >
                    {/* Time Range */}
                    <div className="font-medium text-gray-900 whitespace-nowrap">
                      {formatTimeRange(block.start_time, block.end_time)}
                    </div>
                    {/* Room/Activity - Second Row */}
                    {block.classroom_name && (
                      <div className="text-gray-600 mt-0.5">
                        {block.classroom_name}
                      </div>
                    )}
                    {/* Notes - Third Row */}
                    {block.notes && (
                      <div className="text-gray-500 mt-0.5">
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

      {/* Empty state for school */}
      {schedule.staff.length === 0 && (
        <div className="p-6 text-center text-gray-500 text-sm">
          No staff schedules for this day
        </div>
      )}
    </div>
  )
}
