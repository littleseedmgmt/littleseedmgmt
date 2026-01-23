-- LittleSeedMgmt Initial Schema
-- Run this in your Supabase SQL Editor or via migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('super_admin', 'school_admin', 'teacher', 'staff');
CREATE TYPE student_status AS ENUM ('enrolled', 'withdrawn', 'graduated', 'on_leave');
CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'terminated');
CREATE TYPE age_group AS ENUM ('infant', 'toddler', 'preschool', 'pre_k');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE shift_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE pto_type AS ENUM ('vacation', 'sick', 'personal', 'unpaid');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================
-- CORE TABLES
-- ============================================

-- Schools table (multi-tenant root)
CREATE TABLE schools (
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

-- Users table (extends Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles (maps users to schools with roles)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, school_id)
);

-- Teachers
CREATE TABLE teachers (
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

-- Classrooms
CREATE TABLE classrooms (
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

-- Students
CREATE TABLE students (
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

-- ============================================
-- APPLICATION TABLES
-- ============================================

-- Attendance
CREATE TABLE attendance (
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

-- Shifts
CREATE TABLE shifts (
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

-- PTO Requests
CREATE TABLE pto_requests (
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

-- Audit Logs
CREATE TABLE audit_logs (
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
-- INDEXES
-- ============================================

CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_classroom ON students(classroom_id);
CREATE INDEX idx_students_status ON students(school_id, status);

CREATE INDEX idx_teachers_school ON teachers(school_id);
CREATE INDEX idx_teachers_user ON teachers(user_id);

CREATE INDEX idx_classrooms_school ON classrooms(school_id);

CREATE INDEX idx_attendance_school_date ON attendance(school_id, date);
CREATE INDEX idx_attendance_student ON attendance(student_id);

CREATE INDEX idx_shifts_school_date ON shifts(school_id, date);
CREATE INDEX idx_shifts_teacher ON shifts(teacher_id);

CREATE INDEX idx_pto_school ON pto_requests(school_id);
CREATE INDEX idx_pto_teacher ON pto_requests(teacher_id);
CREATE INDEX idx_pto_status ON pto_requests(school_id, status);

CREATE INDEX idx_audit_school ON audit_logs(school_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pto_requests_updated_at BEFORE UPDATE ON pto_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
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

-- Helper function to get user's accessible schools
CREATE OR REPLACE FUNCTION get_user_schools(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT school_id FROM user_roles WHERE user_id = user_uuid AND school_id IS NOT NULL
  UNION
  SELECT id FROM schools WHERE EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid AND role = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Users can read their own profile
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);

-- User roles policies
CREATE POLICY user_roles_select ON user_roles FOR SELECT USING (user_id = auth.uid());

-- School data policies
CREATE POLICY schools_select ON schools FOR SELECT USING (id IN (SELECT get_user_schools(auth.uid())));

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
-- SEED DATA
-- ============================================

-- Insert initial schools
INSERT INTO schools (name, city, state) VALUES
  ('LittleSeed North', 'San Jose', 'CA'),
  ('LittleSeed South', 'Fremont', 'CA'),
  ('LittleSeed East', 'Milpitas', 'CA');

-- ============================================
-- VIEWS
-- ============================================

-- Daily attendance summary
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

-- Classroom enrollment view
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
