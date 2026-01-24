import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/debug - Debug endpoint to check data
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    // Check user roles (bypassing RLS with service role would be needed for full check)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: roles, error: rolesError } = await (supabase as any)
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)

    // Check schools the user can see
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schools, error: schoolsError } = await (supabase as any)
      .from('schools')
      .select('id, name')

    // Check if user exists in users table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userRecord, error: userError } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      auth_user: {
        id: user.id,
        email: user.email,
      },
      user_record: userRecord || null,
      user_record_error: userError?.message || null,
      roles: roles || [],
      roles_error: rolesError?.message || null,
      schools: schools || [],
      schools_error: schoolsError?.message || null,
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
