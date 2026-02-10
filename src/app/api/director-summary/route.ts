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

// Common teacher nicknames -> canonical first names
// Used to resolve informal names in WhatsApp messages
const TEACHER_NICKNAMES: Record<string, string> = {
  'izzy': 'Isabel',
  'liz': 'Elizabeth',
  'beth': 'Elizabeth',
  'mike': 'Michael',
  'chris': 'Christina',
  'tina': 'Christina',
  'jen': 'Jennifer',
  'jenny': 'Jennifer',
  'bob': 'Robert',
  'rob': 'Robert',
  'sam': 'Samantha',
  'dan': 'Daniel',
  'danny': 'Daniel',
  'tom': 'Thomas',
  'tommy': 'Thomas',
  'nick': 'Nicholas',
  'alex': 'Alexander',
  'pat': 'Patricia',
  'kate': 'Katherine',
  'katie': 'Katherine',
  'sue': 'Susan',
  'suzy': 'Susan',
  'meg': 'Megan',
  'deb': 'Deborah',
  'debbie': 'Deborah',
}

const getSystemPrompt = (directorName: string | null, teacherNames: string[] | null) => `You are parsing daily attendance messages from daycare directors.
Extract:
1. Student counts by age group with staffing (qualified teachers, aides)
2. Teacher absences (names of staff who are out)
3. Schedule changes (staff leaving early, arriving late, etc.)

IMPORTANT: ${directorName ? `The director sending this message is "${directorName}". If the message contains "I" referring to the director (e.g., "I leave early", "I'll be out", "I come in late"), replace "I" with "${directorName}" in the schedule_changes.` : 'If "I" is used without a name, use "Director" as the name.'}

${teacherNames ? `Known teacher names at this school: ${teacherNames.join(', ')}. If the message uses nicknames or short forms (e.g., "Izzy" for "Isabel", "Chris" for "Christina"), always map to the official name from this list.` : ''}

Age groups to recognize and normalize to these exact database values:
- "infant" for: infant, infants, babies, baby, ladybugs
- "toddler" for: toddler, toddlers
- "twos" for: 2s, 2yr, 2 yr, 2yr old, 2-year-old, twos, two year old, grasshopper, grasshoppers
- "threes" for: 3s, 3yr, 3 yr, 3yr old, 3-year-old, threes, three year old, butterflies
- "pre_k" for: 4s, 4yr, 4 yr, 4yr old, 4-year-old, fours, four year old, pre-k, prek, preschool, dragonflies

For staffing:
- "QT", "qualified", "qualified teacher", "staff" = qualified_teachers count
- "Aide", "Aid", "aide", "assistant" = aides count
- IMPORTANT: When the message says just a number followed by "staff" (e.g., "3 staff"), treat that as qualified_teachers count

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

    // Look up the director and all teacher names for this school
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any
    const [directorResult, teacherNamesResult] = await Promise.all([
      supabaseAny
        .from('teachers')
        .select('first_name, last_name')
        .eq('school_id', school_id)
        .eq('role', 'director')
        .eq('status', 'active')
        .single(),
      supabaseAny
        .from('teachers')
        .select('first_name')
        .eq('school_id', school_id)
        .eq('status', 'active')
    ])

    const directorData = directorResult.data
    const directorName = directorData
      ? `${directorData.first_name} ${directorData.last_name}`
      : null

    // Get all teacher first names for nickname resolution in the prompt
    const teacherNames: string[] = (teacherNamesResult.data || []).map((t: { first_name: string }) => t.first_name)

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
      system: getSystemPrompt(directorName, teacherNames),
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

    // Post-process: resolve any remaining nicknames to canonical teacher names
    // This catches cases Claude didn't resolve via the prompt
    const resolveNickname = (name: string): string => {
      const lower = name.toLowerCase().trim()
      // Check hardcoded nickname map
      const canonical = TEACHER_NICKNAMES[lower]
      if (canonical) {
        // Verify this canonical name exists in the school's teachers
        if (teacherNames.some(tn => tn.toLowerCase() === canonical.toLowerCase())) {
          return canonical
        }
      }
      return name // Return as-is if no match
    }

    parsed.teacher_absences = parsed.teacher_absences.map(resolveNickname)
    parsed.schedule_changes = parsed.schedule_changes.map(change => ({
      ...change,
      name: resolveNickname(change.name)
    }))

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
