import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: teachers } = await supabase
  .from('teachers')
  .select('first_name, last_name, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, schools(name)')
  .order('first_name');

console.log('\n=== Staff Schedules ===\n');
const bySchool = {};
for (const t of teachers) {
  const schoolName = t.schools?.name || 'Unknown';
  if (!bySchool[schoolName]) bySchool[schoolName] = [];
  bySchool[schoolName].push(t);
}

for (const [school, staff] of Object.entries(bySchool)) {
  console.log('\n' + school);
  console.log('-'.repeat(90));
  for (const t of staff) {
    const shift = t.regular_shift_start && t.regular_shift_end
      ? t.regular_shift_start.slice(0,5) + '-' + t.regular_shift_end.slice(0,5)
      : 'N/A';
    const lunch = t.lunch_break_start && t.lunch_break_end
      ? t.lunch_break_start.slice(0,5) + '-' + t.lunch_break_end.slice(0,5)
      : 'None';
    console.log(`${(t.first_name + ' ' + t.last_name).padEnd(25)} ${(t.classroom_title || 'N/A').padEnd(20)} Shift: ${shift.padEnd(12)} Lunch: ${lunch}`);
  }
}
