-- LittleSeedMgmt Seed Data
-- Classrooms and Teachers for all three schools

-- ============================================
-- SEED CLASSROOMS
-- ============================================

-- Peter Pan Mariner Square classrooms
INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Caterpillars', 'infant', 12 FROM schools WHERE name = 'Peter Pan Mariner Square'
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Tadpoles', 'toddler', 12 FROM schools WHERE name = 'Peter Pan Mariner Square'
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Tigers', 'twos', 16 FROM schools WHERE name = 'Peter Pan Mariner Square'
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Ponies', 'threes', 20 FROM schools WHERE name = 'Peter Pan Mariner Square'
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Soda Pop', 'pre_k', 24 FROM schools WHERE name = 'Peter Pan Mariner Square'
ON CONFLICT (school_id, name) DO NOTHING;

-- Little Seeds Children's Center classrooms
INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Squirrels', 'infant', 12 FROM schools WHERE name = 'Little Seeds Children''s Center'
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Bunnies', 'twos', 16 FROM schools WHERE name = 'Little Seeds Children''s Center'
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Chipmunks', 'threes', 20 FROM schools WHERE name = 'Little Seeds Children''s Center'
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Bears', 'pre_k', 24 FROM schools WHERE name = 'Little Seeds Children''s Center'
ON CONFLICT (school_id, name) DO NOTHING;

-- Peter Pan Harbor Bay classrooms
INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Ladybugs', 'infant', 12 FROM schools WHERE name = 'Peter Pan Harbor Bay'
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Grasshoppers', 'twos', 16 FROM schools WHERE name = 'Peter Pan Harbor Bay'
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Butterflies', 'threes', 20 FROM schools WHERE name = 'Peter Pan Harbor Bay'
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO classrooms (school_id, name, age_group, capacity)
SELECT id, 'Dragonflies', 'pre_k', 24 FROM schools WHERE name = 'Peter Pan Harbor Bay'
ON CONFLICT (school_id, name) DO NOTHING;

-- ============================================
-- SEED TEACHERS - Peter Pan Mariner Square
-- ============================================

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, degrees, years_experience, hire_date, status)
SELECT s.id, 'Julie', 'DeMauri', 'director', 'Director', '08:30', '17:30', '14:30', '15:30', 'Infant & Preschool Director Qualified', 'AA', 40, '2000-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, degrees, years_experience, hire_date, status)
SELECT s.id, 'Shannon', 'Atthowe', 'assistant_director', 'Assistant Director', '07:30', '17:00', '12:00', '13:30', 'Infant & Preschool Director Qualified', 'BA', 6, '2018-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Pat', 'Adkins', 'lead_teacher', 'Lead Infant Teacher (Upstairs)', '08:30', '17:30', '13:30', '14:30', 'Infant & Preschool Teacher Qualified', 35, '1990-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Isabel', 'Kasaab', 'assistant', 'Teacher Assistant (Upstairs Infant)', '08:30', '12:30', 'No Units', 3, '2021-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Macekshia', 'Stevenson', 'assistant', 'Teacher Assistant (Upstairs Infant)', '13:30', '17:30', 'No Units', 2, '2022-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Shelly', 'Ortiz', 'assistant', 'Teacher Assistant (Downstairs Infant)', '07:30', '17:00', '12:00', '13:30', 'Partially Qualified Preschool (9 Units)', 20, '2004-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Sally', 'Du', 'teacher', 'Teacher (Downstairs Infant)', '08:30', '17:30', '12:00', '13:00', 'Infant & Preschool Teacher Qualified', 10, '2014-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Sherry', 'Chan', 'teacher', 'Teacher (Downstairs Infant)', '08:30', '17:30', '12:00', '13:00', 'Infant & Preschool Teacher Qualified', 10, '2014-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Maricon', 'Alcontin', 'assistant', 'Teacher Assistant (Tigers 2s)', '08:30', '17:30', '13:00', '14:00', 'Partially Qualified Preschool (9 Units)', 10, '2014-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Corazon', 'Velasquez', 'teacher', 'Teacher (Tigers 2s)', '08:00', '17:00', '12:00', '13:00', 'Qualified Preschool Teacher', 20, '2004-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Muoi', 'Tran', 'assistant', 'Teacher Assistant (Tigers 2s)', '08:00', '17:00', '12:30', '13:30', 'No Units', 15, '2009-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Angel', 'Lewis', 'lead_teacher', 'Lead Teacher (Ponies 3s)', '08:15', '17:15', '13:00', '14:00', 'Qualified Preschool Teacher', 20, '2004-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Shirley', 'Liu', 'teacher', 'Teacher (Ponies 3s)', '07:30', '17:00', '12:00', '13:00', 'Infant & Preschool Teacher Qualified', 20, '2004-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, degrees, years_experience, hire_date, status)
SELECT s.id, 'Christina', 'Sagun', 'lead_teacher', 'Lead Teacher (Pre-K 4-5)', '08:30', '17:30', '13:30', '14:30', 'Infant & Preschool Director Qualified', 'BA', 10, '2014-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Kevin', 'Dupre', 'teacher', 'Teacher (Pre-K 4-5)', '08:00', '17:00', '12:30', '13:30', 'Qualified Preschool Teacher', 30, '1994-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, degrees, years_experience, hire_date, status)
SELECT s.id, 'Jules', 'Leung', 'teacher', 'Teacher (Pre-K 4-5)', '08:15', '17:15', '13:30', '14:30', 'Infant & Preschool Teacher Qualified', 'BA', 3, '2021-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Aura', 'Batres', 'floater', 'Teacher (Floater)', '10:30', '17:30', '13:30', '14:30', 'Infant & Preschool Teacher Qualified', 20, '2004-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Tiffany', 'Louie', 'floater', 'Teacher (Cross-School Floater)', '08:15', '17:15', '13:00', '14:00', 'Qualified Preschool Teacher', 10, '2014-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Mariner Square'
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED TEACHERS - Little Seeds Children's Center
-- ============================================

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, qualifications, degrees, years_experience, hire_date, status)
SELECT s.id, 'Sarah', 'Hallford', 'director', 'Director', '08:30', '17:30', 'Infant & Preschool Director Qualified', 'AA', 20, '2004-01-01', 'active'
FROM schools s WHERE s.name = 'Little Seeds Children''s Center'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Judi', 'Thach', 'lead_teacher', 'Lead Infant Teacher (Squirrels)', '08:00', '17:00', '12:00', '13:00', 'Infant & Preschool Teacher Qualified', 15, '2009-01-01', 'active'
FROM schools s WHERE s.name = 'Little Seeds Children''s Center'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Tam', 'Tran', 'assistant', 'Teacher Assistant (Squirrels)', '08:30', '17:30', '13:00', '14:00', 'Partially Qualified Preschool (9 Units)', 15, '2009-01-01', 'active'
FROM schools s WHERE s.name = 'Little Seeds Children''s Center'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Kristy', 'Meli', 'teacher', 'Teacher (Bunnies 2s)', '07:30', '17:00', '13:00', '14:30', 'Infant & Preschool Teacher Qualified', 20, '2004-01-01', 'active'
FROM schools s WHERE s.name = 'Little Seeds Children''s Center'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Quyen', 'Duong', 'assistant', 'Teacher Assistant (Bunnies 2s)', '08:15', '17:15', '12:00', '13:00', 'Partially Qualified Preschool (9 Units)', 20, '2004-01-01', 'active'
FROM schools s WHERE s.name = 'Little Seeds Children''s Center'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Sonia', 'Hernandez', 'teacher', 'Teacher (Chipmunks 3s)', '08:30', '17:30', '12:00', '13:00', 'Preschool Director Qualified', 20, '2004-01-01', 'active'
FROM schools s WHERE s.name = 'Little Seeds Children''s Center'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Mona', 'Watson', 'teacher', 'Teacher (Bears 4-5)', '07:30', '17:00', '13:00', '14:30', 'Infant & Preschool Director Qualified', 30, '1994-01-01', 'active'
FROM schools s WHERE s.name = 'Little Seeds Children''s Center'
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED TEACHERS - Peter Pan Harbor Bay
-- ============================================

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, qualifications, degrees, years_experience, hire_date, status)
SELECT s.id, 'Theresa', 'Clement', 'director', 'Director', '08:30', '17:30', 'Infant & Preschool Director Qualified', 'AA', 40, '1984-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Harbor Bay'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Kirsten', 'Cesar', 'lead_teacher', 'Teacher (Ladybugs)', '07:30', '16:30', '13:00', '14:00', 'Infant & Preschool Teacher Qualified', 10, '2014-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Harbor Bay'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Thao', 'Ho', 'teacher', 'Teacher (Ladybugs)', '07:30', '16:30', '12:00', '13:00', 'Infant & Preschool Teacher Qualified', 10, '2014-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Harbor Bay'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Melody', 'Chan', 'assistant', 'Teacher Assistant (Ladybugs)', '08:15', '17:15', '12:30', '13:30', 'No Units', 3, '2021-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Harbor Bay'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Anotnia', 'Ortiz', 'teacher', 'Teacher (Grasshopper)', '07:30', '16:30', '12:00', '13:00', 'Infant & Preschool Teacher Qualified', 25, '1999-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Harbor Bay'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Vynn', 'Alcontin', 'teacher', 'Teacher (Butterflies)', '08:30', '17:30', '12:30', '13:30', 'Qualified Preschool Teacher', 15, '2009-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Harbor Bay'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, degrees, years_experience, hire_date, status)
SELECT s.id, 'Lois', 'Steenhard', 'teacher', 'Teacher (Dragonflies)', '08:15', '17:15', '12:00', '13:00', 'Infant & Preschool Teacher Qualified', 'BA', 40, '1984-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Harbor Bay'
ON CONFLICT DO NOTHING;

INSERT INTO teachers (school_id, first_name, last_name, role, classroom_title, regular_shift_start, regular_shift_end, lunch_break_start, lunch_break_end, qualifications, years_experience, hire_date, status)
SELECT s.id, 'Jennie', 'Mendoza', 'teacher', 'Teacher (Dragonflies)', '08:30', '17:30', '13:00', '14:00', 'Infant & Preschool Director Qualified', 40, '1984-01-01', 'active'
FROM schools s WHERE s.name = 'Peter Pan Harbor Bay'
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFY SEED DATA
-- ============================================

DO $$
DECLARE
  school_count INTEGER;
  classroom_count INTEGER;
  teacher_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO school_count FROM schools;
  SELECT COUNT(*) INTO classroom_count FROM classrooms;
  SELECT COUNT(*) INTO teacher_count FROM teachers;

  RAISE NOTICE 'Seed data loaded: % schools, % classrooms, % teachers', school_count, classroom_count, teacher_count;
END $$;
