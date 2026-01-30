#!/usr/bin/env node
// Script to update Harbor Bay data:
// 1. Transfer Aura Batres from Mariner Square to Harbor Bay
// 2. Update lunch times to match super optimized schedule
// Run with: node scripts/update-harbor-bay.mjs

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  // Get school IDs
  const { data: schools } = await supabase.from('schools').select('id, name')
  const marinerSquare = schools?.find(s => s.name.includes('Mariner Square'))
  const harborBay = schools?.find(s => s.name.includes('Harbor Bay'))

  if (!marinerSquare || !harborBay) {
    console.error('Could not find school IDs')
    console.log('Schools found:', schools)
    process.exit(1)
  }

  console.log('Mariner Square ID:', marinerSquare.id)
  console.log('Harbor Bay ID:', harborBay.id)

  // 1. Transfer Aura Batres to Harbor Bay
  console.log('\n--- Transferring Aura Batres to Harbor Bay ---')
  const { data: aura, error: auraError } = await supabase
    .from('teachers')
    .update({
      school_id: harborBay.id,
      role: 'teacher',
      regular_shift_start: '10:00',
      regular_shift_end: '17:00',
      lunch_break_start: '13:30',
      lunch_break_end: '14:30',
      classroom_title: null,
    })
    .eq('first_name', 'Aura')
    .eq('last_name', 'Batres')
    .eq('school_id', marinerSquare.id)
    .select()

  if (auraError) {
    console.error('Error transferring Aura:', auraError)
  } else {
    console.log('Aura transferred:', aura?.length, 'record(s) updated')
  }

  // 2. Update Harbor Bay lunch times
  const lunchUpdates = [
    { first_name: 'Antonia', last_name: 'Ortiz', lunch_start: '11:30', lunch_end: '12:30' },
    { first_name: 'Lois', last_name: 'Steenhard', lunch_start: '12:30', lunch_end: '13:30' },
    { first_name: 'Jennie', last_name: 'Mendoza', lunch_start: '13:30', lunch_end: '14:30' },
    { first_name: 'Kirsten', last_name: 'Cesar', lunch_start: '13:30', lunch_end: '14:30' },
    { first_name: 'Theresa', last_name: 'Clement', lunch_start: '13:30', lunch_end: '14:30' },
  ]

  console.log('\n--- Updating Harbor Bay lunch times ---')
  for (const update of lunchUpdates) {
    const { data, error } = await supabase
      .from('teachers')
      .update({
        lunch_break_start: update.lunch_start,
        lunch_break_end: update.lunch_end,
      })
      .eq('first_name', update.first_name)
      .eq('last_name', update.last_name)
      .eq('school_id', harborBay.id)
      .select('first_name, last_name, lunch_break_start, lunch_break_end')

    if (error) {
      console.error(`Error updating ${update.first_name}:`, error)
    } else {
      console.log(`${update.first_name} ${update.last_name}: lunch ${update.lunch_start}-${update.lunch_end}`, data?.length ? '✓' : '⚠ no match')
    }
  }

  // 3. Verify final state
  console.log('\n--- Verifying Harbor Bay teachers ---')
  const { data: hbTeachers } = await supabase
    .from('teachers')
    .select('first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end')
    .eq('school_id', harborBay.id)
    .eq('status', 'active')
    .order('last_name')

  if (hbTeachers) {
    for (const t of hbTeachers) {
      console.log(`  ${t.first_name} ${t.last_name} (${t.role}) - ${t.classroom_title || 'floater'} - ${t.regular_shift_start}-${t.regular_shift_end} - lunch: ${t.lunch_break_start || 'N/A'}-${t.lunch_break_end || 'N/A'}`)
    }
  }

  console.log('\nDone!')
}

run().catch(e => { console.error(e); process.exit(1) })
