-- Fix teacher data based on human schedule validation
-- 1. Fix spelling: Shriley -> Shirley
-- 2. Move Tiffany from Little Seeds to Mariner Square, Ponies 3s

-- Fix Shirley spelling at Mariner Square
UPDATE teachers
SET first_name = 'Shirley'
WHERE first_name = 'Shriley'
  AND last_name = 'Liu'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Move Tiffany to Mariner Square
UPDATE teachers
SET
  school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square'),
  classroom_title = 'Ponies 3s',
  role = 'teacher'
WHERE first_name = 'Tiffany'
  AND last_name = 'Louie'
  AND school_id = (SELECT id FROM schools WHERE name = 'Little Seeds Children''s Center');
