'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface AttendanceRecord {
  id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  check_in_time?: string
  notes?: string
}

interface StudentWithAttendance {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  attendance: AttendanceRecord | null
}

interface ClassroomAttendanceResponse {
  classroom: {
    id: string
    name: string
    school_id: string
    school: { id: string; name: string }
  }
  date: string
  students: StudentWithAttendance[]
  summary: {
    total: number
    present: number
    absent: number
    late: number
    excused: number
    not_recorded: number
  }
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

const statusColors: Record<AttendanceStatus | 'not_recorded', string> = {
  present: 'bg-green-100 text-green-700 border-green-200',
  late: 'bg-amber-100 text-amber-700 border-amber-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
  excused: 'bg-blue-100 text-blue-700 border-blue-200',
  not_recorded: 'bg-gray-100 text-gray-500 border-gray-200',
}

const statusLabels: Record<AttendanceStatus | 'not_recorded', string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
  not_recorded: 'Not Recorded',
}

export default function ClassroomAttendancePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const classroomId = params.id as string
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(dateParam)
  const [data, setData] = useState<ClassroomAttendanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/attendance?date=${date}`)
      if (res.ok) {
        const responseData = await res.json()
        setData(responseData)
      }
    } catch (error) {
      console.error('Error fetching classroom attendance:', error)
    } finally {
      setLoading(false)
    }
  }, [classroomId, date])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    // Update URL when date changes
    router.replace(`/dashboard/attendance/classroom/${classroomId}?date=${date}`)
  }, [date, classroomId, router])

  const updateAttendance = async (studentId: string, status: AttendanceStatus) => {
    if (!data) return

    setSaving(studentId)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          school_id: data.classroom.school_id,
          date,
          status,
          check_in_time: status === 'present' || status === 'late' ? new Date().toISOString() : null,
        }),
      })

      if (res.ok) {
        // Refresh data
        await fetchData()
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
    } finally {
      setSaving(null)
    }
  }

  const markAllPresent = async () => {
    if (!data) return

    const unrecordedStudents = data.students.filter(s => !s.attendance)
    if (unrecordedStudents.length === 0) return

    setSaving('all')
    try {
      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          records: unrecordedStudents.map(student => ({
            student_id: student.id,
            school_id: data.classroom.school_id,
            status: 'present',
            check_in_time: new Date().toISOString(),
          })),
        }),
      })

      if (res.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error bulk updating attendance:', error)
    } finally {
      setSaving(null)
    }
  }

  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === "Little Seeds Children's Center") return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Classroom not found</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/dashboard/attendance" className="hover:text-brand">
          Attendance
        </Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>{getShortName(data.classroom.school.name)}</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900">{data.classroom.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{data.classroom.name}</h1>
          <p className="text-gray-500 mt-1">{getShortName(data.classroom.school.name)}</p>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{data.summary.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{data.summary.present}</p>
          <p className="text-xs text-gray-500">Present</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{data.summary.late}</p>
          <p className="text-xs text-gray-500">Late</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{data.summary.absent}</p>
          <p className="text-xs text-gray-500">Absent</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{data.summary.excused}</p>
          <p className="text-xs text-gray-500">Excused</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{data.summary.not_recorded}</p>
          <p className="text-xs text-gray-500">Not Recorded</p>
        </div>
      </div>

      {/* Quick Actions */}
      {data.summary.not_recorded > 0 && (
        <div className="mb-6 flex gap-4">
          <button
            onClick={markAllPresent}
            disabled={saving === 'all'}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving === 'all' && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            Mark All Present
          </button>
        </div>
      )}

      {/* Students List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check-in Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.students.map((student) => {
              const currentStatus = student.attendance?.status || 'not_recorded'
              const isSaving = saving === student.id

              return (
                <tr key={student.id} className={isSaving ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-medium">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${statusColors[currentStatus]}`}>
                      {statusLabels[currentStatus]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.attendance?.check_in_time
                      ? new Date(student.attendance.check_in_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => updateAttendance(student.id, 'present')}
                        disabled={isSaving}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          currentStatus === 'present'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'text-green-600 border-green-200 hover:bg-green-50'
                        }`}
                      >
                        P
                      </button>
                      <button
                        onClick={() => updateAttendance(student.id, 'late')}
                        disabled={isSaving}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          currentStatus === 'late'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'text-amber-500 border-amber-200 hover:bg-amber-50'
                        }`}
                      >
                        L
                      </button>
                      <button
                        onClick={() => updateAttendance(student.id, 'absent')}
                        disabled={isSaving}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          currentStatus === 'absent'
                            ? 'bg-red-500 text-white border-red-500'
                            : 'text-red-500 border-red-200 hover:bg-red-50'
                        }`}
                      >
                        A
                      </button>
                      <button
                        onClick={() => updateAttendance(student.id, 'excused')}
                        disabled={isSaving}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          currentStatus === 'excused'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'text-blue-500 border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        E
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {data.students.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No students in this classroom</p>
          </div>
        )}
      </div>
    </div>
  )
}
