import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/schools - List all active schools
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (error) {
      console.error('Error fetching schools:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/schools:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
