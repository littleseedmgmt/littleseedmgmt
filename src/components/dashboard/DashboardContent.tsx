'use client'

import { useAuth } from '@/contexts/AuthContext'
import { School } from '@/types/database'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface SchoolStats {
  studentCount: number
  teacherCount: number
  presentToday: number
  pendingPTO: number
}

interface StatsState {
  [schoolId: string]: SchoolStats
}

function SchoolCard({ school, stats, expanded = false }: { school: School; stats: SchoolStats; expanded?: boolean }) {
  // Shorten school names for display
  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === 'Little Seeds Children\'s Center') return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${expanded ? 'p-6' : 'p-4'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{getShortName(school.name)}</h3>
            <p className="text-sm text-gray-500">{school.city}, {school.state}</p>
          </div>
        </div>
        <Link
          href={`/dashboard?school=${school.id}`}
          className="text-sm text-brand hover:text-brand-dark font-medium"
        >
          View Details
        </Link>
      </div>

      <div className={`grid ${expanded ? 'grid-cols-4' : 'grid-cols-2'} gap-4`}>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{stats.studentCount}</p>
          <p className="text-sm text-gray-500">Students</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-brand">{stats.presentToday}</p>
          <p className="text-sm text-gray-500">Present</p>
        </div>
        {expanded && (
          <>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{stats.teacherCount}</p>
              <p className="text-sm text-gray-500">Teachers</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-500">{stats.pendingPTO}</p>
              <p className="text-sm text-gray-500">Pending PTO</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function DashboardContent() {
  const { schools, currentSchool, isOwner, loading } = useAuth()
  const [stats, setStats] = useState<StatsState>({})
  const [totals, setTotals] = useState<SchoolStats>({
    studentCount: 0,
    teacherCount: 0,
    presentToday: 0,
    pendingPTO: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const todayISO = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function fetchStats() {
      if (schools.length === 0) {
        setStatsLoading(false)
        return
      }

      try {
        // Fetch all data in parallel for better performance
        const schoolPromises = schools.map(async (school) => {
          const [studentsRes, teachersRes, attendanceRes, ptoRes] = await Promise.all([
            fetch(`/api/students?school_id=${school.id}&status=enrolled`),
            fetch(`/api/staff?school_id=${school.id}&status=active`),
            fetch(`/api/attendance/summary?date=${todayISO}&school_id=${school.id}`),
            fetch(`/api/pto?school_id=${school.id}&status=pending`),
          ])

          const [students, teachers, attendanceData, ptoData] = await Promise.all([
            studentsRes.json(),
            teachersRes.json(),
            attendanceRes.json(),
            ptoRes.json(),
          ])

          return {
            schoolId: school.id,
            studentCount: Array.isArray(students) ? students.length : 0,
            teacherCount: Array.isArray(teachers) ? teachers.length : 0,
            presentToday: attendanceData?.schools?.[0]?.present || 0,
            pendingPTO: Array.isArray(ptoData) ? ptoData.length : 0,
          }
        })

        const results = await Promise.all(schoolPromises)

        const schoolStats: StatsState = {}
        let totalStudents = 0
        let totalPresent = 0
        let totalTeachers = 0
        let totalPendingPTO = 0

        for (const result of results) {
          schoolStats[result.schoolId] = {
            studentCount: result.studentCount,
            teacherCount: result.teacherCount,
            presentToday: result.presentToday,
            pendingPTO: result.pendingPTO,
          }
          totalStudents += result.studentCount
          totalPresent += result.presentToday
          totalTeachers += result.teacherCount
          totalPendingPTO += result.pendingPTO
        }

        setStats(schoolStats)
        setTotals({
          studentCount: totalStudents,
          teacherCount: totalTeachers,
          presentToday: totalPresent,
          pendingPTO: totalPendingPTO,
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    if (!loading) {
      fetchStats()
    }
  }, [schools, loading, todayISO])

  if (loading || statsLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    )
  }

  const getSchoolStats = (schoolId: string): SchoolStats => {
    return stats[schoolId] || { studentCount: 0, teacherCount: 0, presentToday: 0, pendingPTO: 0 }
  }

  // Owner viewing all schools (stacked view)
  if (isOwner && !currentSchool) {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">{today}</p>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Total Students</p>
            <p className="text-4xl font-bold text-gray-900">{totals.studentCount}</p>
            <p className="text-xs text-gray-400 mt-2">Across all schools</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Present Today</p>
            <p className="text-4xl font-bold text-brand">{totals.presentToday}</p>
            <p className="text-xs text-gray-400 mt-2">Organization-wide</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Teachers On Duty</p>
            <p className="text-4xl font-bold text-gray-900">{totals.teacherCount}</p>
            <p className="text-xs text-gray-400 mt-2">Active today</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Pending PTO</p>
            <p className="text-4xl font-bold text-amber-500">{totals.pendingPTO}</p>
            <p className="text-xs text-gray-400 mt-2">Awaiting approval</p>
          </div>
        </div>

        {/* Stacked School Cards */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Schools Overview</h2>
          {schools.map((school) => (
            <SchoolCard key={school.id} school={school} stats={getSchoolStats(school.id)} expanded />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/dashboard/attendance" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-brand transition-colors">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">View Attendance</p>
                <p className="text-xs text-gray-500">All schools</p>
              </div>
            </Link>

            <Link href="/dashboard/calendar" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-brand transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">View Schedules</p>
                <p className="text-xs text-gray-500">All schools</p>
              </div>
            </Link>

            <Link href="/dashboard/staff" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-brand transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Approve PTO</p>
                <p className="text-xs text-gray-500">Pending requests</p>
              </div>
            </Link>

            <button className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-brand transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Generate Report</p>
                <p className="text-xs text-gray-500">Export data</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Single school view (Director or Owner with school selected)
  const school = currentSchool || schools[0]

  if (!school) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No school data available.</p>
      </div>
    )
  }

  const schoolStats = getSchoolStats(school.id)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{school.name}</h1>
        <p className="text-gray-500 mt-1">{today}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Total Students</p>
          <p className="text-4xl font-bold text-gray-900">{schoolStats.studentCount}</p>
          <p className="text-xs text-gray-400 mt-2">Enrolled</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Present Today</p>
          <p className="text-4xl font-bold text-brand">{schoolStats.presentToday}</p>
          <p className="text-xs text-gray-400 mt-2">Checked in</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Teachers On Duty</p>
          <p className="text-4xl font-bold text-gray-900">{schoolStats.teacherCount}</p>
          <p className="text-xs text-gray-400 mt-2">Active today</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Pending PTO</p>
          <p className="text-4xl font-bold text-amber-500">{schoolStats.pendingPTO}</p>
          <p className="text-xs text-gray-400 mt-2">Awaiting approval</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/dashboard/attendance" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-brand transition-colors">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Record Attendance</p>
              <p className="text-xs text-gray-500">Mark check-ins</p>
            </div>
          </Link>

          <Link href="/dashboard/calendar" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-brand transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">View Schedule</p>
              <p className="text-xs text-gray-500">Teacher assignments</p>
            </div>
          </Link>

          <Link href="/dashboard/staff" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-brand transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Approve PTO</p>
              <p className="text-xs text-gray-500">Pending requests</p>
            </div>
          </Link>

          <button className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-brand transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Generate Report</p>
              <p className="text-xs text-gray-500">Export data</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
