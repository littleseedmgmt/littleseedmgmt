'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  lunch_break_start: string | null
  lunch_break_end: string | null
  status: string
  photo_url: string | null
  hire_date: string
  qualifications: string | null
  degrees: string | null
  years_experience: number | null
  pto_balance_vacation: number
  pto_balance_sick: number
  pto_balance_personal: number
  school: { id: string; name: string }
}

interface PTORequest {
  id: string
  start_date: string
  end_date: string
  type: string
  hours_requested: number
  status: string
  notes: string | null
  created_at: string
}

const roleLabels: Record<string, string> = {
  director: 'Director',
  assistant_director: 'Assistant Director',
  lead_teacher: 'Lead Teacher',
  teacher: 'Teacher',
  assistant: 'Assistant',
  floater: 'Floater',
}

const ptoTypeLabels: Record<string, string> = {
  vacation: 'Vacation',
  sick: 'Sick',
  personal: 'Personal',
  unpaid: 'Unpaid',
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function StaffProfilePage() {
  const params = useParams()
  const router = useRouter()
  const teacherId = params.id as string

  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [ptoHistory, setPtoHistory] = useState<PTORequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showPTOForm, setShowPTOForm] = useState(false)
  const [submittingPTO, setSubmittingPTO] = useState(false)

  // PTO Form state
  const [ptoForm, setPtoForm] = useState({
    start_date: '',
    end_date: '',
    type: 'vacation',
    hours_requested: 8,
    notes: '',
  })

  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === "Little Seeds Children's Center") return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [teacherRes, ptoRes] = await Promise.all([
          fetch(`/api/staff/${teacherId}`),
          fetch(`/api/pto?teacher_id=${teacherId}`)
        ])

        if (teacherRes.ok) {
          const teacherData = await teacherRes.json()
          setTeacher(teacherData)
        } else {
          router.push('/dashboard/staff')
          return
        }

        if (ptoRes.ok) {
          const ptoData = await ptoRes.json()
          setPtoHistory(ptoData)
        }
      } catch (error) {
        console.error('Error fetching staff profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [teacherId, router])

  const handleSubmitPTO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacher) return

    setSubmittingPTO(true)
    try {
      const res = await fetch('/api/pto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: teacher.school_id,
          teacher_id: teacher.id,
          ...ptoForm,
        }),
      })

      if (res.ok) {
        const newPTO = await res.json()
        setPtoHistory(prev => [newPTO, ...prev])
        setShowPTOForm(false)
        setPtoForm({
          start_date: '',
          end_date: '',
          type: 'vacation',
          hours_requested: 8,
          notes: '',
        })
      }
    } catch (error) {
      console.error('Error submitting PTO:', error)
    } finally {
      setSubmittingPTO(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Staff member not found</p>
      </div>
    )
  }

  const totalPTOBalance = (teacher.pto_balance_vacation || 0) +
                          (teacher.pto_balance_sick || 0) +
                          (teacher.pto_balance_personal || 0)

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/dashboard/staff" className="hover:text-brand">
          Staff
        </Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900">{teacher.first_name} {teacher.last_name}</span>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center text-brand text-3xl font-medium flex-shrink-0">
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
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {teacher.first_name} {teacher.last_name}
              </h1>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                teacher.status === 'active' ? 'bg-green-100 text-green-700' :
                teacher.status === 'on_leave' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {teacher.status === 'active' ? 'Active' :
                 teacher.status === 'on_leave' ? 'On Leave' : teacher.status}
              </span>
            </div>
            <p className="text-lg text-gray-600 mt-1">
              {roleLabels[teacher.role] || teacher.role}
              {teacher.classroom_title && ` - ${teacher.classroom_title}`}
            </p>
            <p className="text-gray-500">{getShortName(teacher.school.name)}</p>

            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              {teacher.email && (
                <a href={`mailto:${teacher.email}`} className="text-brand hover:underline">
                  {teacher.email}
                </a>
              )}
              {teacher.phone && (
                <span className="text-gray-600">{teacher.phone}</span>
              )}
              <span className="text-gray-500">
                Hired {new Date(teacher.hire_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Regular Schedule</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Shift</p>
                <p className="font-medium text-gray-900">
                  {teacher.regular_shift_start && teacher.regular_shift_end
                    ? `${teacher.regular_shift_start.slice(0, 5)} - ${teacher.regular_shift_end.slice(0, 5)}`
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lunch Break</p>
                <p className="font-medium text-gray-900">
                  {teacher.lunch_break_start && teacher.lunch_break_end
                    ? `${teacher.lunch_break_start.slice(0, 5)} - ${teacher.lunch_break_end.slice(0, 5)}`
                    : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* PTO History */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">PTO History</h2>
              <button
                onClick={() => setShowPTOForm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark"
              >
                Request PTO
              </button>
            </div>

            {ptoHistory.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {ptoHistory.map((pto) => (
                  <div key={pto.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{ptoTypeLabels[pto.type]}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(pto.start_date).toLocaleDateString()} - {new Date(pto.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">{pto.hours_requested}h</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[pto.status]}`}>
                        {pto.status.charAt(0).toUpperCase() + pto.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No PTO requests
              </div>
            )}
          </div>
        </div>

        {/* Right Column - PTO Balance */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">PTO Balance</h2>
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-brand">{totalPTOBalance}h</p>
              <p className="text-sm text-gray-500">Total Available</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Vacation</span>
                <span className="font-medium">{teacher.pto_balance_vacation || 0}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sick</span>
                <span className="font-medium">{teacher.pto_balance_sick || 0}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Personal</span>
                <span className="font-medium">{teacher.pto_balance_personal || 0}h</span>
              </div>
            </div>
          </div>

          {/* Qualifications */}
          {(teacher.qualifications || teacher.degrees || teacher.years_experience) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Qualifications</h2>
              <div className="space-y-3">
                {teacher.years_experience && (
                  <div>
                    <p className="text-sm text-gray-500">Experience</p>
                    <p className="font-medium">{teacher.years_experience} years</p>
                  </div>
                )}
                {teacher.degrees && (
                  <div>
                    <p className="text-sm text-gray-500">Education</p>
                    <p className="font-medium">{teacher.degrees}</p>
                  </div>
                )}
                {teacher.qualifications && (
                  <div>
                    <p className="text-sm text-gray-500">Certifications</p>
                    <p className="font-medium">{teacher.qualifications}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PTO Request Modal */}
      {showPTOForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Request PTO</h2>
            <form onSubmit={handleSubmitPTO} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={ptoForm.start_date}
                    onChange={(e) => setPtoForm(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={ptoForm.end_date}
                    onChange={(e) => setPtoForm(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={ptoForm.type}
                  onChange={(e) => setPtoForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick</option>
                  <option value="personal">Personal</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Requested</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={ptoForm.hours_requested}
                  onChange={(e) => setPtoForm(prev => ({ ...prev, hours_requested: parseFloat(e.target.value) }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={ptoForm.notes}
                  onChange={(e) => setPtoForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPTOForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPTO}
                  className="flex-1 px-4 py-2 text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-50"
                >
                  {submittingPTO ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
