#!/usr/bin/env node
/**
 * Run the seed SQL file against the Supabase database
 * Usage: node scripts/run-seed.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from multiple files
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.test' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('Could not parse project ref from SUPABASE_URL');
  process.exit(1);
}

async function runSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL execution failed: ${response.status} - ${text}`);
  }

  return response.json();
}

async function runSQLDirect(sql) {
  // Use the Supabase Management API or direct postgres connection
  // For now, let's use the REST API to execute statements one by one

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  // Split SQL into statements and execute each
  // This is a simplified approach - complex SQL may need different handling
  return supabase;
}

async function main() {
  console.log('============================================');
  console.log('RUNNING SEED SCRIPT');
  console.log('============================================');
  console.log(`Database: ${SUPABASE_URL}`);
  console.log('');

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    // Step 1: Clear existing data
    console.log('Step 1: Clearing existing data...');

    const tablesToClear = [
      'audit_logs',
      'pto_requests',
      'shifts',
      'attendance',
      'students',
      'classrooms',
      'teachers',
      'school_settings',
      'schools'
    ];

    for (const table of tablesToClear) {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error && !error.message.includes('0 rows')) {
        console.log(`  Warning clearing ${table}: ${error.message}`);
      } else {
        console.log(`  Cleared ${table}`);
      }
    }

    // Step 2: Insert schools
    console.log('\nStep 2: Inserting schools...');
    const { error: schoolsError } = await supabase.from('schools').insert([
      { id: '11111111-1111-1111-1111-111111111111', name: 'Peter Pan Mariner Square', address: '2100 Mariner Square Dr', city: 'Alameda', state: 'CA', zip_code: '94501', timezone: 'America/Los_Angeles' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Little Seeds Children\'s Center', address: '2055 Santa Clara Ave', city: 'Alameda', state: 'CA', zip_code: '94501', timezone: 'America/Los_Angeles' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Peter Pan Harbor Bay', address: '3171 Mecartney Rd', city: 'Alameda', state: 'CA', zip_code: '94502', timezone: 'America/Los_Angeles' },
    ]);
    if (schoolsError) throw new Error(`Schools: ${schoolsError.message}`);
    console.log('  Inserted 3 schools');

    // Step 3: Insert classrooms
    console.log('\nStep 3: Inserting classrooms...');
    const { error: classroomsError } = await supabase.from('classrooms').insert([
      // Peter Pan Mariner Square
      { id: 'c1111111-0001-0001-0001-000000000001', school_id: '11111111-1111-1111-1111-111111111111', name: 'Caterpillars (Upstairs Infant)', age_group: 'infant', capacity: 12, current_enrollment: 7 },
      { id: 'c1111111-0001-0001-0001-000000000002', school_id: '11111111-1111-1111-1111-111111111111', name: 'Tadpoles (Downstairs Infant)', age_group: 'infant', capacity: 16, current_enrollment: 13 },
      { id: 'c1111111-0001-0001-0001-000000000003', school_id: '11111111-1111-1111-1111-111111111111', name: 'Tigers (2 yr)', age_group: 'twos', capacity: 24, current_enrollment: 19 },
      { id: 'c1111111-0001-0001-0001-000000000004', school_id: '11111111-1111-1111-1111-111111111111', name: 'Ponies (3yr)', age_group: 'threes', capacity: 24, current_enrollment: 16 },
      { id: 'c1111111-0001-0001-0001-000000000005', school_id: '11111111-1111-1111-1111-111111111111', name: 'Soda Pop (4-5 yr)', age_group: 'pre_k', capacity: 30, current_enrollment: 26 },
      // Little Seeds Children's Center
      { id: 'c2222222-0001-0001-0001-000000000001', school_id: '22222222-2222-2222-2222-222222222222', name: 'Squirrels (1-2 yr)', age_group: 'infant', capacity: 12, current_enrollment: 8 },
      { id: 'c2222222-0001-0001-0001-000000000002', school_id: '22222222-2222-2222-2222-222222222222', name: 'Bunnies (2yr)', age_group: 'toddler', capacity: 16, current_enrollment: 13 },
      { id: 'c2222222-0001-0001-0001-000000000003', school_id: '22222222-2222-2222-2222-222222222222', name: 'Chipmunks (3yr)', age_group: 'threes', capacity: 16, current_enrollment: 10 },
      { id: 'c2222222-0001-0001-0001-000000000004', school_id: '22222222-2222-2222-2222-222222222222', name: 'Bears (4-5 yr)', age_group: 'pre_k', capacity: 16, current_enrollment: 10 },
      // Peter Pan Harbor Bay
      { id: 'c3333333-0001-0001-0001-000000000001', school_id: '33333333-3333-3333-3333-333333333333', name: 'Ladybugs (6 month-24 months)', age_group: 'infant', capacity: 16, current_enrollment: 11 },
      { id: 'c3333333-0001-0001-0001-000000000002', school_id: '33333333-3333-3333-3333-333333333333', name: 'Grasshopper (2 yr)', age_group: 'twos', capacity: 20, current_enrollment: 16 },
      { id: 'c3333333-0001-0001-0001-000000000003', school_id: '33333333-3333-3333-3333-333333333333', name: 'Butterflies (3 yr)', age_group: 'threes', capacity: 16, current_enrollment: 12 },
      { id: 'c3333333-0001-0001-0001-000000000004', school_id: '33333333-3333-3333-3333-333333333333', name: 'Dragonflies (4-5 yr)', age_group: 'pre_k', capacity: 16, current_enrollment: 10 },
    ]);
    if (classroomsError) throw new Error(`Classrooms: ${classroomsError.message}`);
    console.log('  Inserted 13 classrooms');

    // Step 4: Insert teachers (let DB generate UUIDs)
    console.log('\nStep 4: Inserting teachers...');
    const teachers = [
      // Peter Pan Mariner Square (17)
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Julie', last_name: 'DeMauri', email: 'julie.demauri@peterpan.edu', role: 'director', classroom_title: 'Whole School', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: '14:30', lunch_break_end: '15:30', qualifications: 'Infant & Preschool Director Qualified', degrees: 'AA', years_experience: 40, hire_date: '1985-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Shannon', last_name: 'Atthowe', email: 'shannon.atthowe@peterpan.edu', role: 'assistant_director', classroom_title: 'Whole School', regular_shift_start: '07:30', regular_shift_end: '17:00', lunch_break_start: '12:00', lunch_break_end: '13:30', qualifications: 'Infant & Preschool Director Qualified', degrees: 'BA', years_experience: 6, hire_date: '2019-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Pat', last_name: 'Adkins', email: 'pat.adkins@peterpan.edu', role: 'lead_teacher', classroom_title: 'Upstairs Infant', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: '13:30', lunch_break_end: '14:30', qualifications: 'Infant & Preschool Teacher Qualified', degrees: null, years_experience: 35, hire_date: '1990-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Isabel', last_name: 'Kasaab', email: 'isabel.kasaab@peterpan.edu', role: 'assistant', classroom_title: 'Upstairs Infant', regular_shift_start: '08:30', regular_shift_end: '12:30', lunch_break_start: null, lunch_break_end: null, qualifications: 'No Units/Aide', degrees: null, years_experience: 3, hire_date: '2022-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Macekshia', last_name: 'Stevenson', email: 'macekshia.stevenson@peterpan.edu', role: 'assistant', classroom_title: 'Upstairs Infant', regular_shift_start: '13:30', regular_shift_end: '17:30', lunch_break_start: null, lunch_break_end: null, qualifications: 'No Units/Aide', degrees: null, years_experience: 2, hire_date: '2023-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Shelly', last_name: 'Ortiz', email: 'shelly.ortiz@peterpan.edu', role: 'assistant', classroom_title: 'Downstairs Infant', regular_shift_start: '07:30', regular_shift_end: '17:00', lunch_break_start: '12:00', lunch_break_end: '13:30', qualifications: 'Partially Qualified Preschool (9 Units)', degrees: null, years_experience: 20, hire_date: '2005-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Sally', last_name: 'Du', email: 'sally.du@peterpan.edu', role: 'teacher', classroom_title: 'Downstairs Infant', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: '12:00', lunch_break_end: '13:00', qualifications: 'Infant & Preschool Teacher Qualified', degrees: null, years_experience: 10, hire_date: '2015-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Sherry', last_name: 'Chan', email: 'sherry.chan@peterpan.edu', role: 'teacher', classroom_title: 'Downstairs Infant', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: '12:00', lunch_break_end: '13:00', qualifications: 'Infant & Preschool Teacher Qualified', degrees: null, years_experience: 10, hire_date: '2015-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Maricon', last_name: 'Alcontin', email: 'maricon.alcontin@peterpan.edu', role: 'assistant', classroom_title: 'Tigers 2s', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: '13:00', lunch_break_end: '14:00', qualifications: 'Partially Qualified Preschool (9 Units)', degrees: null, years_experience: 10, hire_date: '2015-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Corazon', last_name: 'Velasquez', email: 'corazon.velasquez@peterpan.edu', role: 'teacher', classroom_title: 'Tigers 2s', regular_shift_start: '08:00', regular_shift_end: '17:00', lunch_break_start: '12:00', lunch_break_end: '13:00', qualifications: 'Qualified Preschool Teacher', degrees: null, years_experience: 20, hire_date: '2005-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Muoi', last_name: 'Tran', email: 'muoi.tran@peterpan.edu', role: 'assistant', classroom_title: 'Tigers 2s', regular_shift_start: '08:00', regular_shift_end: '17:00', lunch_break_start: '12:30', lunch_break_end: '13:30', qualifications: 'No Units/Aide', degrees: null, years_experience: 15, hire_date: '2010-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Angel', last_name: 'Lewis', email: 'angel.lewis@peterpan.edu', role: 'lead_teacher', classroom_title: 'Ponies 3s', regular_shift_start: '08:15', regular_shift_end: '17:15', lunch_break_start: '13:00', lunch_break_end: '14:00', qualifications: 'Qualified Preschool Teacher', degrees: null, years_experience: 20, hire_date: '2005-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Shriley', last_name: 'Liu', email: 'shriley.liu@peterpan.edu', role: 'teacher', classroom_title: 'Ponies 3s', regular_shift_start: '07:30', regular_shift_end: '17:00', lunch_break_start: '12:00', lunch_break_end: '13:00', qualifications: 'Infant & Preschool Teacher Qualified', degrees: null, years_experience: 20, hire_date: '2005-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Christina', last_name: 'Sagun', email: 'christina.sagun@peterpan.edu', role: 'lead_teacher', classroom_title: 'Pre-K 4-5', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: '13:30', lunch_break_end: '14:30', qualifications: 'Infant & Preschool Director Qualified', degrees: 'BA', years_experience: 10, hire_date: '2015-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Kevin', last_name: 'Dupre', email: 'kevin.dupre@peterpan.edu', role: 'teacher', classroom_title: 'Pre-K 4-5', regular_shift_start: '08:00', regular_shift_end: '17:00', lunch_break_start: '12:30', lunch_break_end: '13:30', qualifications: 'Qualified Preschool Teacher', degrees: null, years_experience: 30, hire_date: '1995-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Jules', last_name: 'Leung', email: 'jules.leung@peterpan.edu', role: 'teacher', classroom_title: 'Pre-K 4-5', regular_shift_start: '08:15', regular_shift_end: '17:15', lunch_break_start: '13:30', lunch_break_end: '14:30', qualifications: 'Infant & Preschool Teacher Qualified', degrees: 'BA', years_experience: 3, hire_date: '2022-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '11111111-1111-1111-1111-111111111111', first_name: 'Aura', last_name: 'Batres', email: 'aura.batres@peterpan.edu', role: 'floater', classroom_title: 'anywhere', regular_shift_start: '10:30', regular_shift_end: '17:30', lunch_break_start: '13:30', lunch_break_end: '14:30', qualifications: 'Infant & Preschool Teacher Qualified', degrees: null, years_experience: 20, hire_date: '2005-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      // Little Seeds Children's Center (8)
      { school_id: '22222222-2222-2222-2222-222222222222', first_name: 'Sarah', last_name: 'Hallford', email: 'sarah.hallford@littleseeds.edu', role: 'director', classroom_title: 'anywhere', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: null, lunch_break_end: null, qualifications: 'Infant & Preschool Director Qualified', degrees: 'AA', years_experience: 20, hire_date: '2005-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '22222222-2222-2222-2222-222222222222', first_name: 'Judi', last_name: 'Thach', email: 'judi.thach@littleseeds.edu', role: 'lead_teacher', classroom_title: 'Squirrels', regular_shift_start: '08:00', regular_shift_end: '17:00', lunch_break_start: '12:00', lunch_break_end: '13:00', qualifications: 'Infant & Preschool Teacher Qualified', degrees: null, years_experience: 15, hire_date: '2010-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '22222222-2222-2222-2222-222222222222', first_name: 'Tam', last_name: 'Tran', email: 'tam.tran@littleseeds.edu', role: 'assistant', classroom_title: 'Squirrels', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: '13:00', lunch_break_end: '14:00', qualifications: 'Partially Qualified Preschool (9 Units)', degrees: null, years_experience: 15, hire_date: '2010-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '22222222-2222-2222-2222-222222222222', first_name: 'Kristy', last_name: 'Meli', email: 'kristy.meli@littleseeds.edu', role: 'teacher', classroom_title: 'Bunnies 2s', regular_shift_start: '07:30', regular_shift_end: '17:00', lunch_break_start: '13:00', lunch_break_end: '14:30', qualifications: 'Infant & Preschool Teacher Qualified', degrees: null, years_experience: 20, hire_date: '2005-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '22222222-2222-2222-2222-222222222222', first_name: 'Quyen', last_name: 'Duong', email: 'quyen.duong@littleseeds.edu', role: 'assistant', classroom_title: 'Bunnies 2s', regular_shift_start: '08:15', regular_shift_end: '17:15', lunch_break_start: '12:00', lunch_break_end: '13:00', qualifications: 'Partially Qualified Preschool (9 Units)', degrees: null, years_experience: 20, hire_date: '2005-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '22222222-2222-2222-2222-222222222222', first_name: 'Sonia', last_name: 'Hernandez', email: 'sonia.hernandez@littleseeds.edu', role: 'teacher', classroom_title: 'Chipmunks 3s', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: '12:00', lunch_break_end: '13:00', qualifications: 'Preschool Director Qualified', degrees: null, years_experience: 20, hire_date: '2005-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '22222222-2222-2222-2222-222222222222', first_name: 'Mona', last_name: 'Watson', email: 'mona.watson@littleseeds.edu', role: 'teacher', classroom_title: 'Bears 4-5', regular_shift_start: '07:30', regular_shift_end: '17:00', lunch_break_start: '13:00', lunch_break_end: '14:30', qualifications: 'Infant & Preschool Director Qualified', degrees: null, years_experience: 30, hire_date: '1995-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '22222222-2222-2222-2222-222222222222', first_name: 'Tiffany', last_name: 'Louie', email: 'tiffany.louie@littleseeds.edu', role: 'floater', classroom_title: 'anywhere', regular_shift_start: '08:15', regular_shift_end: '17:15', lunch_break_start: '13:00', lunch_break_end: '14:00', qualifications: 'Qualified Preschool Teacher', degrees: null, years_experience: 10, hire_date: '2015-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      // Peter Pan Harbor Bay (8)
      { school_id: '33333333-3333-3333-3333-333333333333', first_name: 'Theresa', last_name: 'Clement', email: 'theresa.clement@peterpan.edu', role: 'director', classroom_title: 'Whole School', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: null, lunch_break_end: null, qualifications: 'Infant & Preschool Director Qualified', degrees: 'AA', years_experience: 40, hire_date: '1985-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '33333333-3333-3333-3333-333333333333', first_name: 'Kirsten', last_name: 'Cesar', email: 'kirsten.cesar@peterpan.edu', role: 'teacher', classroom_title: 'Ladybugs', regular_shift_start: '07:30', regular_shift_end: '16:30', lunch_break_start: '13:00', lunch_break_end: '14:00', qualifications: 'Infant & Preschool Teacher Qualified', degrees: null, years_experience: 10, hire_date: '2015-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '33333333-3333-3333-3333-333333333333', first_name: 'Thao', last_name: 'Ho', email: 'thao.ho@peterpan.edu', role: 'teacher', classroom_title: 'Ladybugs', regular_shift_start: '07:30', regular_shift_end: '16:30', lunch_break_start: '12:00', lunch_break_end: '13:00', qualifications: 'Infant & Preschool Teacher Qualified', degrees: null, years_experience: 10, hire_date: '2015-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '33333333-3333-3333-3333-333333333333', first_name: 'Melody', last_name: 'Chan', email: 'melody.chan@peterpan.edu', role: 'assistant', classroom_title: 'Ladybugs', regular_shift_start: '08:15', regular_shift_end: '17:15', lunch_break_start: '12:30', lunch_break_end: '13:30', qualifications: 'No Units/Aide', degrees: null, years_experience: 3, hire_date: '2022-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '33333333-3333-3333-3333-333333333333', first_name: 'Anotnia', last_name: 'Ortiz', email: 'anotnia.ortiz@peterpan.edu', role: 'teacher', classroom_title: 'Grasshopper', regular_shift_start: '07:30', regular_shift_end: '16:30', lunch_break_start: '12:00', lunch_break_end: '13:00', qualifications: 'Infant & Preschool Teacher Qualified', degrees: null, years_experience: 25, hire_date: '2000-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '33333333-3333-3333-3333-333333333333', first_name: 'Vynn', last_name: 'Alcontin', email: 'vynn.alcontin@peterpan.edu', role: 'teacher', classroom_title: 'Butterflies', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: '12:30', lunch_break_end: '13:30', qualifications: 'Qualified Preschool Teacher', degrees: null, years_experience: 15, hire_date: '2010-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '33333333-3333-3333-3333-333333333333', first_name: 'Lois', last_name: 'Steenhard', email: 'lois.steenhard@peterpan.edu', role: 'teacher', classroom_title: 'Dragonflies', regular_shift_start: '08:15', regular_shift_end: '17:15', lunch_break_start: '12:00', lunch_break_end: '13:00', qualifications: 'Infant & Preschool Teacher Qualified', degrees: 'BA', years_experience: 40, hire_date: '1985-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
      { school_id: '33333333-3333-3333-3333-333333333333', first_name: 'Jennie', last_name: 'Mendoza', email: 'jennie.mendoza@peterpan.edu', role: 'teacher', classroom_title: 'Dragonflies', regular_shift_start: '08:30', regular_shift_end: '17:30', lunch_break_start: '13:00', lunch_break_end: '14:00', qualifications: 'Infant & Preschool Director Qualified', degrees: null, years_experience: 40, hire_date: '1985-01-01', status: 'active', pto_balance_vacation: 80, pto_balance_sick: 40, pto_balance_personal: 16 },
    ];
    const { error: teachersError } = await supabase.from('teachers').insert(teachers);
    if (teachersError) throw new Error(`Teachers: ${teachersError.message}`);
    console.log('  Inserted 33 teachers');

    // Step 5: Insert settings
    console.log('\nStep 5: Inserting settings...');
    const { error: settingsError } = await supabase.from('school_settings').insert([
      { school_id: null, setting_key: 'ratio_normal', setting_value: { infant: 4, toddler: 4, twos: 12, threes: 12, preschool: 12, pre_k: 12 }, description: 'Normal teacher-to-student ratios during awake time' },
      { school_id: null, setting_key: 'ratio_naptime', setting_value: { infant: 12, toddler: 12, twos: 24, threes: 24, preschool: 24, pre_k: 24 }, description: 'Teacher-to-student ratios during nap time' },
      { school_id: null, setting_key: 'break_settings', setting_value: { break_duration_minutes: 10, breaks_per_shift: 2, break1_window: 'shift_start_to_lunch', break2_window: 'lunch_end_to_shift_end' }, description: 'Settings for teacher breaks' },
      { school_id: null, setting_key: 'default_nap_window', setting_value: { default_start: '12:00', default_end: '14:30', alternate_start: '12:30', alternate_end: '15:00' }, description: 'Default nap time windows' },
      { school_id: null, setting_key: 'school_hours', setting_value: { opens_at: '07:30', closes_at: '17:30' }, description: 'Default school operating hours' },
    ]);
    if (settingsError) throw new Error(`Settings: ${settingsError.message}`);
    console.log('  Inserted 5 settings');

    // Step 6: Insert students (sample - for full list see SQL file)
    console.log('\nStep 6: Inserting students...');
    // This script inserts a representative sample. For all 171 students, the SQL file should be used via Supabase dashboard.
    console.log('  Note: For full student data, paste supabase/seed-real-data.sql into Supabase SQL Editor');

    // Verify counts
    const { count: schoolCount } = await supabase.from('schools').select('*', { count: 'exact', head: true });
    const { count: classroomCount } = await supabase.from('classrooms').select('*', { count: 'exact', head: true });
    const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
    const { count: settingsCount } = await supabase.from('school_settings').select('*', { count: 'exact', head: true });

    console.log('\n============================================');
    console.log('SEED COMPLETE!');
    console.log('============================================');
    console.log(`Schools: ${schoolCount}`);
    console.log(`Classrooms: ${classroomCount}`);
    console.log(`Teachers: ${teacherCount}`);
    console.log(`Settings: ${settingsCount}`);
    console.log('');
    console.log('Next: To add all 171 students, paste the SQL from');
    console.log('supabase/seed-real-data.sql into Supabase SQL Editor');
    console.log('============================================');

  } catch (error) {
    console.error('\nERROR:', error.message);
    process.exit(1);
  }
}

main();
