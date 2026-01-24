-- ============================================
-- CLEAR TEST DATA
-- ============================================
-- This removes test/transactional data while preserving
-- master data (schools, classrooms, teachers, students).
--
-- Safe to run in development to reset to clean state.
-- ============================================

-- Clear attendance records
TRUNCATE TABLE attendance CASCADE;

-- Clear shifts
TRUNCATE TABLE shifts CASCADE;

-- Clear PTO requests
TRUNCATE TABLE pto_requests CASCADE;

-- Reset PTO balances to defaults
UPDATE teachers SET
    pto_balance_vacation = 80,
    pto_balance_sick = 40,
    pto_balance_personal = 16
WHERE status = 'active';

-- Clear audit logs
TRUNCATE TABLE audit_logs CASCADE;

SELECT 'Test data cleared!' AS result;
