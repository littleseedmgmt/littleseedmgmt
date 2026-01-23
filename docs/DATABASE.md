# Database Schema Design

## Overview

LittleSeedMgmt uses PostgreSQL via Supabase with Row Level Security (RLS) for multi-tenant data isolation. This document defines the core database schema.

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     schools     │       │      users      │       │   user_roles    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──────▶│ id (PK)         │
│ name            │  │    │ email           │       │ user_id (FK)    │
│ address         │  │    │ full_name       │       │ school_id (FK)  │
│ phone           │  │    │ avatar_url      │       │ role            │
│ timezone        │  │    │ created_at      │       └─────────────────┘
│ created_at      │  │    └─────────────────┘
└─────────────────┘  │
         │           │
         │           │
         ▼           ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    students     │       │    teachers     │       │   classrooms    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ school_id (FK)  │       │ school_id (FK)  │       │ school_id (FK)  │
│ first_name      │       │ user_id (FK)    │       │ name            │
│ last_name       │       │ employee_id     │       │ capacity        │
│ date_of_birth   │       │ hire_date       │       │ age_group       │
│ classroom_id(FK)│       │ status          │       └─────────────────┘
│ guardian_name   │       └─────────────────┘
│ guardian_phone  │
│ guardian_email  │
│ status          │
└─────────────────┘
         │
         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   attendance    │       │     shifts      │       │  pto_requests   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ school_id (FK)  │       │ school_id (FK)  │       │ school_id (FK)  │
│ student_id (FK) │       │ teacher_id (FK) │       │ teacher_id (FK) │
│ date            │       │ date            │       │ start_date      │
│ check_in_time   │       │ start_time      │       │ end_date        │
│ check_out_time  │       │ end_time        │       │ type            │
│ status          │       │ classroom_id(FK)│       │ status          │
│ notes           │       │ status          │       │ notes           │
│ recorded_by(FK) │       └─────────────────┘       │ approved_by(FK) │
└─────────────────┘                                 └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ inventory_items │       │ inventory_orders│       │  audit_logs     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ school_id (FK)  │       │ school_id (FK)  │       │ school_id (FK)  │
│ name            │       │ item_id (FK)    │       │ user_id (FK)    │
│ category        │       │ quantity        │       │ action          │
│ quantity        │       │ unit_price      │       │ table_name      │
│ unit            │       │ total_price     │       │ record_id       │
│ min_threshold   │       │ vendor          │       │ old_values      │
│ location        │       │ status          │       │ new_values      │
└─────────────────┘       │ ordered_by (FK) │       │ created_at      │
                          │ order_date      │       └─────────────────┘
                          │ received_date   │
                          └─────────────────┘
```

## Core Tables

### schools

Central table for multi-tenancy. All other tables reference this.

```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Initial schools
INSERT INTO schools (name, city, state) VALUES
  ('LittleSeed North', 'San Jose', 'CA'),
  ('LittleSeed South', 'Fremont', 'CA'),
  ('LittleSeed East', 'Milpitas', 'CA');
```

### users

Extends Supabase Auth users with profile information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### user_roles

Maps users to schools with specific roles.

```sql
CREATE TYPE user_role AS ENUM ('super_admin', 'school_admin', 'teacher', 'staff');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- NULL for super_admin
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, school_id)
);
```

### students

```sql
CREATE TYPE student_status AS ENUM ('enrolled', 'withdrawn', 'graduated', 'on_leave');

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_classroom ON students(classroom_id);
CREATE INDEX idx_students_status ON students(school_id, status);
```

### teachers

```sql
CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'terminated');

CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_teachers_school ON teachers(school_id);
CREATE INDEX idx_teachers_user ON teachers(user_id);
```

### classrooms

```sql
CREATE TYPE age_group AS ENUM ('infant', 'toddler', 'preschool', 'pre_k');

CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_classrooms_school ON classrooms(school_id);
```

### attendance

```sql
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_attendance_school_date ON attendance(school_id, date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
```

### shifts

```sql
CREATE TYPE shift_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_shifts_school_date ON shifts(school_id, date);
CREATE INDEX idx_shifts_teacher ON shifts(teacher_id);
```

### pto_requests

```sql
CREATE TYPE pto_type AS ENUM ('vacation', 'sick', 'personal', 'unpaid');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE pto_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_pto_school ON pto_requests(school_id);
CREATE INDEX idx_pto_teacher ON pto_requests(teacher_id);
CREATE INDEX idx_pto_status ON pto_requests(school_id, status);
```

### inventory_items

```sql
CREATE TYPE inventory_category AS ENUM (
  'food', 'supplies', 'educational', 'cleaning',
  'medical', 'office', 'furniture', 'other'
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category inventory_category NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(50) NOT NULL,
  min_threshold DECIMAL(10,2),
  location VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

CREATE INDEX idx_inventory_school ON inventory_items(school_id);
CREATE INDEX idx_inventory_category ON inventory_items(school_id, category);
```

### inventory_orders

```sql
CREATE TYPE order_status AS ENUM ('draft', 'submitted', 'approved', 'ordered', 'received', 'cancelled');

CREATE TABLE inventory_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  vendor VARCHAR(255),
  status order_status DEFAULT 'draft',
  ordered_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  order_date DATE,
  expected_date DATE,
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_school ON inventory_orders(school_id);
CREATE INDEX idx_orders_status ON inventory_orders(school_id, status);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_audit_school ON audit_logs(school_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

## Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Helper function to get user's accessible schools
CREATE OR REPLACE FUNCTION get_user_schools(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT school_id FROM user_roles WHERE user_id = user_uuid
  UNION
  SELECT id FROM schools WHERE EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid AND role = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Example RLS policy for students
CREATE POLICY students_select ON students
  FOR SELECT
  USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY students_insert ON students
  FOR INSERT
  WITH CHECK (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY students_update ON students
  FOR UPDATE
  USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY students_delete ON students
  FOR DELETE
  USING (school_id IN (SELECT get_user_schools(auth.uid())));
```

## Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Audit log trigger
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    school_id,
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.school_id, OLD.school_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Views

```sql
-- Daily attendance summary
CREATE VIEW daily_attendance_summary AS
SELECT
  a.school_id,
  a.date,
  COUNT(*) FILTER (WHERE status = 'present') as present_count,
  COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
  COUNT(*) FILTER (WHERE status = 'late') as late_count,
  COUNT(*) FILTER (WHERE status = 'excused') as excused_count,
  COUNT(*) as total_students
FROM attendance a
GROUP BY a.school_id, a.date;

-- Current classroom enrollment
CREATE VIEW classroom_enrollment AS
SELECT
  c.id as classroom_id,
  c.school_id,
  c.name as classroom_name,
  c.capacity,
  COUNT(s.id) as current_enrollment,
  c.capacity - COUNT(s.id) as available_spots
FROM classrooms c
LEFT JOIN students s ON s.classroom_id = c.id AND s.status = 'enrolled'
GROUP BY c.id;

-- Low inventory alerts
CREATE VIEW low_inventory_alerts AS
SELECT *
FROM inventory_items
WHERE quantity <= min_threshold
AND min_threshold IS NOT NULL;
```
