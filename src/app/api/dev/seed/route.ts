import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Only allow in development
const isDev = process.env.NODE_ENV === 'development'

// POST /api/dev/seed - Generate test data
export async function POST() {
  if (!isDev) {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all schools
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schools } = await (supabase as any).from('schools').select('id')

    // Get all enrolled students
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: students } = await (supabase as any)
      .from('students')
      .select('id, school_id')
      .eq('status', 'enrolled')

    // Get all active teachers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teachers } = await (supabase as any)
      .from('teachers')
      .select('id, school_id, regular_shift_start, regular_shift_end')
      .eq('status', 'active')

    // Get classrooms
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: classrooms } = await (supabase as any)
      .from('classrooms')
      .select('id, school_id')

    if (!students || !teachers) {
      return NextResponse.json({ error: 'No students or teachers found' }, { status: 400 })
    }

    const results = {
      attendance: 0,
      shifts: 0,
      pto: 0,
    }

    // Generate attendance for past 14 days (weekdays only)
    const today = new Date()
    for (let i = 14; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      // Skip weekends
      const dayOfWeek = date.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) continue

      const dateStr = date.toISOString().split('T')[0]

      for (const student of students) {
        // Random attendance: 85% present, 5% late, 5% absent, 5% excused
        const rand = Math.random()
        let status: string
        let checkInTime: string | null = null

        if (rand < 0.85) {
          status = 'present'
          const hour = 7 + Math.floor(Math.random() * 1.5)
          const min = Math.floor(Math.random() * 60)
          checkInTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`
        } else if (rand < 0.90) {
          status = 'late'
          const hour = 8 + Math.floor(Math.random() * 1.5)
          const min = Math.floor(Math.random() * 60)
          checkInTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`
        } else if (rand < 0.95) {
          status = 'absent'
        } else {
          status = 'excused'
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('attendance')
          .upsert({
            school_id: student.school_id,
            student_id: student.id,
            date: dateStr,
            status,
            check_in_time: checkInTime,
            recorded_by: user.id,
          }, { onConflict: 'student_id,date' })

        if (!error) results.attendance++
      }
    }

    // Generate shifts for current week
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday

    for (let i = 0; i < 5; i++) { // Mon-Fri
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      for (const teacher of teachers) {
        // Get a random classroom from their school
        const schoolClassrooms = classrooms.filter((c: { school_id: string }) => c.school_id === teacher.school_id)
        const classroom = schoolClassrooms[Math.floor(Math.random() * schoolClassrooms.length)]

        let status = 'scheduled'
        if (date < today) status = 'completed'
        else if (dateStr === today.toISOString().split('T')[0]) status = 'in_progress'

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('shifts')
          .insert({
            school_id: teacher.school_id,
            teacher_id: teacher.id,
            classroom_id: classroom?.id,
            date: dateStr,
            start_time: teacher.regular_shift_start || '08:00:00',
            end_time: teacher.regular_shift_end || '17:00:00',
            status,
            shift_type: 'regular',
          })

        if (!error) results.shifts++
      }
    }

    // Generate some PTO requests
    const ptoTypes = ['vacation', 'sick', 'personal']
    const ptoStatuses = ['pending', 'pending', 'pending', 'approved', 'rejected'] // More pending

    for (let i = 0; i < 10; i++) {
      const teacher = teachers[Math.floor(Math.random() * teachers.length)]
      const ptoType = ptoTypes[Math.floor(Math.random() * ptoTypes.length)]
      const ptoStatus = ptoStatuses[Math.floor(Math.random() * ptoStatuses.length)]
      const daysAhead = Math.floor(Math.random() * 30)
      const startDate = new Date(today)
      startDate.setDate(today.getDate() + daysAhead)
      const hours = Math.random() < 0.5 ? 8 : 16

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('pto_requests')
        .insert({
          school_id: teacher.school_id,
          teacher_id: teacher.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: startDate.toISOString().split('T')[0],
          type: ptoType,
          hours_requested: hours,
          status: ptoStatus,
          notes: ptoType === 'vacation' ? 'Family vacation' : ptoType === 'sick' ? 'Not feeling well' : 'Personal appointment',
        })

      if (!error) results.pto++
    }

    // Update PTO balances for all teachers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('teachers')
      .update({
        pto_balance_vacation: 80,
        pto_balance_sick: 40,
        pto_balance_personal: 16,
      })
      .eq('status', 'active')

    return NextResponse.json({
      success: true,
      message: 'Test data generated',
      results,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// DELETE /api/dev/seed - Clear test data
export async function DELETE() {
  if (!isDev) {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear transactional data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('pto_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Reset PTO balances
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('teachers')
      .update({
        pto_balance_vacation: 80,
        pto_balance_sick: 40,
        pto_balance_personal: 16,
      })
      .eq('status', 'active')

    return NextResponse.json({
      success: true,
      message: 'Test data cleared',
    })
  } catch (error) {
    console.error('Clear error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
