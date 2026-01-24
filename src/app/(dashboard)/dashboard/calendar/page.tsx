'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'

interface Shift {
  id: string
  school_id: string
  teacher_id: string
  classroom_id: string | null
  date: string
  start_time: string
  end_time: string
  status: string
  teacher: {
    id: string
    first_name: string
    last_name: string
    photo_url: string | null
  }
  classroom: {
    id: string
    name: string
  } | null
}

interface DaySchedule {
  date: string
  shifts: Shift[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarPage() {
  const { currentSchool, isOwner, loading: authLoading } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('week')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === "Little Seeds Children's Center") return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  // Get the start of the week (Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    return d
  }

  // Get the end of the week (Saturday)
  const getWeekEnd = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() + (6 - day))
    return d
  }

  // Get array of dates for the current week
  const getWeekDates = (date: Date) => {
    const start = getWeekStart(date)
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d)
    }
    return dates
  }

  // Format date for API
  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  useEffect(() => {
    const fetchShifts = async () => {
      if (authLoading) return
      setLoading(true)

      try {
        const weekStart = getWeekStart(currentDate)
        const weekEnd = getWeekEnd(currentDate)

        const params = new URLSearchParams({
          start_date: formatDate(weekStart),
          end_date: formatDate(weekEnd),
        })

        if (currentSchool) {
          params.set('school_id', currentSchool.id)
        }

        const res = await fetch(`/api/staff/shifts?${params}`)
        if (res.ok) {
          const data = await res.json()
          setShifts(data)
        }
      } catch (error) {
        console.error('Error fetching shifts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchShifts()
  }, [currentDate, currentSchool, authLoading])

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction * 7))
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const weekDates = getWeekDates(currentDate)
  const today = formatDate(new Date())

  // Group shifts by date
  const shiftsByDate = shifts.reduce((acc, shift) => {
    if (!acc[shift.date]) {
      acc[shift.date] = []
    }
    acc[shift.date].push(shift)
    return acc
  }, {} as Record<string, Shift[]>)

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
              onClick={() => setView('week')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="px-4 py-2 min-w-[200px] text-center">
              <span className="font-medium text-gray-900">
                {MONTHS[weekDates[0].getMonth()]} {weekDates[0].getDate()} - {weekDates[6].getDate()}, {weekDates[0].getFullYear()}
              </span>
            </div>

            <button
              onClick={() => navigateWeek(1)}
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

      {/* Week View */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDates.map((date, index) => {
            const dateStr = formatDate(date)
            const isToday = dateStr === today
            return (
              <div
                key={index}
                className={`p-4 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-brand/5' : ''}`}
              >
                <p className="text-sm text-gray-500">{DAYS[date.getDay()]}</p>
                <p className={`text-2xl font-bold ${isToday ? 'text-brand' : 'text-gray-900'}`}>
                  {date.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Day Content */}
        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDates.map((date, index) => {
            const dateStr = formatDate(date)
            const dayShifts = shiftsByDate[dateStr] || []
            const isToday = dateStr === today

            return (
              <div
                key={index}
                className={`p-2 border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-brand/5' : ''}`}
              >
                {dayShifts.length > 0 ? (
                  <div className="space-y-2">
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs"
                      >
                        <p className="font-medium text-blue-900 truncate">
                          {shift.teacher.first_name} {shift.teacher.last_name[0]}.
                        </p>
                        <p className="text-blue-600">
                          {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                        </p>
                        {shift.classroom && (
                          <p className="text-blue-500 truncate">{shift.classroom.name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-xs text-gray-400">No shifts</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend / Quick Stats */}
      <div className="mt-6 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
          <span className="text-gray-600">Scheduled Shift</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
          <span className="text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></div>
          <span className="text-gray-600">In Progress</span>
        </div>
      </div>

      {/* Empty state */}
      {shifts.length === 0 && !loading && (
        <div className="mt-8 text-center py-12 bg-white rounded-xl border border-gray-200">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No shifts scheduled for this week</p>
          <p className="text-sm text-gray-400 mt-1">Shifts can be created from the Staff page</p>
        </div>
      )}
    </div>
  )
}
