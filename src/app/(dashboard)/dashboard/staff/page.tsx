'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Teacher {
  id: string
  school_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  role: string
  classroom_title: string | null
  regular_shift_start: string | null
  regular_shift_end: string | null
  status: string
  photo_url: string | null
  hire_date: string
  school: { id: string; name: string }
}

interface PTORequest {
  id: string
  school_id: string
  teacher_id: string
  start_date: string
  end_date: string
  type: string
  hours_requested: number
  status: string
  notes: string | null
  created_at: string
  teacher: {
    id: string
    first_name: string
    last_name: string
    photo_url: string | null
  }
  school: { id: string; name: string }
}

interface SchoolStaffStats {
  school: { id: string; name: string }
  total: number
  active: number
  onLeave: number
  teachers: Teacher[]
  pendingPTO: number
}

const roleLabels: Record<string, string> = {
  director: 'Director',
  assistant_director: 'Asst. Director',
  lead_teacher: 'Lead Teacher',
  teacher: 'Teacher',
  assistant: 'Assistant',
  floater: 'Floater',
}

const roleColors: Record<string, string> = {
  director: 'bg-purple-100 text-purple-700',
  assistant_director: 'bg-purple-50 text-purple-600',
  lead_teacher: 'bg-blue-100 text-blue-700',
  teacher: 'bg-green-100 text-green-700',
  assistant: 'bg-amber-100 text-amber-700',
  floater: 'bg-gray-100 text-gray-700',
}

const ptoTypeLabels: Record<string, string> = {
  vacation: 'Vacation',
  sick: 'Sick',
  personal: 'Personal',
  unpaid: 'Unpaid',
}

export default function StaffPage() {
  const { currentSchool, isOwner, schools, loading: authLoading } = useAuth()

  // Show multi-school view if user has access to multiple schools and none is selected
  const showMultiSchoolView = (isOwner || schools.length > 1) && !currentSchool
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [pendingPTO, setPendingPTO] = useState<PTORequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingPTO, setProcessingPTO] = useState<string | null>(null)
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null)

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
        const params = new URLSearchParams()
        if (currentSchool) {
          params.set('school_id', currentSchool.id)
        }

        const [staffRes, ptoRes] = await Promise.all([
          fetch(`/api/staff?${params}`),
          fetch(`/api/pto?status=pending&${params}`)
        ])

        if (staffRes.ok) {
          const staffData = await staffRes.json()
          setTeachers(staffData)
        }

        if (ptoRes.ok) {
          const ptoData = await ptoRes.json()
          setPendingPTO(ptoData)
        }
      } catch (error) {
        console.error('Error fetching staff data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentSchool, authLoading])

  const handlePTOAction = async (ptoId: string, action: 'approved' | 'rejected') => {
    setProcessingPTO(ptoId)
    try {
      const res = await fetch(`/api/pto/${ptoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      })

      if (res.ok) {
        setPendingPTO(prev => prev.filter(p => p.id !== ptoId))
      }
    } catch (error) {
      console.error('Error processing PTO:', error)
    } finally {
      setProcessingPTO(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    )
  }

  // Group teachers by school with stats
  const schoolStats: SchoolStaffStats[] = Object.values(
    teachers.reduce((acc, teacher) => {
      const schoolId = teacher.school_id
      if (!acc[schoolId]) {
        acc[schoolId] = {
          school: teacher.school,
          total: 0,
          active: 0,
          onLeave: 0,
          teachers: [],
          pendingPTO: pendingPTO.filter(p => p.school_id === schoolId).length
        }
      }
      acc[schoolId].total++
      if (teacher.status === 'active') acc[schoolId].active++
      if (teacher.status === 'on_leave') acc[schoolId].onLeave++
      acc[schoolId].teachers.push(teacher)
      return acc
    }, {} as Record<string, SchoolStaffStats>)
  )

  // Stats totals
  const activeTeachers = teachers.filter(t => t.status === 'active').length
  const onLeave = teachers.filter(t => t.status === 'on_leave').length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 mt-1">
            {showMultiSchoolView ? 'All Schools' : currentSchool?.name || 'Select a school'}
          </p>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{teachers.length}</p>
          <p className="text-sm text-gray-500">Total Staff</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{activeTeachers}</p>
          <p className="text-sm text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-amber-500">{onLeave}</p>
          <p className="text-sm text-gray-500">On Leave</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{pendingPTO.length}</p>
          <p className="text-sm text-gray-500">Pending PTO</p>
        </div>
      </div>

      {/* Pending PTO Requests */}
      {pendingPTO.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 mb-8 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-amber-50">
            <h2 className="text-lg font-semibold text-gray-900">Pending PTO Requests</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingPTO.map((pto) => (
              <div key={pto.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-medium">
                    {pto.teacher.first_name[0]}{pto.teacher.last_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {pto.teacher.first_name} {pto.teacher.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {ptoTypeLabels[pto.type]} - {pto.hours_requested}h
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(pto.start_date).toLocaleDateString()} - {new Date(pto.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">{getShortName(pto.school.name)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePTOAction(pto.id, 'approved')}
                      disabled={processingPTO === pto.id}
                      className="px-3 py-1 text-sm font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handlePTOAction(pto.id, 'rejected')}
                      disabled={processingPTO === pto.id}
                      className="px-3 py-1 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* School Cards (for owner viewing all schools) */}
      {showMultiSchoolView && schoolStats.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Schools Overview</h2>
          {schoolStats.map(({ school, total, active, onLeave: schoolOnLeave, teachers: schoolTeachers, pendingPTO: schoolPendingPTO }) => (
            <div key={school.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* School Header - Clickable */}
              <button
                onClick={() => setExpandedSchool(expandedSchool === school.id ? null : school.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">{getShortName(school.name)}</h3>
                    <p className="text-sm text-gray-500">{total} staff</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{total}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{active}</p>
                      <p className="text-xs text-gray-500">Active</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-500">{schoolOnLeave}</p>
                      <p className="text-xs text-gray-500">On Leave</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">{schoolPendingPTO}</p>
                      <p className="text-xs text-gray-500">Pending PTO</p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedSchool === school.id ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Staff Grid */}
              {expandedSchool === school.id && (
                <div className="border-t border-gray-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {schoolTeachers.map((teacher) => (
                      <Link
                        key={teacher.id}
                        href={`/dashboard/staff/${teacher.id}`}
                        className="bg-gray-50 rounded-xl border border-gray-200 p-4 hover:border-brand transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center text-brand text-lg font-medium flex-shrink-0">
                            {teacher.photo_url ? (
                              <img
                                src={teacher.photo_url}
                                alt={`${teacher.first_name} ${teacher.last_name}`}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              `${teacher.first_name[0]}${teacher.last_name[0]}`
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {teacher.first_name} {teacher.last_name}
                            </p>
                            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${roleColors[teacher.role] || 'bg-gray-100 text-gray-700'}`}>
                              {roleLabels[teacher.role] || teacher.role}
                            </span>
                            {teacher.classroom_title && (
                              <p className="text-sm text-gray-500 mt-1 truncate">{teacher.classroom_title}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Single School View (Director or Owner with school selected) */}
      {!showMultiSchoolView && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teachers.map((teacher) => (
            <Link
              key={teacher.id}
              href={`/dashboard/staff/${teacher.id}`}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-brand transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xl font-medium flex-shrink-0">
                  {teacher.photo_url ? (
                    <img
                      src={teacher.photo_url}
                      alt={`${teacher.first_name} ${teacher.last_name}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    `${teacher.first_name[0]}${teacher.last_name[0]}`
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {teacher.first_name} {teacher.last_name}
                  </p>
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${roleColors[teacher.role] || 'bg-gray-100 text-gray-700'}`}>
                    {roleLabels[teacher.role] || teacher.role}
                  </span>
                  {teacher.classroom_title && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{teacher.classroom_title}</p>
                  )}
                  {teacher.regular_shift_start && teacher.regular_shift_end && (
                    <p className="text-xs text-gray-400 mt-1">
                      {teacher.regular_shift_start.slice(0, 5)} - {teacher.regular_shift_end.slice(0, 5)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {teachers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500">No staff members found</p>
        </div>
      )}
    </div>
  )
}
