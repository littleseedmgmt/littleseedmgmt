# Baseline Test Data

This folder contains the baseline test data for the LittleSeedMgmt test environment.

## Quick Reset

To reset the test environment to baseline at any time:

```bash
npm run db:reset
```

Or manually:
```bash
npx supabase db execute --file supabase/seed-real-data.sql
```

Or use the interactive script:
```bash
./scripts/reset-test-data.sh
```

## What Gets Reset

When you run a reset, **ALL data is cleared** and replaced with the baseline:

| Data Type | Count | Notes |
|-----------|-------|-------|
| Schools | 3 | Mariner Square, Little Seeds, Harbor Bay |
| Classrooms | 13 | All age groups |
| Teachers | 34 | With shifts, qualifications |
| Students | 171 | Real names, assigned to classrooms |
| Settings | 5 | Ratios, breaks, nap windows |
| Attendance | 0 | Cleared - ready for testing |
| Shifts | 0 | Cleared - ready for testing |
| PTO Requests | 0 | Cleared - ready for testing |

## Baseline Data Source

The baseline data comes from:
- `supabase/seed-real-data.sql` - The master seed script
- CSV files in this folder - Reference copies of the data

## Files

- `schools.csv` - School information
- `teachers.csv` - Teacher data with shifts and qualifications
- `classrooms.csv` - Classroom data with age groups and capacity
- `students.csv` - Student data (generated based on classroom counts)
- `settings.csv` - System settings (ratios, breaks, etc.)

## Workflow

1. **Reset to baseline**: `npm run db:reset`
2. **Do your testing**: Add shifts, attendance, optimize schedules, etc.
3. **When done**: Reset again to start fresh

## Notes

- The reset is a **complete wipe** - all transactional data is lost
- Schools, teachers, students are restored to baseline
- Settings are restored to defaults
- Use this for clean testing cycles
