-- ============================================
-- RESET TEST ENVIRONMENT TO BASELINE
-- ============================================
-- Run this script anytime you want to start fresh.
-- It will clear ALL data and restore the baseline dataset.
--
-- Usage:
--   npx supabase db execute --file supabase/reset-test-environment.sql
--
-- What this does:
--   1. Clears ALL transactional data (attendance, shifts, PTO, audit logs)
--   2. Clears ALL master data (students, teachers, classrooms, schools)
--   3. Reloads the baseline dataset from seed-real-data.sql
-- ============================================

-- Simply include the full seed script which handles truncation and re-seeding
\i seed-real-data.sql
