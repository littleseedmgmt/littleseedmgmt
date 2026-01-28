-- Add nap times to classrooms table (classroom-level, not student-level)
-- This is the proper way to track nap schedules: "all 2-year-olds nap from 12:00-14:30"

ALTER TABLE classrooms
  ADD COLUMN IF NOT EXISTS nap_start TIME,
  ADD COLUMN IF NOT EXISTS nap_end TIME;

-- Set default nap times based on the seed data CSV
-- All classrooms default to 12:00-14:30 nap time

UPDATE classrooms
SET nap_start = '12:00'::TIME, nap_end = '14:30'::TIME
WHERE nap_start IS NULL;

-- Verify
DO $$
DECLARE
  classrooms_with_nap INTEGER;
BEGIN
  SELECT COUNT(*) INTO classrooms_with_nap FROM classrooms WHERE nap_start IS NOT NULL;
  RAISE NOTICE 'Classrooms with nap times: %', classrooms_with_nap;
END $$;
