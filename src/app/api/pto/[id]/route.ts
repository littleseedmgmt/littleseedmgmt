import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface PTOStatusRecord {
  status: string
}

// GET /api/pto/[id] - Get single PTO request
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
      .from('pto_requests')
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, photo_url, email),
        school:schools(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching PTO request:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/pto/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/pto/[id] - Update PTO request (approve/reject)
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
    const { status, notes } = body

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status

      // If approving, set approved_by and approved_at
      if (status === 'approved') {
        updateData.approved_by = user.id
        updateData.approved_at = new Date().toISOString()
        // Note: PTO balance deduction can be added via a database trigger or RPC function
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('pto_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, photo_url),
        school:schools(id, name)
      `)
      .single()

    if (error) {
      console.error('Error updating PTO request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/pto/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/pto/[id] - Delete/cancel PTO request
export async function DELETE(
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

    // Only allow deleting pending requests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ptoData, error: fetchError } = await (supabase as any)
      .from('pto_requests')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !ptoData) {
      return NextResponse.json({ error: fetchError?.message || 'Not found' }, { status: 404 })
    }

    const pto = ptoData as PTOStatusRecord

    if (pto.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only delete pending PTO requests' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('pto_requests')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting PTO request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'PTO request deleted' })
  } catch (error) {
    console.error('Error in DELETE /api/pto/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
