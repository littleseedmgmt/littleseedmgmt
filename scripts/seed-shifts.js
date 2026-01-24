// Script to seed shift data for the last 15 days
const SUPABASE_URL = "https://xujjznrbtrkmvhfarpdt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1amp6bnJidHJrbXZoZmFycGR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI3NjMwNSwiZXhwIjoyMDg0ODUyMzA1fQ.n-m7lZZWi_gyNAjaKuaMfZocGGVENA7aDNpXXUu8gIY";

// Schools
const schools = {
  mariner: "52932bda-9619-48c4-b7c9-002c45b8ac84",
  littleSeeds: "27c5f030-6303-4066-92a3-610065c107a8",
  harborBay: "dafba888-e8e7-4680-8f0a-3490372054d5"
};

// Teachers by school (excluding directors/assistant directors)
const teachers = {
  // Little Seeds - based on screenshot example
  littleSeeds: [
    { id: "a5385816-d2d8-4ded-bc2f-4228296b10d8", name: "Judi", classroom: "9505d613-ed60-4152-8703-07fb3d794c9d", start: "08:00", end: "17:30", break1: ["09:40", "09:50"], lunch: ["13:00", "14:30"], break2: ["16:15", "16:25"] },
    { id: "82a555ce-54f8-4eb7-bb97-a66f85c4d67a", name: "Tam", classroom: "9505d613-ed60-4152-8703-07fb3d794c9d", start: "07:45", end: "16:45", break1: ["09:30", "09:40"], lunch: ["12:00", "13:15"], break2: ["15:15", "15:25"] },
    { id: "f47e1fc3-39c5-438f-ac51-c3562b05214c", name: "Kristy", classroom: "8e06a598-d542-4df1-9302-60b5f4a8648a", start: "07:30", end: "17:00", break1: ["09:00", "09:10"], lunch: ["13:00", "14:30"], break2: ["15:50", "16:00"] },
    { id: "36a9291f-b94b-4840-9d0c-7cf6059f1a8d", name: "Quyen", classroom: "8e06a598-d542-4df1-9302-60b5f4a8648a", start: "08:00", end: "17:00", break1: ["09:30", "09:40"], lunch: ["12:00", "13:15"], break2: ["15:15", "15:25"] },
    { id: "70299e1f-927c-4f8b-b028-0f7e4598faaa", name: "Sonia", classroom: "f9a71446-0cdb-430b-ac0c-f417077dcdde", start: "08:15", end: "17:15", break1: ["10:10", "10:20"], lunch: ["12:00", "13:00"], break2: ["15:10", "15:20"] },
    { id: "71c94a61-9d60-4740-8c08-7828b8c5c9a8", name: "Mona", classroom: "589bde9e-c503-41ac-8c69-29078a90ea80", start: "07:30", end: "17:00", break1: ["09:30", "09:40"], lunch: ["13:00", "14:30"], break2: ["15:50", "16:00"] },
  ],
  // Mariner Square
  mariner: [
    { id: "0b48ef2f-b720-463c-b1d4-a5a9974ec9fa", name: "Isabel", classroom: "1d5f3756-72a1-42c6-8f37-d14d02b7fbac", start: "07:30", end: "16:30", break1: ["09:30", "09:40"], lunch: ["12:00", "13:00"], break2: ["15:00", "15:10"] },
    { id: "b1e82423-031a-455e-baf6-6dfe725f5147", name: "Pat", classroom: "1d5f3756-72a1-42c6-8f37-d14d02b7fbac", start: "08:00", end: "17:00", break1: ["10:00", "10:10"], lunch: ["12:30", "13:30"], break2: ["15:30", "15:40"] },
    { id: "68dfbd4a-e051-4c76-9735-83d06069686e", name: "Macekshia", classroom: "1d5f3756-72a1-42c6-8f37-d14d02b7fbac", start: "08:30", end: "17:30", break1: ["10:30", "10:40"], lunch: ["13:00", "14:00"], break2: ["16:00", "16:10"] },
    { id: "4eca0193-cd42-4c9a-abda-a5445370acaa", name: "Shelly", classroom: "be1a3e44-3c0a-4aba-834d-58729b8e9dc6", start: "07:45", end: "16:45", break1: ["09:45", "09:55"], lunch: ["12:15", "13:15"], break2: ["15:15", "15:25"] },
    { id: "45459f5e-e2a2-4729-9ff3-e3de3a5a41c1", name: "Sally", classroom: "be1a3e44-3c0a-4aba-834d-58729b8e9dc6", start: "08:15", end: "17:15", break1: ["10:15", "10:25"], lunch: ["12:45", "13:45"], break2: ["15:45", "15:55"] },
    { id: "db88bcfb-fdbb-4dc1-b5a3-7e9e82b8311a", name: "Sherry", classroom: "3e27276e-c059-4cbe-957c-607a04f729f2", start: "07:30", end: "16:30", break1: ["09:30", "09:40"], lunch: ["12:00", "13:00"], break2: ["15:00", "15:10"] },
    { id: "efc7468a-12bf-4d95-99e4-fdbf9c9468de", name: "Maricon", classroom: "3e27276e-c059-4cbe-957c-607a04f729f2", start: "08:00", end: "17:00", break1: ["10:00", "10:10"], lunch: ["12:30", "13:30"], break2: ["15:30", "15:40"] },
    { id: "acab9266-5689-440d-a927-a3b07dd90764", name: "Corazon", classroom: "3e27276e-c059-4cbe-957c-607a04f729f2", start: "08:30", end: "17:30", break1: ["10:30", "10:40"], lunch: ["13:00", "14:00"], break2: ["16:00", "16:10"] },
    { id: "951881cf-48c6-46c5-8a93-7595a305ecc2", name: "Angel", classroom: "aaa2341a-0377-41d5-9cab-49ebf8463ff4", start: "07:30", end: "16:30", break1: ["09:30", "09:40"], lunch: ["12:00", "13:00"], break2: ["15:00", "15:10"] },
    { id: "7caa4f3b-1863-4d0f-b6f3-69fe648fc33f", name: "Shirley", classroom: "aaa2341a-0377-41d5-9cab-49ebf8463ff4", start: "08:00", end: "17:00", break1: ["10:00", "10:10"], lunch: ["12:30", "13:30"], break2: ["15:30", "15:40"] },
    { id: "21ffb1ff-c99e-4432-8c51-3af76ae86f6a", name: "Christina", classroom: "3260ef07-b8ad-4730-bed9-c621844c77a5", start: "07:45", end: "16:45", break1: ["09:45", "09:55"], lunch: ["12:15", "13:15"], break2: ["15:15", "15:25"] },
    { id: "3f83035c-ae85-49cd-95ce-34067d030c02", name: "Kevin", classroom: "3260ef07-b8ad-4730-bed9-c621844c77a5", start: "08:15", end: "17:15", break1: ["10:15", "10:25"], lunch: ["12:45", "13:45"], break2: ["15:45", "15:55"] },
  ],
  // Harbor Bay
  harborBay: [
    { id: "7eac89e3-b56f-4c1d-8de9-fc3d4a8e08a4", name: "Kirsten", classroom: "77adc282-a30b-4a44-a950-883ba2aff59e", start: "07:30", end: "16:30", break1: ["09:30", "09:40"], lunch: ["12:00", "13:00"], break2: ["15:00", "15:10"] },
    { id: "25af75a5-7c09-49a6-88fb-fb1304af1c77", name: "Thao", classroom: "77adc282-a30b-4a44-a950-883ba2aff59e", start: "08:00", end: "17:00", break1: ["10:00", "10:10"], lunch: ["12:30", "13:30"], break2: ["15:30", "15:40"] },
    { id: "942a9d23-3b79-44ab-a63b-9562ff3aca71", name: "Melody", classroom: "77adc282-a30b-4a44-a950-883ba2aff59e", start: "08:30", end: "17:30", break1: ["10:30", "10:40"], lunch: ["13:00", "14:00"], break2: ["16:00", "16:10"] },
    { id: "27c50deb-ad4b-4292-80bf-2c63f068b45c", name: "Anotnia", classroom: "828f4c14-ef9f-4986-8393-3ad4809f8ec9", start: "07:45", end: "16:45", break1: ["09:45", "09:55"], lunch: ["12:15", "13:15"], break2: ["15:15", "15:25"] },
    { id: "8b8ffc74-1de3-4a6b-ac37-a5cab1db0c35", name: "Vynn", classroom: "882d55b2-3a84-429b-a763-1e36729bc116", start: "08:00", end: "17:00", break1: ["10:00", "10:10"], lunch: ["12:30", "13:30"], break2: ["15:30", "15:40"] },
    { id: "dbd300b2-22d8-4079-a99c-15231c281b37", name: "Lois", classroom: "3017b557-12a1-43f7-a022-6c24f53c06aa", start: "07:30", end: "16:30", break1: ["09:30", "09:40"], lunch: ["12:00", "13:00"], break2: ["15:00", "15:10"] },
    { id: "92176392-d124-4b1e-a1c9-4d087b54e5f7", name: "Jennie", classroom: "3017b557-12a1-43f7-a022-6c24f53c06aa", start: "08:15", end: "17:15", break1: ["10:15", "10:25"], lunch: ["12:45", "13:45"], break2: ["15:45", "15:55"] },
  ]
};

// Generate dates for the last 15 days (excluding weekends)
function getWorkdays(numDays) {
  const dates = [];
  const today = new Date();
  let daysBack = 0;

  while (dates.length < numDays) {
    const date = new Date(today);
    date.setDate(today.getDate() - daysBack);
    const dayOfWeek = date.getDay();

    // Include weekdays (Mon-Fri) only
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(date.toISOString().split('T')[0]);
    }
    daysBack++;
  }

  return dates;
}

// Generate shifts for a teacher on a specific date
function generateShift(teacher, schoolId, date) {
  return {
    school_id: schoolId,
    teacher_id: teacher.id,
    classroom_id: teacher.classroom,
    date: date,
    start_time: teacher.start,
    end_time: teacher.end,
    shift_type: 'regular',
    break1_start: teacher.break1 ? teacher.break1[0] : null,
    break1_end: teacher.break1 ? teacher.break1[1] : null,
    lunch_start: teacher.lunch ? teacher.lunch[0] : null,
    lunch_end: teacher.lunch ? teacher.lunch[1] : null,
    break2_start: teacher.break2 ? teacher.break2[0] : null,
    break2_end: teacher.break2 ? teacher.break2[1] : null,
    status: 'completed',
    notes: null
  };
}

async function seedShifts() {
  const workdays = getWorkdays(15);
  console.log(`Generating shifts for ${workdays.length} workdays: ${workdays[workdays.length-1]} to ${workdays[0]}`);

  const allShifts = [];

  // Generate shifts for each school
  for (const [schoolKey, teacherList] of Object.entries(teachers)) {
    const schoolId = schools[schoolKey];
    console.log(`\nGenerating shifts for ${schoolKey} (${teacherList.length} teachers)...`);

    for (const date of workdays) {
      for (const teacher of teacherList) {
        allShifts.push(generateShift(teacher, schoolId, date));
      }
    }
  }

  console.log(`\nTotal shifts to insert: ${allShifts.length}`);

  // Delete existing shifts first (to avoid duplicates)
  console.log('\nDeleting existing shifts...');
  const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/shifts?date=gte.${workdays[workdays.length-1]}&date=lte.${workdays[0]}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  console.log('Delete response:', deleteRes.status);

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < allShifts.length; i += batchSize) {
    const batch = allShifts.slice(i, i + batchSize);
    console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allShifts.length/batchSize)} (${batch.length} shifts)...`);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/shifts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(batch)
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Error inserting shifts:', error);
      return;
    }
  }

  console.log('\nDone! Shifts seeded successfully.');
}

seedShifts().catch(console.error);
