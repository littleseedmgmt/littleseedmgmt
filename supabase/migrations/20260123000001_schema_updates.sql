-- LittleSeedMgmt Schema Updates
-- Adds teacher details, break tracking, new enums

-- ============================================
-- UPDATE ENUMS
-- ============================================

-- Add new age groups (twos, threes)
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'twos' AFTER 'toddler';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'threes' AFTER 'twos';

-- Create teacher role enum
DO $$ BEGIN
  CREATE TYPE teacher_role AS ENUM ('director', 'assistant_director', 'lead_teacher', 'teacher', 'assistant', 'floater');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create shift type enum
DO $$ BEGIN
  CREATE TYPE shift_type AS ENUM ('regular', 'coverage', 'overtime');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- ENHANCE TEACHERS TABLE
-- ============================================

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS role teacher_role DEFAULT 'teacher',
  ADD COLUMN IF NOT EXISTS classroom_title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS regular_shift_start TIME,
  ADD COLUMN IF NOT EXISTS regular_shift_end TIME,
  ADD COLUMN IF NOT EXISTS lunch_break_start TIME,
  ADD COLUMN IF NOT EXISTS lunch_break_end TIME,
  ADD COLUMN IF NOT EXISTS qualifications VARCHAR(255),
  ADD COLUMN IF NOT EXISTS degrees VARCHAR(100),
  ADD COLUMN IF NOT EXISTS years_experience INTEGER,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Split PTO balance into types
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS pto_balance_vacation DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pto_balance_sick DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pto_balance_personal DECIMAL(5,2) DEFAULT 0;

-- Add index for teacher role
CREATE INDEX IF NOT EXISTS idx_teachers_role ON teachers(school_id, role);

-- ============================================
-- ENHANCE SHIFTS TABLE
-- ============================================

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS shift_type shift_type DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS break1_start TIME,
  ADD COLUMN IF NOT EXISTS break1_end TIME,
  ADD COLUMN IF NOT EXISTS lunch_start TIME,
  ADD COLUMN IF NOT EXISTS lunch_end TIME,
  ADD COLUMN IF NOT EXISTS break2_start TIME,
  ADD COLUMN IF NOT EXISTS break2_end TIME;

-- Add index for classroom shifts
CREATE INDEX IF NOT EXISTS idx_shifts_classroom ON shifts(classroom_id, date);

-- ============================================
-- UPDATE SCHOOL NAMES
-- ============================================

UPDATE schools SET name = 'Peter Pan Mariner Square', city = 'Alameda' WHERE name = 'LittleSeed North';
UPDATE schools SET name = 'Little Seeds Children''s Center', city = 'Alameda' WHERE name = 'LittleSeed South';
UPDATE schools SET name = 'Peter Pan Harbor Bay', city = 'Alameda' WHERE name = 'LittleSeed East';
