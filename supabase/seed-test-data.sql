-- ============================================
-- TEST DATA SEED FILE
-- ============================================
-- This file contains test/development data only.
-- DO NOT run in production.
--
-- Usage:
--   npx supabase db execute --file supabase/seed-test-data.sql
--   OR run via Supabase Dashboard SQL Editor
--
-- To clear test data, run: seed-clear-test-data.sql
-- ============================================

-- Generate attendance records for the past 14 days
-- This creates realistic attendance patterns

DO $$
DECLARE
    v_school RECORD;
    v_student RECORD;
    v_date DATE;
    v_status TEXT;
    v_rand FLOAT;
    v_check_in TIME;
BEGIN
    -- Loop through last 14 days (excluding weekends)
    FOR v_date IN
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '14 days',
            CURRENT_DATE,
            '1 day'::INTERVAL
        )::DATE AS d
    LOOP
        -- Skip weekends
        IF EXTRACT(DOW FROM v_date) IN (0, 6) THEN
            CONTINUE;
        END IF;

        -- For each student
        FOR v_student IN
            SELECT s.id, s.school_id
            FROM students s
            WHERE s.status = 'enrolled'
        LOOP
            -- Random attendance status with realistic distribution
            -- 85% present, 5% late, 5% absent, 5% excused
            v_rand := random();

            IF v_rand < 0.85 THEN
                v_status := 'present';
                -- Check-in between 7:30 and 8:30 AM
                v_check_in := TIME '07:30:00' + (random() * INTERVAL '1 hour');
            ELSIF v_rand < 0.90 THEN
                v_status := 'late';
                -- Late arrivals between 8:30 and 9:30 AM
                v_check_in := TIME '08:30:00' + (random() * INTERVAL '1 hour');
            ELSIF v_rand < 0.95 THEN
                v_status := 'absent';
                v_check_in := NULL;
            ELSE
                v_status := 'excused';
                v_check_in := NULL;
            END IF;

            -- Insert attendance record (skip if already exists)
            INSERT INTO attendance (school_id, student_id, date, status, check_in_time)
            VALUES (v_student.school_id, v_student.id, v_date, v_status::attendance_status, v_check_in)
            ON CONFLICT (student_id, date) DO NOTHING;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Generated attendance records for past 14 days';
END $$;

-- Generate some shifts for teachers for the current week
DO $$
DECLARE
    v_teacher RECORD;
    v_date DATE;
    v_classroom_id UUID;
BEGIN
    -- Loop through current week (Mon-Fri)
    FOR v_date IN
        SELECT generate_series(
            DATE_TRUNC('week', CURRENT_DATE)::DATE,
            DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '4 days',
            '1 day'::INTERVAL
        )::DATE AS d
    LOOP
        -- For each active teacher
        FOR v_teacher IN
            SELECT t.id, t.school_id, t.regular_shift_start, t.regular_shift_end
            FROM teachers t
            WHERE t.status = 'active'
            AND t.regular_shift_start IS NOT NULL
        LOOP
            -- Get a random classroom from their school
            SELECT id INTO v_classroom_id
            FROM classrooms
            WHERE school_id = v_teacher.school_id
            ORDER BY random()
            LIMIT 1;

            -- Insert shift record
            INSERT INTO shifts (
                school_id, teacher_id, classroom_id, date,
                start_time, end_time, status, shift_type
            )
            VALUES (
                v_teacher.school_id,
                v_teacher.id,
                v_classroom_id,
                v_date,
                COALESCE(v_teacher.regular_shift_start, '08:00:00'::TIME),
                COALESCE(v_teacher.regular_shift_end, '17:00:00'::TIME),
                CASE
                    WHEN v_date < CURRENT_DATE THEN 'completed'
                    WHEN v_date = CURRENT_DATE THEN 'in_progress'
                    ELSE 'scheduled'
                END::shift_status,
                'regular'
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Generated shifts for current week';
END $$;

-- Generate some PTO requests
DO $$
DECLARE
    v_teacher RECORD;
    v_pto_type TEXT;
    v_status TEXT;
    v_start_date DATE;
    v_hours DECIMAL;
BEGIN
    -- Create a few PTO requests for random teachers
    FOR v_teacher IN
        SELECT id, school_id
        FROM teachers
        WHERE status = 'active'
        ORDER BY random()
        LIMIT 10
    LOOP
        -- Random PTO type
        v_pto_type := (ARRAY['vacation', 'sick', 'personal'])[floor(random() * 3 + 1)];

        -- Random status (more pending for testing approval flow)
        IF random() < 0.6 THEN
            v_status := 'pending';
        ELSIF random() < 0.8 THEN
            v_status := 'approved';
        ELSE
            v_status := 'rejected';
        END IF;

        -- Random date in next 30 days
        v_start_date := CURRENT_DATE + (floor(random() * 30)::INT);

        -- Random hours (8 or 16 for 1-2 days)
        v_hours := (ARRAY[8, 16])[floor(random() * 2 + 1)];

        INSERT INTO pto_requests (
            school_id, teacher_id, start_date, end_date,
            type, hours_requested, status, notes
        )
        VALUES (
            v_teacher.school_id,
            v_teacher.id,
            v_start_date,
            v_start_date + (v_hours / 8 - 1)::INT,
            v_pto_type::pto_type,
            v_hours,
            v_status::approval_status,
            CASE v_pto_type
                WHEN 'vacation' THEN 'Family vacation'
                WHEN 'sick' THEN 'Not feeling well'
                WHEN 'personal' THEN 'Personal appointment'
            END
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Generated PTO requests';
END $$;

-- Set PTO balances for all teachers
UPDATE teachers SET
    pto_balance_vacation = 80 + floor(random() * 40),  -- 80-120 hours
    pto_balance_sick = 40 + floor(random() * 20),      -- 40-60 hours
    pto_balance_personal = 16 + floor(random() * 8)    -- 16-24 hours
WHERE status = 'active';

SELECT 'Test data seeding complete!' AS result;
