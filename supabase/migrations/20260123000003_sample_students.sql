-- Sample Students for Testing Attendance
-- Creates 8-12 students per classroom with age-appropriate birthdates

-- Helper function to generate random date within range
CREATE OR REPLACE FUNCTION random_date(start_date DATE, end_date DATE)
RETURNS DATE AS $$
BEGIN
  RETURN start_date + (random() * (end_date - start_date))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PETER PAN MARINER SQUARE STUDENTS
-- ============================================

-- Caterpillars (Infants) - born 2024-2025
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2024-06-01', '2025-06-01'),
  names.guardian, '510-555-' || LPAD((1000 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Caterpillars'
CROSS JOIN (VALUES
  ('Emma', 'Johnson', 'Michael Johnson'),
  ('Liam', 'Williams', 'Sarah Williams'),
  ('Olivia', 'Brown', 'David Brown'),
  ('Noah', 'Jones', 'Jennifer Jones'),
  ('Ava', 'Garcia', 'Maria Garcia'),
  ('Sophia', 'Miller', 'Robert Miller'),
  ('Lucas', 'Davis', 'Emily Davis'),
  ('Mia', 'Martinez', 'Carlos Martinez')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Peter Pan Mariner Square';

-- Tigers (2s) - born 2022-2023
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2022-06-01', '2023-12-01'),
  names.guardian, '510-555-' || LPAD((1100 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Tigers'
CROSS JOIN (VALUES
  ('Ethan', 'Anderson', 'Lisa Anderson'),
  ('Isabella', 'Thomas', 'James Thomas'),
  ('Mason', 'Taylor', 'Amanda Taylor'),
  ('Charlotte', 'Moore', 'Brian Moore'),
  ('Logan', 'Jackson', 'Nicole Jackson'),
  ('Amelia', 'Martin', 'Kevin Martin'),
  ('James', 'Lee', 'Susan Lee'),
  ('Harper', 'Perez', 'Juan Perez'),
  ('Benjamin', 'White', 'Karen White'),
  ('Evelyn', 'Harris', 'Steven Harris')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Peter Pan Mariner Square';

-- Ponies (3s) - born 2021-2022
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2021-06-01', '2022-12-01'),
  names.guardian, '510-555-' || LPAD((1200 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Ponies'
CROSS JOIN (VALUES
  ('Alexander', 'Clark', 'Michelle Clark'),
  ('Abigail', 'Lewis', 'Daniel Lewis'),
  ('William', 'Robinson', 'Patricia Robinson'),
  ('Emily', 'Walker', 'Christopher Walker'),
  ('Henry', 'Young', 'Elizabeth Young'),
  ('Ella', 'Allen', 'Matthew Allen'),
  ('Sebastian', 'King', 'Jessica King'),
  ('Scarlett', 'Wright', 'Andrew Wright'),
  ('Jack', 'Scott', 'Laura Scott'),
  ('Grace', 'Green', 'Mark Green'),
  ('Owen', 'Baker', 'Stephanie Baker')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Peter Pan Mariner Square';

-- Soda Pop (Pre-K 4-5) - born 2020-2021
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2020-06-01', '2021-12-01'),
  names.guardian, '510-555-' || LPAD((1300 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Soda Pop'
CROSS JOIN (VALUES
  ('Daniel', 'Adams', 'Rachel Adams'),
  ('Chloe', 'Nelson', 'Timothy Nelson'),
  ('Matthew', 'Hill', 'Melissa Hill'),
  ('Victoria', 'Ramirez', 'Jose Ramirez'),
  ('Joseph', 'Campbell', 'Amy Campbell'),
  ('Penelope', 'Mitchell', 'Ryan Mitchell'),
  ('Samuel', 'Roberts', 'Christine Roberts'),
  ('Riley', 'Carter', 'Brandon Carter'),
  ('David', 'Phillips', 'Heather Phillips'),
  ('Zoey', 'Evans', 'Jeffrey Evans'),
  ('Carter', 'Turner', 'Kimberly Turner'),
  ('Nora', 'Torres', 'Luis Torres')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Peter Pan Mariner Square';

-- ============================================
-- LITTLE SEEDS CHILDREN'S CENTER STUDENTS
-- ============================================

-- Squirrels (Infants)
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2024-06-01', '2025-06-01'),
  names.guardian, '510-555-' || LPAD((2000 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Squirrels'
CROSS JOIN (VALUES
  ('Lily', 'Parker', 'Thomas Parker'),
  ('Jackson', 'Edwards', 'Nancy Edwards'),
  ('Aria', 'Collins', 'George Collins'),
  ('Aiden', 'Stewart', 'Sandra Stewart'),
  ('Layla', 'Sanchez', 'Miguel Sanchez'),
  ('Grayson', 'Morris', 'Deborah Morris')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Little Seeds Children''s Center';

-- Bunnies (2s)
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2022-06-01', '2023-12-01'),
  names.guardian, '510-555-' || LPAD((2100 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Bunnies'
CROSS JOIN (VALUES
  ('Elijah', 'Rogers', 'Donna Rogers'),
  ('Hannah', 'Reed', 'Kenneth Reed'),
  ('Leo', 'Cook', 'Linda Cook'),
  ('Aurora', 'Morgan', 'Paul Morgan'),
  ('Ezra', 'Bell', 'Sharon Bell'),
  ('Luna', 'Murphy', 'Dennis Murphy'),
  ('Lincoln', 'Bailey', 'Carol Bailey'),
  ('Stella', 'Rivera', 'Edward Rivera')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Little Seeds Children''s Center';

-- Chipmunks (3s)
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2021-06-01', '2022-12-01'),
  names.guardian, '510-555-' || LPAD((2200 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Chipmunks'
CROSS JOIN (VALUES
  ('Miles', 'Cooper', 'Angela Cooper'),
  ('Hazel', 'Richardson', 'Frank Richardson'),
  ('Asher', 'Cox', 'Dorothy Cox'),
  ('Violet', 'Howard', 'Ronald Howard'),
  ('Levi', 'Ward', 'Marie Ward'),
  ('Ivy', 'Torres', 'Raymond Torres'),
  ('Mateo', 'Peterson', 'Janet Peterson'),
  ('Willow', 'Gray', 'Henry Gray'),
  ('Wyatt', 'Ramirez', 'Virginia Ramirez')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Little Seeds Children''s Center';

-- Bears (Pre-K 4-5)
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2020-06-01', '2021-12-01'),
  names.guardian, '510-555-' || LPAD((2300 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Bears'
CROSS JOIN (VALUES
  ('Jayden', 'James', 'Betty James'),
  ('Savannah', 'Watson', 'Gerald Watson'),
  ('Gabriel', 'Brooks', 'Joyce Brooks'),
  ('Audrey', 'Kelly', 'Russell Kelly'),
  ('Julian', 'Sanders', 'Theresa Sanders'),
  ('Brooklyn', 'Price', 'Roy Price'),
  ('Anthony', 'Bennett', 'Diana Bennett'),
  ('Claire', 'Wood', 'Eugene Wood'),
  ('Isaac', 'Barnes', 'Gloria Barnes'),
  ('Natalie', 'Ross', 'Wayne Ross')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Little Seeds Children''s Center';

-- ============================================
-- PETER PAN HARBOR BAY STUDENTS
-- ============================================

-- Ladybugs (Infants)
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2024-06-01', '2025-06-01'),
  names.guardian, '510-555-' || LPAD((3000 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Ladybugs'
CROSS JOIN (VALUES
  ('Hudson', 'Henderson', 'Carolyn Henderson'),
  ('Emilia', 'Coleman', 'Jerry Coleman'),
  ('Kai', 'Jenkins', 'Kathryn Jenkins'),
  ('Maya', 'Perry', 'Larry Perry'),
  ('Maverick', 'Powell', 'Ann Powell'),
  ('Elena', 'Long', 'Albert Long')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Peter Pan Harbor Bay';

-- Grasshoppers (2s)
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2022-06-01', '2023-12-01'),
  names.guardian, '510-555-' || LPAD((3100 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Grasshoppers'
CROSS JOIN (VALUES
  ('Everett', 'Patterson', 'Rose Patterson'),
  ('Paisley', 'Hughes', 'Sean Hughes'),
  ('Wesley', 'Flores', 'Judith Flores'),
  ('Bella', 'Washington', 'Arthur Washington'),
  ('Dominic', 'Butler', 'Frances Butler'),
  ('Naomi', 'Simmons', 'Philip Simmons'),
  ('Austin', 'Foster', 'Jean Foster'),
  ('Ellie', 'Gonzales', 'Jack Gonzales')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Peter Pan Harbor Bay';

-- Butterflies (3s)
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2021-06-01', '2022-12-01'),
  names.guardian, '510-555-' || LPAD((3200 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Butterflies'
CROSS JOIN (VALUES
  ('Carson', 'Bryant', 'Maria Bryant'),
  ('Aaliyah', 'Alexander', 'Terry Alexander'),
  ('Jaxon', 'Russell', 'Sara Russell'),
  ('Kinsley', 'Griffin', 'Joe Griffin'),
  ('Cooper', 'Diaz', 'Janice Diaz'),
  ('Madelyn', 'Hayes', 'Carl Hayes'),
  ('Easton', 'Myers', 'Grace Myers'),
  ('Piper', 'Ford', 'Alan Ford'),
  ('Nolan', 'Hamilton', 'Julie Hamilton')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Peter Pan Harbor Bay';

-- Dragonflies (Pre-K 4-5)
INSERT INTO students (school_id, classroom_id, first_name, last_name, date_of_birth, guardian_name, guardian_phone, guardian_email, guardian_relationship, status)
SELECT
  s.id, c.id,
  names.first_name, names.last_name,
  random_date('2020-06-01', '2021-12-01'),
  names.guardian, '510-555-' || LPAD((3300 + ROW_NUMBER() OVER())::TEXT, 4, '0'),
  LOWER(names.first_name) || '.' || LOWER(names.last_name) || '@email.com',
  'Parent', 'enrolled'
FROM schools s
JOIN classrooms c ON c.school_id = s.id AND c.name = 'Dragonflies'
CROSS JOIN (VALUES
  ('Colton', 'Graham', 'Diane Graham'),
  ('Ruby', 'Sullivan', 'Harold Sullivan'),
  ('Landon', 'Wallace', 'Denise Wallace'),
  ('Autumn', 'Woods', 'Jesse Woods'),
  ('Hunter', 'Cole', 'Tammy Cole'),
  ('Madeline', 'West', 'Phillip West'),
  ('Adrian', 'Jordan', 'Jacqueline Jordan'),
  ('Sadie', 'Owens', 'Ralph Owens'),
  ('Bentley', 'Reynolds', 'Wanda Reynolds'),
  ('Alice', 'Fisher', 'Keith Fisher')
) AS names(first_name, last_name, guardian)
WHERE s.name = 'Peter Pan Harbor Bay';

-- Clean up helper function
DROP FUNCTION IF EXISTS random_date(DATE, DATE);

-- Verify
DO $$
DECLARE
  student_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO student_count FROM students;
  RAISE NOTICE 'Sample students loaded: % total', student_count;
END $$;
