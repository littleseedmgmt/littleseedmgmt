-- =====================================================
-- HARBOR BAY UPDATES - January 29, 2026
-- 1. Transfer Aura Batres from Mariner Square to Harbor Bay
-- 2. Update lunch times to match super optimized schedule
-- =====================================================

-- =====================================================
-- 1. TRANSFER AURA BATRES TO HARBOR BAY
-- =====================================================
-- Moving from Peter Pan Mariner Square to Peter Pan Harbor Bay
-- Changing role from floater to teacher (primary staff)
-- Updating shift to 10:00-5:00

UPDATE teachers SET
  school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay'),
  role = 'teacher',
  regular_shift_start = '10:00',
  regular_shift_end = '17:00',
  lunch_break_start = '13:30',
  lunch_break_end = '14:30',
  classroom_title = NULL
WHERE first_name = 'Aura' AND last_name = 'Batres'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Mariner Square');

-- =====================================================
-- 2. UPDATE HARBOR BAY LUNCH TIMES
-- Based on super optimized schedule agreed with staff
-- =====================================================

-- Antonia Ortiz - Lunch 11:30-12:30 (was 12:00-1:00)
UPDATE teachers SET
  lunch_break_start = '11:30',
  lunch_break_end = '12:30'
WHERE first_name = 'Antonia' AND last_name = 'Ortiz'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Lois Steenhard - Lunch 12:30-1:30 (was 12:00-1:00)
UPDATE teachers SET
  lunch_break_start = '12:30',
  lunch_break_end = '13:30'
WHERE first_name = 'Lois' AND last_name = 'Steenhard'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Jennie Mendoza - Lunch 1:30-2:30 (was 1:00-2:00)
UPDATE teachers SET
  lunch_break_start = '13:30',
  lunch_break_end = '14:30'
WHERE first_name = 'Jennie' AND last_name = 'Mendoza'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Kirsten Cesar - Lunch 1:30-2:30 (was 1:00-2:00)
UPDATE teachers SET
  lunch_break_start = '13:30',
  lunch_break_end = '14:30'
WHERE first_name = 'Kirsten' AND last_name = 'Cesar'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Theresa Clement (Director) - Lunch 1:30-2:30 (was NULL)
UPDATE teachers SET
  lunch_break_start = '13:30',
  lunch_break_end = '14:30'
WHERE first_name = 'Theresa' AND last_name = 'Clement'
  AND school_id = (SELECT id FROM schools WHERE name = 'Peter Pan Harbor Bay');

-- Thao Ho - no change (12:00-1:00 is correct)
-- Melody Chan - no change (12:30-1:30 is correct)
-- Vynn Alcontin - no change (12:30-1:30 is correct)
