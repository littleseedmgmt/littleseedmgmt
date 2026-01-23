'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SchoolSummary {
  school_id: string
  school_name: string
  date: string
  total_students: number
  present: number
  absent: number
  late: number
  excused: number
  not_recorded: number
  attendance_rate: number
}

interface AttendanceSummaryResponse {
  date: string
  schools: SchoolSummary[]
  totals: {
    total_students: number
    present: number
    absent: number
    late: number
    excused: number
    not_recorded: number
    attendance_rate: number
  }
}

interface Classroom {
  id: string
  name: string
  school_id: string
  school: { id: string; name: string }
}

export default function AttendancePage() {
  const { schools, currentSchool, isOwner, loading: authLoading } = useAuth()
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState<AttendanceSummaryResponse | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)

  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === "Little Seeds Children's Center") return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return
      setLoading(true)

      try {
        // Build URL with query params
        const params = new URLSearchParams({ date })
        if (currentSchool) {
          params.set('school_id', currentSchool.id)
        }

        // Fetch summary and classrooms in parallel
        const [summaryRes, classroomsRes] = await Promise.all([
          fetch(`/api/attendance/summary?${params}`),
          fetch(`/api/classrooms?${currentSchool ? `school_id=${currentSchool.id}` : ''}`)
        ])

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          setSummary(summaryData)
        }

        if (classroomsRes.ok) {
          const classroomsData = await classroomsRes.json()
          setClassrooms(classroomsData)
        }
      } catch (error) {
        console.error('Error fetching attendance data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [date, currentSchool, authLoading])

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">
            {isOwner && !currentSchool ? 'All Schools' : currentSchool?.name || 'Select a school'}
          </p>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const d = new Date(date)
              d.setDate(d.getDate() - 1)
              setDate(d.toISOString().split('T')[0])
            }}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
          />

          <button
            onClick={() => {
              const d = new Date(date)
              d.setDate(d.getDate() + 1)
              setDate(d.toISOString().split('T')[0])
            }}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => setDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 text-sm font-medium text-brand border border-brand rounded-lg hover:bg-brand/5"
          >
            Today
          </button>
        </div>
      </div>

      {/* Organization Totals (Owner viewing all) */}
      {isOwner && !currentSchool && summary && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{summary.totals.total_students}</p>
            <p className="text-sm text-gray-500">Total Students</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{summary.totals.present}</p>
            <p className="text-sm text-gray-500">Present</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{summary.totals.late}</p>
            <p className="text-sm text-gray-500">Late</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{summary.totals.absent}</p>
            <p className="text-sm text-gray-500">Absent</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{summary.totals.excused}</p>
            <p className="text-sm text-gray-500">Excused</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-brand">{summary.totals.attendance_rate}%</p>
            <p className="text-sm text-gray-500">Rate</p>
          </div>
        </div>
      )}

      {/* Schools Breakdown (for owner viewing all) or Single School View */}
      {summary && summary.schools.map((schoolSummary) => {
        const schoolClassrooms = classrooms.filter(c => c.school_id === schoolSummary.school_id)

        return (
          <div key={schoolSummary.school_id} className="mb-8">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* School Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {getShortName(schoolSummary.school_name)}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {schoolSummary.total_students} students
                    </p>
                  </div>
                </div>

                {/* School Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{schoolSummary.present}</p>
                    <p className="text-xs text-gray-500">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">{schoolSummary.late}</p>
                    <p className="text-xs text-gray-500">Late</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{schoolSummary.absent}</p>
                    <p className="text-xs text-gray-500">Absent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-400">{schoolSummary.not_recorded}</p>
                    <p className="text-xs text-gray-500">Not Recorded</p>
                  </div>
                  <div className="text-center px-4 py-2 bg-brand/10 rounded-lg">
                    <p className="text-2xl font-bold text-brand">{schoolSummary.attendance_rate}%</p>
                    <p className="text-xs text-gray-500">Rate</p>
                  </div>
                </div>
              </div>

              {/* Classrooms List */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Classrooms</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {schoolClassrooms.map((classroom) => (
                    <Link
                      key={classroom.id}
                      href={`/dashboard/attendance/classroom/${classroom.id}?date=${date}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{classroom.name}</p>
                        <p className="text-sm text-gray-500">View attendance</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Empty State */}
      {(!summary || summary.schools.length === 0) && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500">No attendance data for this date</p>
        </div>
      )}
    </div>
  )
}
