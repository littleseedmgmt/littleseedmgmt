import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Allow in development OR test mode
const isAllowed = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENV_MODE === 'test'

// POST /api/dev/migrate - Apply pending migrations
export async function POST() {
  if (!isAllowed) {
    return NextResponse.json({ error: 'Only available in development or test mode' }, { status: 403 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: string[] = []

    // Migration 1: Update Tam to floater with 7:45 start time
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: tamError } = await (supabase as any)
      .from('teachers')
      .update({
        role: 'floater',
        classroom_title: 'anywhere',
        regular_shift_start: '07:45'
      })
      .eq('first_name', 'Tam')
      .eq('last_name', 'Tran')

    if (tamError) {
      results.push(`Tam update failed: ${tamError.message}`)
    } else {
      results.push('Tam updated to floater, shift starts 7:45')
    }

    // Migration 2: Add playground_times setting if not exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingPlayground } = await (supabase as any)
      .from('school_settings')
      .select('id')
      .eq('setting_key', 'playground_times')
      .is('school_id', null)
      .single()

    if (!existingPlayground) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: playgroundError } = await (supabase as any)
        .from('school_settings')
        .insert({
          school_id: null,
          setting_key: 'playground_times',
          setting_value: {
            morning: { start: '09:30', end: '11:00', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] },
            afternoon: { start: '15:30', end: '16:30', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] }
          },
          description: 'Playground/outdoor times when classrooms with same ratio can be combined.'
        })

      if (playgroundError) {
        results.push(`Playground times failed: ${playgroundError.message}`)
      } else {
        results.push('Playground times setting added')
      }
    } else {
      results.push('Playground times setting already exists')
    }

    // Migration 3: Add circle_times setting if not exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingCircle } = await (supabase as any)
      .from('school_settings')
      .select('id')
      .eq('setting_key', 'circle_times')
      .is('school_id', null)
      .single()

    if (!existingCircle) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: circleError } = await (supabase as any)
        .from('school_settings')
        .insert({
          school_id: null,
          setting_key: 'circle_times',
          setting_value: [
            { start: '09:15', end: '09:30', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] },
            { start: '11:45', end: '12:00', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] },
            { start: '14:45', end: '15:00', age_groups: ['twos', 'threes', 'preschool', 'pre_k'] }
          ],
          description: 'Circle time periods when preschoolers are combined for stories/activities.'
        })

      if (circleError) {
        results.push(`Circle times failed: ${circleError.message}`)
      } else {
        results.push('Circle times setting added')
      }
    } else {
      results.push('Circle times setting already exists')
    }

    return NextResponse.json({
      success: true,
      message: 'Migrations applied',
      results
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
