import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { StudentCount, ScheduleChange } from '@/types/database'

interface ParsedSummary {
  student_counts: StudentCount[]
  teacher_absences: string[]
  schedule_changes: ScheduleChange[]
}

interface DirectorSummaryRecord {
  id: string
  school_id: string
  date: string
  student_counts: StudentCount[]
  teacher_absences: string[]
  schedule_changes: ScheduleChange[]
  raw_message: string
  submitted_by: string | null
  created_at: string
  updated_at: string
  schools?: { name: string }
}

interface SchoolRecord {
  id: string
  name: string
}

const systemPrompt = `You are parsing daily attendance messages from daycare directors.
Extract:
1. Student counts by age group with staffing (qualified teachers, aides)
2. Teacher absences (names of staff who are out)
3. Schedule changes (staff leaving early, arriving late, etc.)

Age groups to recognize and normalize to these exact values:
- "infant" for: infant, infants, babies, baby
- "toddler" for: toddler, toddlers
- "twos" for: 2s, 2yr, 2 yr, 2yr old, 2-year-old, twos, two year old
- "threes" for: 3s, 3yr, 3 yr, 3yr old, 3-year-old, threes, three year old
- "fours" for: 4s, 4yr, 4 yr, 4yr old, 4-year-old, fours, four year old, pre-k, prek, preschool

For staffing:
- "QT", "qualified", "qualified teacher" = qualified_teachers count
- "Aide", "Aid", "aide", "assistant" = aides count

Return JSON only, no explanation. Use this exact structure:
{
  "student_counts": [{"age_group": "infant", "count": 7, "qualified_teachers": 1, "aides": 1}],
  "teacher_absences": ["Name1", "Name2"],
  "schedule_changes": [{"name": "Name", "note": "leaving early at 1pm"}]
}`

// POST /api/director-summary - Parse message and save
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { school_id, date, raw_message, save = false } = body

    if (!school_id || !date || !raw_message) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, date, raw_message' },
        { status: 400 }
      )
    }

    // Verify user has access to this school
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', school_id)
      .single()

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found or access denied' }, { status: 403 })
    }

    const school = schoolData as SchoolRecord

    // Call Claude API to parse the message
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Parse this daycare attendance message:\n\n${raw_message}`,
        },
      ],
      system: systemPrompt,
    })

    // Extract the text response
    let responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Clean up response - remove markdown code blocks if present
    responseText = responseText.trim()
    if (responseText.startsWith('```json')) {
      responseText = responseText.slice(7)
    } else if (responseText.startsWith('```')) {
      responseText = responseText.slice(3)
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.slice(0, -3)
    }
    responseText = responseText.trim()

    let parsed: ParsedSummary
    try {
      parsed = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText)
      return NextResponse.json(
        { error: `Failed to parse Claude response as JSON: ${responseText.substring(0, 200)}` },
        { status: 500 }
      )
    }

    // Validate parsed structure
    if (!Array.isArray(parsed.student_counts)) {
      parsed.student_counts = []
    }
    if (!Array.isArray(parsed.teacher_absences)) {
      parsed.teacher_absences = []
    }
    if (!Array.isArray(parsed.schedule_changes)) {
      parsed.schedule_changes = []
    }

    // If save flag is true, upsert to database
    if (save) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseAny = supabase as any
      const { data: savedData, error: saveError } = await supabaseAny
        .from('director_daily_summaries')
        .upsert(
          {
            school_id,
            date,
            student_counts: parsed.student_counts,
            teacher_absences: parsed.teacher_absences,
            schedule_changes: parsed.schedule_changes,
            raw_message,
            submitted_by: user.id,
          },
          {
            onConflict: 'school_id,date',
          }
        )
        .select()
        .single()

      if (saveError) {
        return NextResponse.json({ error: saveError.message }, { status: 500 })
      }

      const savedSummary = savedData as DirectorSummaryRecord

      return NextResponse.json({
        ...parsed,
        id: savedSummary.id,
        saved: true,
        school_name: school.name,
      })
    }

    // Return parsed result without saving
    return NextResponse.json({
      ...parsed,
      saved: false,
      school_name: school.name,
    })
  } catch (error) {
    console.error('Error in POST /api/director-summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/director-summary - Retrieve existing summary
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const school_id = searchParams.get('school_id')
    const date = searchParams.get('date')

    if (!school_id || !date) {
      return NextResponse.json(
        { error: 'Missing required params: school_id, date' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any
    const { data: summaryData, error } = await supabaseAny
      .from('director_daily_summaries')
      .select('*, schools(name)')
      .eq('school_id', school_id)
      .eq('date', date)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json({ exists: false })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const summary = summaryData as DirectorSummaryRecord

    return NextResponse.json({
      exists: true,
      id: summary.id,
      school_id: summary.school_id,
      date: summary.date,
      student_counts: summary.student_counts,
      teacher_absences: summary.teacher_absences,
      schedule_changes: summary.schedule_changes,
      raw_message: summary.raw_message,
      submitted_by: summary.submitted_by,
      created_at: summary.created_at,
      updated_at: summary.updated_at,
      school_name: summary.schools?.name,
    })
  } catch (error) {
    console.error('Error in GET /api/director-summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
