'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Student {
  id: string
  school_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  classroom_id: string | null
  guardian_name: string
  guardian_phone: string | null
  status: string
  classroom?: {
    id: string
    name: string
  }
  school: {
    id: string
    name: string
  }
}

interface Classroom {
  id: string
  name: string
  school_id: string
}

export default function StudentsPage() {
  const { schools, currentSchool, isOwner, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClassroom, setSelectedClassroom] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const getShortName = (name: string) => {
    if (name === 'Peter Pan Mariner Square') return 'Mariner Square'
    if (name === "Little Seeds Children's Center") return 'Little Seeds'
    if (name === 'Peter Pan Harbor Bay') return 'Harbor Bay'
    return name
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let years = today.getFullYear() - birthDate.getFullYear()
    let months = today.getMonth() - birthDate.getMonth()

    if (months < 0) {
      years--
      months += 12
    }

    if (years === 0) {
      return `${months}mo`
    }
    return `${years}y ${months}mo`
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

        const [studentsRes, classroomsRes] = await Promise.all([
          fetch(`/api/students?${params}`),
          fetch(`/api/classrooms?${params}`)
        ])

        if (studentsRes.ok) {
          const data = await studentsRes.json()
          setStudents(data)
        }

        if (classroomsRes.ok) {
          const data = await classroomsRes.json()
          setClassrooms(data)
        }
      } catch (error) {
        console.error('Error fetching students:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentSchool, authLoading])

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesClassroom = !selectedClassroom || student.classroom_id === selectedClassroom
    const matchesSearch = !searchQuery ||
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.guardian_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesClassroom && matchesSearch
  })

  // Group by school for owner view
  const studentsBySchool = filteredStudents.reduce((acc, student) => {
    const schoolId = student.school_id
    if (!acc[schoolId]) {
      acc[schoolId] = {
        school: student.school,
        students: []
      }
    }
    acc[schoolId].students.push(student)
    return acc
  }, {} as Record<string, { school: { id: string; name: string }; students: Student[] }>)

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
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 mt-1">
            {isOwner && !currentSchool ? 'All Schools' : currentSchool?.name || 'Select a school'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search students or guardians..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </div>
        <select
          value={selectedClassroom}
          onChange={(e) => setSelectedClassroom(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
        >
          <option value="">All Classrooms</option>
          {classrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{filteredStudents.length}</p>
          <p className="text-sm text-gray-500">Total Students</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">
            {filteredStudents.filter(s => s.status === 'enrolled').length}
          </p>
          <p className="text-sm text-gray-500">Enrolled</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-amber-500">
            {filteredStudents.filter(s => s.status === 'on_leave').length}
          </p>
          <p className="text-sm text-gray-500">On Leave</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-400">
            {filteredStudents.filter(s => s.status === 'withdrawn' || s.status === 'graduated').length}
          </p>
          <p className="text-sm text-gray-500">Withdrawn/Graduated</p>
        </div>
      </div>

      {/* Student List */}
      {Object.values(studentsBySchool).map(({ school, students: schoolStudents }) => (
        <div key={school.id} className="mb-8">
          {(isOwner && !currentSchool) && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{getShortName(school.name)}</h2>
              <span className="text-sm text-gray-500">({schoolStudents.length} students)</span>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Classroom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guardian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schoolStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {calculateAge(student.date_of_birth)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.classroom?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{student.guardian_name}</p>
                      {student.guardian_phone && (
                        <p className="text-xs text-gray-500">{student.guardian_phone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        student.status === 'enrolled' ? 'bg-green-100 text-green-700' :
                        student.status === 'on_leave' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {schoolStudents.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No students found
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {filteredStudents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-gray-500">No students found</p>
        </div>
      )}
    </div>
  )
}
