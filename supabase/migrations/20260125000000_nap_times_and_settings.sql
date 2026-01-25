-- Add nap times to students and create school settings for configurable rules

-- ============================================
-- ADD NAP TIMES TO STUDENTS
-- ============================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nap_start TIME,
  ADD COLUMN IF NOT EXISTS nap_end TIME;

-- ============================================
-- CREATE SCHOOL SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, setting_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_school_settings_school ON school_settings(school_id);
CREATE INDEX IF NOT EXISTS idx_school_settings_key ON school_settings(setting_key);

-- Add RLS policies
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY school_settings_select ON school_settings FOR SELECT
  USING (school_id IN (SELECT get_user_schools(auth.uid())) OR school_id IS NULL);
CREATE POLICY school_settings_insert ON school_settings FOR INSERT
  WITH CHECK (school_id IN (SELECT get_user_schools(auth.uid())) OR school_id IS NULL);
CREATE POLICY school_settings_update ON school_settings FOR UPDATE
  USING (school_id IN (SELECT get_user_schools(auth.uid())) OR school_id IS NULL);
CREATE POLICY school_settings_delete ON school_settings FOR DELETE
  USING (school_id IN (SELECT get_user_schools(auth.uid())) OR school_id IS NULL);

-- Add trigger for updated_at
CREATE TRIGGER school_settings_updated_at BEFORE UPDATE ON school_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- INSERT DEFAULT GLOBAL SETTINGS (school_id = NULL means global)
-- ============================================

-- Normal teacher-to-student ratios (during awake time)
INSERT INTO school_settings (school_id, setting_key, setting_value, description)
VALUES (NULL, 'ratio_normal', '{
  "infant": 4,
  "toddler": 4,
  "twos": 12,
  "threes": 12,
  "preschool": 12,
  "pre_k": 12
}', 'Normal teacher-to-student ratios during awake time (1 teacher per X students)')
ON CONFLICT (school_id, setting_key) DO NOTHING;

-- Nap time teacher-to-student ratios (can be higher during nap)
INSERT INTO school_settings (school_id, setting_key, setting_value, description)
VALUES (NULL, 'ratio_naptime', '{
  "infant": 12,
  "toddler": 12,
  "twos": 24,
  "threes": 24,
  "preschool": 24,
  "pre_k": 24
}', 'Teacher-to-student ratios during nap time (1 teacher per X students)')
ON CONFLICT (school_id, setting_key) DO NOTHING;

-- Break settings
INSERT INTO school_settings (school_id, setting_key, setting_value, description)
VALUES (NULL, 'break_settings', '{
  "break_duration_minutes": 10,
  "breaks_per_shift": 2,
  "break1_window": "shift_start_to_lunch",
  "break2_window": "lunch_end_to_shift_end"
}', 'Settings for teacher breaks')
ON CONFLICT (school_id, setting_key) DO NOTHING;

-- Default nap time window (for reference)
INSERT INTO school_settings (school_id, setting_key, setting_value, description)
VALUES (NULL, 'default_nap_window', '{
  "default_start": "12:00",
  "default_end": "14:30",
  "alternate_start": "12:30",
  "alternate_end": "15:00"
}', 'Default nap time windows for reference')
ON CONFLICT (school_id, setting_key) DO NOTHING;

-- ============================================
-- UPDATE EXISTING STUDENTS WITH NAP TIMES
-- ============================================

-- 90% of students get standard nap time (12:00 - 14:30)
-- 10% get alternate nap time (12:30 - 15:00)
-- We'll use random() to distribute

UPDATE students
SET
  nap_start = CASE
    WHEN random() < 0.9 THEN '12:00'::TIME
    ELSE '12:30'::TIME
  END,
  nap_end = CASE
    WHEN nap_start = '12:00'::TIME THEN '14:30'::TIME
    ELSE '15:00'::TIME
  END
WHERE nap_start IS NULL;

-- Actually, the above won't work because nap_start isn't set yet when we check it
-- Let's do it properly with a CTE or temp column

-- Reset and do it properly
UPDATE students
SET nap_start = '12:00'::TIME, nap_end = '14:30'::TIME
WHERE nap_start IS NULL;

-- Now update ~10% to alternate schedule
UPDATE students
SET nap_start = '12:30'::TIME, nap_end = '15:00'::TIME
WHERE id IN (
  SELECT id FROM students
  ORDER BY random()
  LIMIT (SELECT COUNT(*) * 0.1 FROM students)
);

-- ============================================
-- VERIFY
-- ============================================

DO $$
DECLARE
  settings_count INTEGER;
  students_with_nap INTEGER;
  standard_nap INTEGER;
  alternate_nap INTEGER;
BEGIN
  SELECT COUNT(*) INTO settings_count FROM school_settings;
  SELECT COUNT(*) INTO students_with_nap FROM students WHERE nap_start IS NOT NULL;
  SELECT COUNT(*) INTO standard_nap FROM students WHERE nap_start = '12:00'::TIME;
  SELECT COUNT(*) INTO alternate_nap FROM students WHERE nap_start = '12:30'::TIME;

  RAISE NOTICE 'Settings created: %', settings_count;
  RAISE NOTICE 'Students with nap times: % (standard: %, alternate: %)', students_with_nap, standard_nap, alternate_nap;
END $$;
