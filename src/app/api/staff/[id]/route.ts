import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface TeacherDetail {
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

// GET /api/staff/[id] - Get single teacher details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        *,
        school:schools(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching teacher:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(data as unknown as TeacherDetail)
  } catch (error) {
    console.error('Error in GET /api/staff/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/staff/[id] - Update teacher
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Only allow updating certain fields
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone',
      'role', 'classroom_title', 'regular_shift_start', 'regular_shift_end',
      'lunch_break_start', 'lunch_break_end', 'status', 'photo_url',
      'qualifications', 'degrees', 'years_experience'
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('teachers')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        school:schools(id, name)
      `)
      .single()

    if (error) {
      console.error('Error updating teacher:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/staff/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
