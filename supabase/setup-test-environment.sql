-- ==========================================================
-- LittleSeedMgmt - Test Environment Complete Setup
-- ==========================================================
-- Safe to run multiple times - handles existing objects
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PART 1: ENUMS (with safe creation)
-- ============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'school_admin', 'teacher', 'staff');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE student_status AS ENUM ('enrolled', 'withdrawn', 'graduated', 'on_leave');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'terminated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE age_group AS ENUM ('infant', 'toddler', 'preschool', 'pre_k');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE shift_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE pto_type AS ENUM ('vacation', 'sick', 'personal', 'unpaid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE teacher_role AS ENUM ('director', 'assistant_director', 'lead_teacher', 'teacher', 'assistant', 'floater');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE shift_type AS ENUM ('regular', 'coverage', 'overtime');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add extra enum values if they don't exist
DO $$ BEGIN
  ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'twos' AFTER 'toddler';
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'threes' AFTER 'twos';
EXCEPTION WHEN others THEN null; END $$;

-- ============================================
-- PART 2: CORE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, school_id)
);

CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  employee_id VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  hire_date DATE NOT NULL,
  status employment_status DEFAULT 'active',
  hourly_rate DECIMAL(10,2),
  pto_balance DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  age_group age_group NOT NULL,
  capacity INTEGER NOT NULL,
  current_enrollment INTEGER DEFAULT 0,
  lead_teacher_id UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  classroom_id UUID REFERENCES classrooms(id),
  guardian_name VARCHAR(255) NOT NULL,
  guardian_phone VARCHAR(20),
  guardian_email VARCHAR(255),
  guardian_relationship VARCHAR(50),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  medical_notes TEXT,
  allergies TEXT,
  status student_status DEFAULT 'enrolled',
  enrollment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  status attendance_status NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  actual_start TIME,
  actual_end TIME,
  status shift_status DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pto_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type pto_type NOT NULL,
  hours_requested DECIMAL(5,2) NOT NULL,
  status approval_status DEFAULT 'pending',
  notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: ADD COLUMNS TO TEACHERS (if missing)
-- ============================================

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS role teacher_role DEFAULT 'teacher';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS classroom_title VARCHAR(100);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS regular_shift_start TIME;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS regular_shift_end TIME;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS lunch_break_start TIME;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS lunch_break_end TIME;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS qualifications VARCHAR(255);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS degrees VARCHAR(100);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS pto_balance_vacation DECIMAL(5,2) DEFAULT 0;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS pto_balance_sick DECIMAL(5,2) DEFAULT 0;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS pto_balance_personal DECIMAL(5,2) DEFAULT 0;

-- ============================================
-- PART 4: ADD COLUMNS TO SHIFTS (if missing)
-- ============================================

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_type shift_type DEFAULT 'regular';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break1_start TIME;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break1_end TIME;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS lunch_start TIME;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS lunch_end TIME;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break2_start TIME;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break2_end TIME;

-- ============================================
-- PART 5: INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_classroom ON students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(school_id, status);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_role ON teachers(school_id, role);
CREATE INDEX IF NOT EXISTS idx_classrooms_school ON classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance(school_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_shifts_school_date ON shifts(school_id, date);
CREATE INDEX IF NOT EXISTS idx_shifts_teacher ON shifts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_shifts_classroom ON shifts(classroom_id, date);
CREATE INDEX IF NOT EXISTS idx_pto_school ON pto_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_pto_teacher ON pto_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_pto_status ON pto_requests(school_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_school ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================
-- PART 6: TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schools_updated_at ON schools;
CREATE TRIGGER schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS teachers_updated_at ON teachers;
CREATE TRIGGER teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS classrooms_updated_at ON classrooms;
CREATE TRIGGER classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS students_updated_at ON students;
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS attendance_updated_at ON attendance;
CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS shifts_updated_at ON shifts;
CREATE TRIGGER shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS pto_requests_updated_at ON pto_requests;
CREATE TRIGGER pto_requests_updated_at BEFORE UPDATE ON pto_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PART 7: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION get_user_schools(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT school_id FROM user_roles WHERE user_id = user_uuid AND school_id IS NOT NULL
  UNION
  SELECT id FROM schools WHERE EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid AND role = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Drop existing policies first
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS user_roles_select ON user_roles;
DROP POLICY IF EXISTS schools_select ON schools;
DROP POLICY IF EXISTS teachers_select ON teachers;
DROP POLICY IF EXISTS teachers_insert ON teachers;
DROP POLICY IF EXISTS teachers_update ON teachers;
DROP POLICY IF EXISTS teachers_delete ON teachers;
DROP POLICY IF EXISTS classrooms_select ON classrooms;
DROP POLICY IF EXISTS classrooms_insert ON classrooms;
DROP POLICY IF EXISTS classrooms_update ON classrooms;
DROP POLICY IF EXISTS classrooms_delete ON classrooms;
DROP POLICY IF EXISTS students_select ON students;
DROP POLICY IF EXISTS students_insert ON students;
DROP POLICY IF EXISTS students_update ON students;
DROP POLICY IF EXISTS students_delete ON students;
DROP POLICY IF EXISTS attendance_select ON attendance;
DROP POLICY IF EXISTS attendance_insert ON attendance;
DROP POLICY IF EXISTS attendance_update ON attendance;
DROP POLICY IF EXISTS attendance_delete ON attendance;
DROP POLICY IF EXISTS shifts_select ON shifts;
DROP POLICY IF EXISTS shifts_insert ON shifts;
DROP POLICY IF EXISTS shifts_update ON shifts;
DROP POLICY IF EXISTS shifts_delete ON shifts;
DROP POLICY IF EXISTS pto_select ON pto_requests;
DROP POLICY IF EXISTS pto_insert ON pto_requests;
DROP POLICY IF EXISTS pto_update ON pto_requests;
DROP POLICY IF EXISTS pto_delete ON pto_requests;
DROP POLICY IF EXISTS audit_select ON audit_logs;

-- Create policies
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY user_roles_select ON user_roles FOR SELECT USING (user_id = auth.uid());

CREATE POLICY schools_select ON schools FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  OR id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND school_id IS NOT NULL)
);

CREATE POLICY teachers_select ON teachers FOR SELECT USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY teachers_insert ON teachers FOR INSERT WITH CHECK (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY teachers_update ON teachers FOR UPDATE USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY teachers_delete ON teachers FOR DELETE USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY classrooms_select ON classrooms FOR SELECT USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY classrooms_insert ON classrooms FOR INSERT WITH CHECK (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY classrooms_update ON classrooms FOR UPDATE USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY classrooms_delete ON classrooms FOR DELETE USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY students_select ON students FOR SELECT USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY students_insert ON students FOR INSERT WITH CHECK (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY students_update ON students FOR UPDATE USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY students_delete ON students FOR DELETE USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY attendance_select ON attendance FOR SELECT USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY attendance_insert ON attendance FOR INSERT WITH CHECK (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY attendance_update ON attendance FOR UPDATE USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY attendance_delete ON attendance FOR DELETE USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY shifts_select ON shifts FOR SELECT USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY shifts_insert ON shifts FOR INSERT WITH CHECK (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY shifts_update ON shifts FOR UPDATE USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY shifts_delete ON shifts FOR DELETE USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY pto_select ON pto_requests FOR SELECT USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY pto_insert ON pto_requests FOR INSERT WITH CHECK (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY pto_update ON pto_requests FOR UPDATE USING (school_id IN (SELECT get_user_schools(auth.uid())));
CREATE POLICY pto_delete ON pto_requests FOR DELETE USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY audit_select ON audit_logs FOR SELECT USING (school_id IN (SELECT get_user_schools(auth.uid())));

-- ============================================
-- PART 8: AUTO USER SETUP
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role, school_id)
    VALUES (NEW.id, 'super_admin', NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- PART 9: VIEWS
-- ============================================

DROP VIEW IF EXISTS daily_attendance_summary;
CREATE VIEW daily_attendance_summary AS
SELECT
  a.school_id,
  a.date,
  COUNT(*) FILTER (WHERE status = 'present') as present_count,
  COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
  COUNT(*) FILTER (WHERE status = 'late') as late_count,
  COUNT(*) FILTER (WHERE status = 'excused') as excused_count,
  COUNT(*) as total_recorded
FROM attendance a
GROUP BY a.school_id, a.date;

DROP VIEW IF EXISTS classroom_enrollment;
CREATE VIEW classroom_enrollment AS
SELECT
  c.id as classroom_id,
  c.school_id,
  c.name as classroom_name,
  c.age_group,
  c.capacity,
  COUNT(s.id) as current_enrollment,
  c.capacity - COUNT(s.id) as available_spots
FROM classrooms c
LEFT JOIN students s ON s.classroom_id = c.id AND s.status = 'enrolled'
GROUP BY c.id;

-- ============================================
-- PART 10: SEED DATA
-- ============================================

-- Schools (only insert if not exists)
INSERT INTO schools (name, city, state)
SELECT 'Peter Pan Mariner Square', 'Alameda', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE name = 'Peter Pan Mariner Square');

INSERT INTO schools (name, city, state)
SELECT 'Little Seeds Children''s Center', 'Alameda', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE name = 'Little Seeds Children''s Center');

INSERT INTO schools (name, city, state)
SELECT 'Peter Pan Harbor Bay', 'Alameda', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Classrooms (only insert if not exists)
INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Caterpillars', 'infant', 12 FROM schools WHERE name = 'Peter Pan Mariner Square'
  AND NOT EXISTS (SELECT 1 FROM classrooms c JOIN schools s ON c.school_id = s.id WHERE s.name = 'Peter Pan Mariner Square' AND c.name = 'Caterpillars');

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Tigers', 'twos', 16 FROM schools WHERE name = 'Peter Pan Mariner Square'
  AND NOT EXISTS (SELECT 1 FROM classrooms c JOIN schools s ON c.school_id = s.id WHERE s.name = 'Peter Pan Mariner Square' AND c.name = 'Tigers');

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Ponies', 'threes', 20 FROM schools WHERE name = 'Peter Pan Mariner Square'
  AND NOT EXISTS (SELECT 1 FROM classrooms c JOIN schools s ON c.school_id = s.id WHERE s.name = 'Peter Pan Mariner Square' AND c.name = 'Ponies');

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Soda Pop', 'pre_k', 24 FROM schools WHERE name = 'Peter Pan Mariner Square'
  AND NOT EXISTS (SELECT 1 FROM classrooms c JOIN schools s ON c.school_id = s.id WHERE s.name = 'Peter Pan Mariner Square' AND c.name = 'Soda Pop');

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Squirrels', 'infant', 12 FROM schools WHERE name = 'Little Seeds Children''s Center'
  AND NOT EXISTS (SELECT 1 FROM classrooms c JOIN schools s ON c.school_id = s.id WHERE s.name = 'Little Seeds Children''s Center' AND c.name = 'Squirrels');

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Bunnies', 'twos', 16 FROM schools WHERE name = 'Little Seeds Children''s Center'
  AND NOT EXISTS (SELECT 1 FROM classrooms c JOIN schools s ON c.school_id = s.id WHERE s.name = 'Little Seeds Children''s Center' AND c.name = 'Bunnies');

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Bears', 'pre_k', 24 FROM schools WHERE name = 'Little Seeds Children''s Center'
  AND NOT EXISTS (SELECT 1 FROM classrooms c JOIN schools s ON c.school_id = s.id WHERE s.name = 'Little Seeds Children''s Center' AND c.name = 'Bears');

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Ladybugs', 'infant', 12 FROM schools WHERE name = 'Peter Pan Harbor Bay'
  AND NOT EXISTS (SELECT 1 FROM classrooms c JOIN schools s ON c.school_id = s.id WHERE s.name = 'Peter Pan Harbor Bay' AND c.name = 'Ladybugs');

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Dragonflies', 'pre_k', 24 FROM schools WHERE name = 'Peter Pan Harbor Bay'
  AND NOT EXISTS (SELECT 1 FROM classrooms c JOIN schools s ON c.school_id = s.id WHERE s.name = 'Peter Pan Harbor Bay' AND c.name = 'Dragonflies');

-- Sample Teachers (only insert if not exists)
INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, qualifications, degrees, years_experience, hire_date, status)
SELECT s.id, 'Julie', 'DeMauri', 'director', 'Director', '08:30', '17:30', 'Infant & Preschool Director Qualified', 'AA', 40, '2000-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
  AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.school_id = s.id AND t.first_name = 'Julie' AND t.last_name = 'DeMauri');

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, qualifications, degrees, years_experience, hire_date, status)
SELECT s.id, 'Sarah', 'Hallford', 'director', 'Director', '08:30', '17:30', 'Infant & Preschool Director Qualified', 'AA', 20, '2004-01-01', 'active'
FROM schools s WHERE s.name = 'Little Seeds Children''s Center'
  AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.school_id = s.id AND t.first_name = 'Sarah' AND t.last_name = 'Hallford');

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, qualifications, degrees, years_experience, hire_date, status)
SELECT s.id, 'Theresa', 'Clement', 'director', 'Director', '08:30', '17:30', 'Infant & Preschool Director Qualified', 'AA', 40, '1984-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Harbor Bay'
  AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.school_id = s.id AND t.first_name = 'Theresa' AND t.last_name = 'Clement');

-- Sample Students
CREATE OR REPLACE FUNCTION random_date(start_date DATE, end_date DATE)
RETURNS DATE AS $$
BEGIN
  RETURN start_date + (random() * (end_date - start_date))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Only insert students if none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM students LIMIT 1) THEN
    -- Tigers classroom students
    INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
    SELECT s.id, c.id, names.first_name, names.last_name, random_date('2022-06-01', '2023-12-01'),
      names.guardian, '510-555-' || LPAD((1100 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
      LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com', 'Parent', 'enrolled'
    FROM schools s
    JOIN classrooms c ON c.school_id = s.id AND c.name = 'Tigers'
    CROSS JOIN (VALUES
      ('Ethan', 'Anderson', 'Lisa Anderson'),
      ('Isabella', 'Thomas', 'James Thomas'),
      ('Mason', 'Taylor', 'Amanda Taylor'),
      ('Charlotte', 'Moore', 'Brian Moore'),
      ('Logan', 'Jackson', 'Nicole Jackson'),
      ('Amelia', 'Martin', 'Kevin Martin')
    ) AS names(first_name, last_name, guardian)
    WHERE s.name = 'Peter Pan Mariner Square';

    -- Soda Pop classroom students
    INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
    SELECT s.id, c.id, names.first_name, names.last_name, random_date('2020-06-01', '2021-12-01'),
      names.guardian, '510-555-' || LPAD((1300 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
      LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com', 'Parent', 'enrolled'
    FROM schools s
    JOIN classrooms c ON c.school_id = s.id AND c.name = 'Soda Pop'
    CROSS JOIN (VALUES
      ('Daniel', 'Adams', 'Rachel Adams'),
      ('Chloe', 'Nelson', 'Timothy Nelson'),
      ('Matthew', 'Hill', 'Melissa Hill'),
      ('Victoria', 'Ramirez', 'Jose Ramirez'),
      ('Joseph', 'Campbell', 'Amy Campbell'),
      ('Penelope', 'Mitchell', 'Ryan Mitchell')
    ) AS names(first_name, last_name, guardian)
    WHERE s.name = 'Peter Pan Mariner Square';

    -- Bears classroom students
    INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
    SELECT s.id, c.id, names.first_name, names.last_name, random_date('2020-06-01', '2021-12-01'),
      names.guardian, '510-555-' || LPAD((2300 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
      LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com', 'Parent', 'enrolled'
    FROM schools s
    JOIN classrooms c ON c.school_id = s.id AND c.name = 'Bears'
    CROSS JOIN (VALUES
      ('Jayden', 'James', 'Betty James'),
      ('Savannah', 'Watson', 'Gerald Watson'),
      ('Gabriel', 'Brooks', 'Joyce Brooks'),
      ('Audrey', 'Kelly', 'Russell Kelly')
    ) AS names(first_name, last_name, guardian)
    WHERE s.name = 'Little Seeds Children''s Center';

    -- Dragonflies classroom students
    INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
    SELECT s.id, c.id, names.first_name, names.last_name, random_date('2020-06-01', '2021-12-01'),
      names.guardian, '510-555-' || LPAD((3300 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
      LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com', 'Parent', 'enrolled'
    FROM schools s
    JOIN classrooms c ON c.school_id = s.id AND c.name = 'Dragonflies'
    CROSS JOIN (VALUES
      ('Colton', 'Graham', 'Diane Graham'),
      ('Ruby', 'Sullivan', 'Harold Sullivan'),
      ('Landon', 'Wallace', 'Denise Wallace'),
      ('Autumn', 'Woods', 'Jesse Woods')
    ) AS names(first_name, last_name, guardian)
    WHERE s.name = 'Peter Pan Harbor Bay';
  END IF;
END $$;

DROP FUNCTION IF EXISTS random_date(DATE, DATE);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  school_count INTEGER;
  classroom_count INTEGER;
  teacher_count INTEGER;
  student_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO school_count FROM schools;
  SELECT COUNT(*) INTO classroom_count FROM classrooms;
  SELECT COUNT(*) INTO teacher_count FROM teachers;
  SELECT COUNT(*) INTO student_count FROM students;

  RAISE NOTICE '=== TEST ENVIRONMENT SETUP COMPLETE ===';
  RAISE NOTICE 'Schools: %', school_count;
  RAISE NOTICE 'Classrooms: %', classroom_count;
  RAISE NOTICE 'Teachers: %', teacher_count;
  RAISE NOTICE 'Students: %', student_count;
END $$;
