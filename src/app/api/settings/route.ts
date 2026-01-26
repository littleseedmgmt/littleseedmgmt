import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface SettingRecord {
  id: string
  school_id: string | null
  setting_key: string
  setting_value: Record<string, unknown>
  description: string | null
}

// GET /api/settings - Get all settings (global + school-specific)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const schoolId = searchParams.get('school_id')
    const settingKey = searchParams.get('key')

    // Get global settings (school_id IS NULL) and school-specific settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('school_settings')
      .select('*')
      .order('setting_key')

    if (settingKey) {
      query = query.eq('setting_key', settingKey)
    }

    // Get global settings OR school-specific settings
    if (schoolId) {
      query = query.or(`school_id.is.null,school_id.eq.${schoolId}`)
    } else {
      query = query.is('school_id', null)
    }

    const { data, error } = await query

    if (error) {
      // If table doesn't exist, return default settings
      if (error.message?.includes('school_settings') || error.code === '42P01') {
        console.warn('school_settings table not found, returning defaults')
        return NextResponse.json([
          {
            id: 'default-ratio-normal',
            school_id: null,
            setting_key: 'ratio_normal',
            setting_value: { infant: 4, toddler: 4, twos: 12, threes: 12, preschool: 12, pre_k: 12 },
            description: 'Normal teacher-to-student ratios'
          },
          {
            id: 'default-ratio-naptime',
            school_id: null,
            setting_key: 'ratio_naptime',
            setting_value: { infant: 12, toddler: 12, twos: 24, threes: 24, preschool: 24, pre_k: 24 },
            description: 'Naptime teacher-to-student ratios'
          },
          {
            id: 'default-break-settings',
            school_id: null,
            setting_key: 'break_settings',
            setting_value: { break_duration_minutes: 10, breaks_per_shift: 2, break1_window: 'morning', break2_window: 'afternoon' },
            description: 'Teacher break settings'
          }
        ])
      }
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Merge settings: school-specific overrides global
    const settingsMap = new Map<string, SettingRecord>()

    // First add global settings
    for (const setting of (data || []) as SettingRecord[]) {
      if (setting.school_id === null) {
        settingsMap.set(setting.setting_key, setting)
      }
    }

    // Then override with school-specific
    for (const setting of (data || []) as SettingRecord[]) {
      if (setting.school_id !== null) {
        settingsMap.set(setting.setting_key, setting)
      }
    }

    return NextResponse.json(Array.from(settingsMap.values()))
  } catch (error) {
    console.error('Error in GET /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/settings - Update a setting
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { setting_key, setting_value, school_id, description } = body

    if (!setting_key || setting_value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: setting_key, setting_value' },
        { status: 400 }
      )
    }

    // Upsert the setting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('school_settings')
      .upsert({
        school_id: school_id || null,
        setting_key,
        setting_value,
        description,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'school_id,setting_key'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating setting:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
