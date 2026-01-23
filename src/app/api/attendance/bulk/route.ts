import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InsertTables } from '@/types/database'

interface BulkAttendanceRecord {
  student_id: string
  school_id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  check_in_time?: string
  notes?: string
}

// POST /api/attendance/bulk - Bulk create/update attendance records
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, records } = body as { date: string; records: BulkAttendanceRecord[] }

    if (!date || !records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: date, records (array)' },
        { status: 400 }
      )
    }

    // Prepare records with date and recorded_by
    const attendanceRecords = records.map(record => ({
      student_id: record.student_id,
      school_id: record.school_id,
      status: record.status,
      check_in_time: record.check_in_time || null,
      notes: record.notes || null,
      date,
      recorded_by: user.id,
    }))

    // Upsert all records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('attendance')
      .upsert(attendanceRecords as any, {
        onConflict: 'student_id,date',
      })
      .select()

    if (error) {
      console.error('Error bulk creating attendance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully recorded attendance for ${data?.length || 0} students`,
      count: data?.length || 0,
      data,
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/attendance/bulk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
