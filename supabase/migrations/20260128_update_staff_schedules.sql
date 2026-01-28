-- Update staff shift times and lunch breaks based on scheduling team data
-- Date: 2026-01-28

-- =====================================================
-- PETER PAN MARINER SQUARE
-- =====================================================

-- Julie DeMauri - Director - 8:30-5:30 - Lunch 2:30-3:30
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '17:30',
  lunch_break_start = '14:30',
  lunch_break_end = '15:30'
WHERE first_name = 'Julie' AND last_name = 'DeMauri'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Shannon Atthowe - Assistant Director - 7:30-5:00 - Lunch 12:00-1:30
UPDATE teachers SET
  regular_shift_start = '07:30',
  regular_shift_end = '17:00',
  lunch_break_start = '12:00',
  lunch_break_end = '13:30'
WHERE first_name = 'Shannon' AND last_name = 'Atthowe'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Pat Adkins - Lead Infant Teacher (Upstairs) - 8:30-5:30 - Lunch 1:30-2:30
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '17:30',
  lunch_break_start = '13:30',
  lunch_break_end = '14:30',
  classroom_title = 'Upstairs Infant'
WHERE first_name = 'Pat' AND last_name = 'Adkins'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Isabel Kasaab - Teacher Assistant (Upstairs Infant) - 8:30-12:30 - No lunch (part-time)
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '12:30',
  lunch_break_start = NULL,
  lunch_break_end = NULL,
  classroom_title = 'Upstairs Infant'
WHERE first_name = 'Isabel' AND last_name = 'Kasaab'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Macekshia Stevenson - Teacher Assistant (Upstairs Infant) - 1:30-5:30 - No lunch (part-time)
UPDATE teachers SET
  regular_shift_start = '13:30',
  regular_shift_end = '17:30',
  lunch_break_start = NULL,
  lunch_break_end = NULL,
  classroom_title = 'Upstairs Infant'
WHERE first_name = 'Macekshia' AND last_name = 'Stevenson'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Shelly Ortiz - Teacher Assistant (Downstairs Infant) - 7:30-5:00 - Lunch 12:00-1:30
UPDATE teachers SET
  regular_shift_start = '07:30',
  regular_shift_end = '17:00',
  lunch_break_start = '12:00',
  lunch_break_end = '13:30',
  classroom_title = 'Downstairs Infant'
WHERE first_name = 'Shelly' AND last_name = 'Ortiz'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Sally Du - Teacher (Downstairs Infant) - 8:15-5:15 - Lunch 12:00-1:00
UPDATE teachers SET
  regular_shift_start = '08:15',
  regular_shift_end = '17:15',
  lunch_break_start = '12:00',
  lunch_break_end = '13:00',
  classroom_title = 'Downstairs Infant'
WHERE first_name = 'Sally' AND last_name = 'Du'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Sherry Chan - Teacher (Downstairs Infant) - 8:30-5:30 - Lunch 12:00-1:00
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '17:30',
  lunch_break_start = '12:00',
  lunch_break_end = '13:00',
  classroom_title = 'Downstairs Infant'
WHERE first_name = 'Sherry' AND last_name = 'Chan'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Maricon Alcontin - Teacher Assistant (Tigers 2s) - 8:30-5:30 - Lunch 1:00-2:00
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '17:30',
  lunch_break_start = '13:00',
  lunch_break_end = '14:00',
  classroom_title = 'Tigers'
WHERE first_name = 'Maricon' AND last_name = 'Alcontin'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Corazon Velasquez - Teacher (Tigers 2s) - 8:00-5:00 - Lunch 12:00-1:00
UPDATE teachers SET
  regular_shift_start = '08:00',
  regular_shift_end = '17:00',
  lunch_break_start = '12:00',
  lunch_break_end = '13:00',
  classroom_title = 'Tigers'
WHERE first_name = 'Corazon' AND last_name = 'Velasquez'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Muoi Tran - Teacher Assistant (Tigers 2s) - 8:00-5:00 - Lunch 12:30-1:30
UPDATE teachers SET
  regular_shift_start = '08:00',
  regular_shift_end = '17:00',
  lunch_break_start = '12:30',
  lunch_break_end = '13:30',
  classroom_title = 'Tigers'
WHERE first_name = 'Muoi' AND last_name = 'Tran'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Angel Lewis - Lead Teacher (Ponies 3s) - 8:15-5:15 - Lunch 1:00-2:00
UPDATE teachers SET
  regular_shift_start = '08:15',
  regular_shift_end = '17:15',
  lunch_break_start = '13:00',
  lunch_break_end = '14:00',
  classroom_title = 'Ponies'
WHERE first_name = 'Angel' AND last_name = 'Lewis'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Shirley Liu - Teacher (Ponies 3s) - 7:30-4:30 - Lunch 12:00-1:00
UPDATE teachers SET
  regular_shift_start = '07:30',
  regular_shift_end = '16:30',
  lunch_break_start = '12:00',
  lunch_break_end = '13:00',
  classroom_title = 'Ponies'
WHERE first_name = 'Shirley' AND last_name = 'Liu'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Christina Sagun - Lead Teacher (Pre-K 4-5) - 8:30-5:30 - Lunch 1:30-2:30
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '17:30',
  lunch_break_start = '13:30',
  lunch_break_end = '14:30',
  classroom_title = 'Soda Pop'
WHERE first_name = 'Christina' AND last_name = 'Sagun'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Kevin Dupre - Teacher (Pre-K 4-5) - 8:00-5:00 - Lunch 12:30-1:30
UPDATE teachers SET
  regular_shift_start = '08:00',
  regular_shift_end = '17:00',
  lunch_break_start = '12:30',
  lunch_break_end = '13:30',
  classroom_title = 'Soda Pop'
WHERE first_name = 'Kevin' AND last_name = 'Dupre'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Jules Leung - Teacher (Pre-K 4-5) - 8:15-5:15 - Lunch 1:30-2:30
UPDATE teachers SET
  regular_shift_start = '08:15',
  regular_shift_end = '17:15',
  lunch_break_start = '13:30',
  lunch_break_end = '14:30',
  classroom_title = 'Soda Pop'
WHERE first_name = 'Jules' AND last_name = 'Leung'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- Aura Batres - Teacher (Floater) - 10:15-5:15 - Lunch 1:30-2:30
UPDATE teachers SET
  regular_shift_start = '10:15',
  regular_shift_end = '17:15',
  lunch_break_start = '13:30',
  lunch_break_end = '14:30',
  classroom_title = NULL,
  role = 'floater'
WHERE first_name = 'Aura' AND last_name = 'Batres'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');


-- =====================================================
-- LITTLE SEEDS CHILDREN'S CENTER
-- =====================================================

-- Sarah Hallford - Director - 8:30-5:30 - Lunch Varies (NULL)
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '17:30',
  lunch_break_start = NULL,
  lunch_break_end = NULL
WHERE first_name = 'Sarah' AND last_name = 'Hallford'
  AND school_id = (SELECT id FROM schools WHERE name = 'Little Seeds Children''s Center');

-- Judi Thach - Lead Infant Teacher (Squirrels) - 8:00-5:30 - Lunch 1:00-2:30
UPDATE teachers SET
  regular_shift_start = '08:00',
  regular_shift_end = '17:30',
  lunch_break_start = '13:00',
  lunch_break_end = '14:30',
  classroom_title = 'Squirrels'
WHERE first_name = 'Judi' AND last_name = 'Thach'
  AND school_id = (SELECT id FROM schools WHERE name = 'Little Seeds Children''s Center');

-- Tam Tran - Teacher Assistant (Squirrels) - 7:45-4:45 - Lunch 12:00-1:00
UPDATE teachers SET
  regular_shift_start = '07:45',
  regular_shift_end = '16:45',
  lunch_break_start = '12:00',
  lunch_break_end = '13:00',
  classroom_title = 'Squirrels'
WHERE first_name = 'Tam' AND last_name = 'Tran'
  AND school_id = (SELECT id FROM schools WHERE name = 'Little Seeds Children''s Center');

-- Kristy Meli - Teacher (Bunnies 2s) - 7:30-5:00 - Lunch 1:00-2:30
UPDATE teachers SET
  regular_shift_start = '07:30',
  regular_shift_end = '17:00',
  lunch_break_start = '13:00',
  lunch_break_end = '14:30',
  classroom_title = 'Bunnies'
WHERE first_name = 'Kristy' AND last_name = 'Meli'
  AND school_id = (SELECT id FROM schools WHERE name = 'Little Seeds Children''s Center');

-- Quyen Duong - Teacher Assistant (Bunnies 2s) - 8:15-5:15 - Lunch 12:00-1:00
UPDATE teachers SET
  regular_shift_start = '08:15',
  regular_shift_end = '17:15',
  lunch_break_start = '12:00',
  lunch_break_end = '13:00',
  classroom_title = 'Bunnies'
WHERE first_name = 'Quyen' AND last_name = 'Duong'
  AND school_id = (SELECT id FROM schools WHERE name = 'Little Seeds Children''s Center');

-- Sonia Hernandez - Teacher (Chipmunks 3s) - 8:15-5:15 - Lunch 12:00-1:00
UPDATE teachers SET
  regular_shift_start = '08:15',
  regular_shift_end = '17:15',
  lunch_break_start = '12:00',
  lunch_break_end = '13:00',
  classroom_title = 'Chipmunks'
WHERE first_name = 'Sonia' AND last_name = 'Hernandez'
  AND school_id = (SELECT id FROM schools WHERE name = 'Little Seeds Children''s Center');

-- Mona Watson - Teacher (Bears 4-5) - 7:30-5:00 - Lunch 1:00-2:30
UPDATE teachers SET
  regular_shift_start = '07:30',
  regular_shift_end = '17:00',
  lunch_break_start = '13:00',
  lunch_break_end = '14:30',
  classroom_title = 'Bears'
WHERE first_name = 'Mona' AND last_name = 'Watson'
  AND school_id = (SELECT id FROM schools WHERE name = 'Little Seeds Children''s Center');

-- Tiffany Louie - Teacher (Floater) - 8:15-5:15 - Lunch 1:00-2:00
UPDATE teachers SET
  regular_shift_start = '08:15',
  regular_shift_end = '17:15',
  lunch_break_start = '13:00',
  lunch_break_end = '14:00',
  classroom_title = NULL,
  role = 'floater'
WHERE first_name = 'Tiffany' AND last_name = 'Louie'
  AND school_id = (SELECT id FROM schools WHERE name = 'Little Seeds Children''s Center');


-- =====================================================
-- PETER PAN HARBOR BAY
-- =====================================================

-- Theresa Clement - Director - 8:30-5:30 - Lunch Varies (NULL)
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '17:30',
  lunch_break_start = NULL,
  lunch_break_end = NULL
WHERE first_name = 'Theresa' AND last_name = 'Clement'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Kirsten Cesar - Teacher (Ladybugs) - 8:30-5:30 - Lunch 1:00-2:00
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '17:30',
  lunch_break_start = '13:00',
  lunch_break_end = '14:00',
  classroom_title = 'Ladybugs'
WHERE first_name = 'Kirsten' AND last_name = 'Cesar'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Thao Ho - Teacher (Ladybugs) - 7:30-4:30 - Lunch 12:00-1:00
UPDATE teachers SET
  regular_shift_start = '07:30',
  regular_shift_end = '16:30',
  lunch_break_start = '12:00',
  lunch_break_end = '13:00',
  classroom_title = 'Ladybugs'
WHERE first_name = 'Thao' AND last_name = 'Ho'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Melody Chan - Teacher Assistant (Ladybugs) - 8:15-5:15 - Lunch 12:30-1:30
UPDATE teachers SET
  regular_shift_start = '08:15',
  regular_shift_end = '17:15',
  lunch_break_start = '12:30',
  lunch_break_end = '13:30',
  classroom_title = 'Ladybugs'
WHERE first_name = 'Melody' AND last_name = 'Chan'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Antonia Ortiz - Teacher (Grasshopper) - 7:30-4:30 - Lunch 12:00-1:00
UPDATE teachers SET
  regular_shift_start = '07:30',
  regular_shift_end = '16:30',
  lunch_break_start = '12:00',
  lunch_break_end = '13:00',
  classroom_title = 'Grasshoppers'
WHERE first_name = 'Antonia' AND last_name = 'Ortiz'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Vynn Alcontin - Teacher (Butterflies) - 8:30-5:30 - Lunch 12:30-1:30
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '17:30',
  lunch_break_start = '12:30',
  lunch_break_end = '13:30',
  classroom_title = 'Butterflies'
WHERE first_name = 'Vynn' AND last_name = 'Alcontin'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Lois Steenhard - Teacher (Dragonflies) - 8:15-5:15 - Lunch 12:00-1:00
UPDATE teachers SET
  regular_shift_start = '08:15',
  regular_shift_end = '17:15',
  lunch_break_start = '12:00',
  lunch_break_end = '13:00',
  classroom_title = 'Dragonflies'
WHERE first_name = 'Lois' AND last_name = 'Steenhard'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Jennie Mendoza - Teacher (Dragonflies) - 8:30-5:30 - Lunch 1:00-2:00
UPDATE teachers SET
  regular_shift_start = '08:30',
  regular_shift_end = '17:30',
  lunch_break_start = '13:00',
  lunch_break_end = '14:00',
  classroom_title = 'Dragonflies'
WHERE first_name = 'Jennie' AND last_name = 'Mendoza'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');
