'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useComponentPerf } from '@/contexts/PerfContext'
import { perfFetch } from '@/lib/perf'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { StudentCount, ScheduleChange, School } from '@/types/database'

interface DirectorSummaryData {
  student_counts: StudentCount[]
  qualified_teachers: number
  aides: number
  teacher_absences: string[]
  schedule_changes: { name: string; note: string }[]
  updated_at: string
}

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
  data_source?: 'director_summary' | 'attendance_system'
  director_summary?: DirectorSummaryData
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

interface ParsedSummary {
  student_counts: StudentCount[]
  teacher_absences: string[]
  schedule_changes: ScheduleChange[]
  saved?: boolean
  school_name?: string
}

export default function AttendancePage() {
  const { schools, currentSchool, isOwner, loading: authLoading } = useAuth()
  const { markDataReady } = useComponentPerf('AttendancePage')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState<AttendanceSummaryResponse | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)

  // Director Summary Modal State
  const [showImportModal, setShowImportModal] = useState(false)
  const [importSchoolId, setImportSchoolId] = useState('')
  const [importDate, setImportDate] = useState(() => new Date().toISOString().split('T')[0])
  const [importMessage, setImportMessage] = useState('')
  const [parsedSummary, setParsedSummary] = useState<ParsedSummary | null>(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importError, setImportError] = useState('')

  const handleParse = async () => {
    if (!importSchoolId || !importMessage.trim()) {
      setImportError('Please select a school and enter a message')
      return
    }

    setParsing(true)
    setImportError('')
    setParsedSummary(null)

    try {
      const res = await fetch('/api/director-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: importSchoolId,
          date: importDate,
          raw_message: importMessage,
          save: false,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse message')
      }

      setParsedSummary(data)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to parse message')
    } finally {
      setParsing(false)
    }
  }

  const handleSave = async () => {
    if (!importSchoolId || !importMessage.trim()) return

    setSaving(true)
    setImportError('')

    try {
      const res = await fetch('/api/director-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: importSchoolId,
          date: importDate,
          raw_message: importMessage,
          save: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save summary')
      }

      setParsedSummary({ ...data, saved: true })
      // Close modal after short delay to show success
      setTimeout(() => {
        setShowImportModal(false)
        resetImportModal()
      }, 1500)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to save summary')
    } finally {
      setSaving(false)
    }
  }

  const resetImportModal = () => {
    setImportSchoolId('')
    setImportDate(new Date().toISOString().split('T')[0])
    setImportMessage('')
    setParsedSummary(null)
    setImportError('')
  }

  const openImportModal = () => {
    resetImportModal()
    // Pre-select current school if viewing a specific school
    if (currentSchool) {
      setImportSchoolId(currentSchool.id)
    } else if (schools.length === 1) {
      setImportSchoolId(schools[0].id)
    }
    setImportDate(date) // Use the currently selected date
    setShowImportModal(true)
  }

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
          perfFetch(`/api/attendance/summary?${params}`),
          perfFetch(`/api/classrooms?${currentSchool ? `school_id=${currentSchool.id}` : ''}`)
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
        markDataReady()
      }
    }

    fetchData()
  }, [date, currentSchool, authLoading, markDataReady])

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

        {/* Date Picker and Import Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={openImportModal}
            className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand/90 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Director Summary
          </button>

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
        <>
          {/* Student Stats */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
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

          {/* Aggregated Staff Status */}
          {(() => {
            const allAbsences: { school: string; names: string[] }[] = []
            const allScheduleChanges: { school: string; changes: { name: string; note: string }[] }[] = []
            let totalQT = 0
            let totalAides = 0

            summary.schools.forEach((s) => {
              if (s.director_summary) {
                totalQT += s.director_summary.qualified_teachers
                totalAides += s.director_summary.aides
                if (s.director_summary.teacher_absences.length > 0) {
                  allAbsences.push({ school: getShortName(s.school_name), names: s.director_summary.teacher_absences })
                }
                if (s.director_summary.schedule_changes.length > 0) {
                  allScheduleChanges.push({ school: getShortName(s.school_name), changes: s.director_summary.schedule_changes })
                }
              }
            })

            const hasStaffData = totalQT > 0 || totalAides > 0 || allAbsences.length > 0 || allScheduleChanges.length > 0

            if (!hasStaffData) return null

            return (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-900">Staff Status Today</h3>
                  {(totalQT > 0 || totalAides > 0) && (
                    <span className="ml-auto text-sm text-gray-600">
                      <span className="font-medium text-green-600">{totalQT + totalAides}</span> on duty
                      <span className="text-gray-400 mx-1">|</span>
                      {totalQT} QT, {totalAides} Aides
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  {/* Absences */}
                  {allAbsences.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-red-600 uppercase whitespace-nowrap pt-0.5">Out:</span>
                      <div className="flex flex-wrap gap-1">
                        {allAbsences.map((a, idx) => (
                          a.names.map((name, nIdx) => (
                            <span
                              key={`${idx}-${nIdx}`}
                              className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium"
                            >
                              {name} <span className="text-red-400">({a.school})</span>
                            </span>
                          ))
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schedule Changes */}
                  {allScheduleChanges.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-amber-600 uppercase whitespace-nowrap pt-0.5">Notes:</span>
                      <div className="flex flex-wrap gap-1">
                        {allScheduleChanges.map((s, idx) => (
                          s.changes.map((change, cIdx) => (
                            <span
                              key={`${idx}-${cIdx}`}
                              className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium"
                            >
                              {change.name}: {change.note} <span className="text-amber-500">({s.school})</span>
                            </span>
                          ))
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </>
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

              {/* Staff Status Section - Compact view from Director Summary */}
              {schoolSummary.data_source === 'director_summary' && schoolSummary.director_summary && (
                <div className="px-4 pb-4">
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-start gap-6 flex-wrap">
                      {/* Staff On Duty */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {schoolSummary.director_summary.qualified_teachers + schoolSummary.director_summary.aides} Staff
                          </p>
                          <p className="text-xs text-gray-500">
                            {schoolSummary.director_summary.qualified_teachers} QT, {schoolSummary.director_summary.aides} Aides
                          </p>
                        </div>
                      </div>

                      {/* Staff Absences */}
                      {schoolSummary.director_summary.teacher_absences.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 uppercase">Out:</span>
                          <div className="flex flex-wrap gap-1">
                            {schoolSummary.director_summary.teacher_absences.map((name, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Schedule Changes */}
                      {schoolSummary.director_summary.schedule_changes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 uppercase">Notes:</span>
                          <div className="flex flex-wrap gap-1">
                            {schoolSummary.director_summary.schedule_changes.map((change, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium"
                              >
                                {change.name}: {change.note}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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

      {/* Import Director Summary Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Import Director Summary</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* School Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                <select
                  value={importSchoolId}
                  onChange={(e) => setImportSchoolId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="">Select a school...</option>
                  {summary?.schools.map((school) => (
                    <option key={school.school_id} value={school.school_id}>
                      {school.school_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Message from Director
                </label>
                <textarea
                  value={importMessage}
                  onChange={(e) => setImportMessage(e.target.value)}
                  placeholder="Paste the director's message here..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none font-mono text-sm"
                />
              </div>

              {/* Error Message */}
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {importError}
                </div>
              )}

              {/* Parse Button */}
              {!parsedSummary && (
                <button
                  onClick={handleParse}
                  disabled={parsing || !importSchoolId || !importMessage.trim()}
                  className="w-full px-4 py-2 text-white bg-brand rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {parsing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Parsing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Parse Message
                    </>
                  )}
                </button>
              )}

              {/* Parsed Results Preview */}
              {parsedSummary && (
                <div className="space-y-4">
                  {parsedSummary.saved && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Summary saved successfully!
                    </div>
                  )}

                  {/* Student Counts */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Student Counts</h3>
                    {parsedSummary.student_counts.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">Age Group</th>
                              <th className="px-3 py-2 text-center font-medium text-gray-600">Students</th>
                              <th className="px-3 py-2 text-center font-medium text-gray-600">QT</th>
                              <th className="px-3 py-2 text-center font-medium text-gray-600">Aides</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {parsedSummary.student_counts.map((count, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 capitalize">{count.age_group}</td>
                                <td className="px-3 py-2 text-center font-semibold">{count.count}</td>
                                <td className="px-3 py-2 text-center">{count.qualified_teachers}</td>
                                <td className="px-3 py-2 text-center">{count.aides}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50 font-medium">
                            <tr>
                              <td className="px-3 py-2">Total</td>
                              <td className="px-3 py-2 text-center">
                                {parsedSummary.student_counts.reduce((sum, c) => sum + c.count, 0)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {parsedSummary.student_counts.reduce((sum, c) => sum + c.qualified_teachers, 0)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {parsedSummary.student_counts.reduce((sum, c) => sum + c.aides, 0)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No student counts found</p>
                    )}
                  </div>

                  {/* Teacher Absences */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Staff Absences</h3>
                    {parsedSummary.teacher_absences.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {parsedSummary.teacher_absences.map((name, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No absences reported</p>
                    )}
                  </div>

                  {/* Schedule Changes */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Schedule Changes</h3>
                    {parsedSummary.schedule_changes.length > 0 ? (
                      <div className="space-y-2">
                        {parsedSummary.schedule_changes.map((change, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm"
                          >
                            <span className="font-medium">{change.name}:</span> {change.note}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No schedule changes reported</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {!parsedSummary.saved && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setParsedSummary(null)}
                        className="flex-1 px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        Re-parse
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save Summary
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
