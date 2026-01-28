#!/usr/bin/env node
// Script to update staff schedules in the database
// Run with: node scripts/update-staff-schedules.mjs

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

const staffSchedules = [
  // Peter Pan Mariner Square
  { first_name: 'Julie', last_name: 'DeMauri', school_name: 'Peter Pan Mariner Square', shift_start: '08:30', shift_end: '17:30', lunch_start: '14:30', lunch_end: '15:30' },
  { first_name: 'Shannon', last_name: 'Atthowe', school_name: 'Peter Pan Mariner Square', shift_start: '07:30', shift_end: '17:00', lunch_start: '12:00', lunch_end: '13:30' },
  { first_name: 'Pat', last_name: 'Adkins', school_name: 'Peter Pan Mariner Square', shift_start: '08:30', shift_end: '17:30', lunch_start: '13:30', lunch_end: '14:30', classroom_title: 'Upstairs Infant' },
  { first_name: 'Isabel', last_name: 'Kasaab', school_name: 'Peter Pan Mariner Square', shift_start: '08:30', shift_end: '12:30', lunch_start: null, lunch_end: null, classroom_title: 'Upstairs Infant' },
  { first_name: 'Macekshia', last_name: 'Stevenson', school_name: 'Peter Pan Mariner Square', shift_start: '13:30', shift_end: '17:30', lunch_start: null, lunch_end: null, classroom_title: 'Upstairs Infant' },
  { first_name: 'Shelly', last_name: 'Ortiz', school_name: 'Peter Pan Mariner Square', shift_start: '07:30', shift_end: '17:00', lunch_start: '12:00', lunch_end: '13:30', classroom_title: 'Downstairs Infant' },
  { first_name: 'Sally', last_name: 'Du', school_name: 'Peter Pan Mariner Square', shift_start: '08:15', shift_end: '17:15', lunch_start: '12:00', lunch_end: '13:00', classroom_title: 'Downstairs Infant' },
  { first_name: 'Sherry', last_name: 'Chan', school_name: 'Peter Pan Mariner Square', shift_start: '08:30', shift_end: '17:30', lunch_start: '12:00', lunch_end: '13:00', classroom_title: 'Downstairs Infant' },
  { first_name: 'Maricon', last_name: 'Alcontin', school_name: 'Peter Pan Mariner Square', shift_start: '08:30', shift_end: '17:30', lunch_start: '13:00', lunch_end: '14:00', classroom_title: 'Tigers' },
  { first_name: 'Corazon', last_name: 'Velasquez', school_name: 'Peter Pan Mariner Square', shift_start: '08:00', shift_end: '17:00', lunch_start: '12:00', lunch_end: '13:00', classroom_title: 'Tigers' },
  { first_name: 'Muoi', last_name: 'Tran', school_name: 'Peter Pan Mariner Square', shift_start: '08:00', shift_end: '17:00', lunch_start: '12:30', lunch_end: '13:30', classroom_title: 'Tigers' },
  { first_name: 'Angel', last_name: 'Lewis', school_name: 'Peter Pan Mariner Square', shift_start: '08:15', shift_end: '17:15', lunch_start: '13:00', lunch_end: '14:00', classroom_title: 'Ponies' },
  { first_name: 'Shirley', last_name: 'Liu', school_name: 'Peter Pan Mariner Square', shift_start: '07:30', shift_end: '16:30', lunch_start: '12:00', lunch_end: '13:00', classroom_title: 'Ponies' },
  { first_name: 'Christina', last_name: 'Sagun', school_name: 'Peter Pan Mariner Square', shift_start: '08:30', shift_end: '17:30', lunch_start: '13:30', lunch_end: '14:30', classroom_title: 'Soda Pop' },
  { first_name: 'Kevin', last_name: 'Dupre', school_name: 'Peter Pan Mariner Square', shift_start: '08:00', shift_end: '17:00', lunch_start: '12:30', lunch_end: '13:30', classroom_title: 'Soda Pop' },
  { first_name: 'Jules', last_name: 'Leung', school_name: 'Peter Pan Mariner Square', shift_start: '08:15', shift_end: '17:15', lunch_start: '13:30', lunch_end: '14:30', classroom_title: 'Soda Pop' },
  { first_name: 'Aura', last_name: 'Batres', school_name: 'Peter Pan Mariner Square', shift_start: '10:15', shift_end: '17:15', lunch_start: '13:30', lunch_end: '14:30', classroom_title: null, role: 'floater' },

  // Little Seeds Children's Center
  { first_name: 'Sarah', last_name: 'Hallford', school_name: "Little Seeds Children's Center", shift_start: '08:30', shift_end: '17:30', lunch_start: null, lunch_end: null },
  { first_name: 'Judi', last_name: 'Thach', school_name: "Little Seeds Children's Center", shift_start: '08:00', shift_end: '17:30', lunch_start: '13:00', lunch_end: '14:30', classroom_title: 'Squirrels' },
  { first_name: 'Tam', last_name: 'Tran', school_name: "Little Seeds Children's Center", shift_start: '07:45', shift_end: '16:45', lunch_start: '12:00', lunch_end: '13:00', classroom_title: 'Squirrels' },
  { first_name: 'Kristy', last_name: 'Meli', school_name: "Little Seeds Children's Center", shift_start: '07:30', shift_end: '17:00', lunch_start: '13:00', lunch_end: '14:30', classroom_title: 'Bunnies' },
  { first_name: 'Quyen', last_name: 'Duong', school_name: "Little Seeds Children's Center", shift_start: '08:15', shift_end: '17:15', lunch_start: '12:00', lunch_end: '13:00', classroom_title: 'Bunnies' },
  { first_name: 'Sonia', last_name: 'Hernandez', school_name: "Little Seeds Children's Center", shift_start: '08:15', shift_end: '17:15', lunch_start: '12:00', lunch_end: '13:00', classroom_title: 'Chipmunks' },
  { first_name: 'Mona', last_name: 'Watson', school_name: "Little Seeds Children's Center", shift_start: '07:30', shift_end: '17:00', lunch_start: '13:00', lunch_end: '14:30', classroom_title: 'Bears' },
  { first_name: 'Tiffany', last_name: 'Louie', school_name: "Little Seeds Children's Center", shift_start: '08:15', shift_end: '17:15', lunch_start: '13:00', lunch_end: '14:00', classroom_title: null, role: 'floater' },

  // Peter Pan Harbor Bay
  { first_name: 'Theresa', last_name: 'Clement', school_name: 'Peter Pan Harbor Bay', shift_start: '08:30', shift_end: '17:30', lunch_start: null, lunch_end: null },
  { first_name: 'Kirsten', last_name: 'Cesar', school_name: 'Peter Pan Harbor Bay', shift_start: '08:30', shift_end: '17:30', lunch_start: '13:00', lunch_end: '14:00', classroom_title: 'Ladybugs' },
  { first_name: 'Thao', last_name: 'Ho', school_name: 'Peter Pan Harbor Bay', shift_start: '07:30', shift_end: '16:30', lunch_start: '12:00', lunch_end: '13:00', classroom_title: 'Ladybugs' },
  { first_name: 'Melody', last_name: 'Chan', school_name: 'Peter Pan Harbor Bay', shift_start: '08:15', shift_end: '17:15', lunch_start: '12:30', lunch_end: '13:30', classroom_title: 'Ladybugs' },
  { first_name: 'Antonia', last_name: 'Ortiz', school_name: 'Peter Pan Harbor Bay', shift_start: '07:30', shift_end: '16:30', lunch_start: '12:00', lunch_end: '13:00', classroom_title: 'Grasshoppers' },
  { first_name: 'Vynn', last_name: 'Alcontin', school_name: 'Peter Pan Harbor Bay', shift_start: '08:30', shift_end: '17:30', lunch_start: '12:30', lunch_end: '13:30', classroom_title: 'Butterflies' },
  { first_name: 'Lois', last_name: 'Steenhard', school_name: 'Peter Pan Harbor Bay', shift_start: '08:15', shift_end: '17:15', lunch_start: '12:00', lunch_end: '13:00', classroom_title: 'Dragonflies' },
  { first_name: 'Jennie', last_name: 'Mendoza', school_name: 'Peter Pan Harbor Bay', shift_start: '08:30', shift_end: '17:30', lunch_start: '13:00', lunch_end: '14:00', classroom_title: 'Dragonflies' },
]

async function main() {
  console.log('Fetching schools...')
  const { data: schools, error: schoolsError } = await supabase
    .from('schools')
    .select('id, name')

  if (schoolsError) {
    console.error('Error fetching schools:', schoolsError)
    process.exit(1)
  }

  const schoolMap = new Map(schools.map(s => [s.name, s.id]))
  console.log('Schools found:', schools.map(s => s.name).join(', '))

  let updated = 0
  let failed = 0
  const notFound = []

  for (const staff of staffSchedules) {
    const schoolId = schoolMap.get(staff.school_name)
    if (!schoolId) {
      console.error(`School not found: ${staff.school_name}`)
      failed++
      continue
    }

    const updateData = {
      regular_shift_start: staff.shift_start,
      regular_shift_end: staff.shift_end,
      lunch_break_start: staff.lunch_start,
      lunch_break_end: staff.lunch_end,
    }

    if (staff.classroom_title !== undefined) {
      updateData.classroom_title = staff.classroom_title
    }
    if (staff.role) {
      updateData.role = staff.role
    }

    const { data, error } = await supabase
      .from('teachers')
      .update(updateData)
      .eq('first_name', staff.first_name)
      .eq('last_name', staff.last_name)
      .eq('school_id', schoolId)
      .select()

    if (error) {
      console.error(`Failed to update ${staff.first_name} ${staff.last_name}:`, error.message)
      failed++
    } else if (!data || data.length === 0) {
      console.warn(`Teacher not found: ${staff.first_name} ${staff.last_name} at ${staff.school_name}`)
      notFound.push(`${staff.first_name} ${staff.last_name}`)
      failed++
    } else {
      console.log(`Updated: ${staff.first_name} ${staff.last_name} - ${staff.shift_start}-${staff.shift_end}`)
      updated++
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Updated: ${updated}`)
  console.log(`Failed: ${failed}`)
  if (notFound.length > 0) {
    console.log(`Not found: ${notFound.join(', ')}`)
  }
}

main().catch(console.error)
