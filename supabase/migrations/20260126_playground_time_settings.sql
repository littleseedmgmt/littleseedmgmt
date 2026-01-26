-- Add playground/outdoor time settings for combined ratio optimization
-- During playground time, classrooms with the same ratio can be combined,
-- reducing the total teachers needed

-- Playground times setting (by age group)
-- Groups with same ratio can be combined when outside
INSERT INTO school_settings (school_id, setting_key, setting_value, description)
VALUES (NULL, 'playground_times', '{
  "morning": {
    "start": "09:30",
    "end": "11:00",
    "age_groups": ["twos", "threes", "preschool", "pre_k"]
  },
  "afternoon": {
    "start": "15:30",
    "end": "16:30",
    "age_groups": ["twos", "threes", "preschool", "pre_k"]
  }
}', 'Playground/outdoor times when classrooms with same ratio can be combined. Infants/toddlers typically stay inside.')
ON CONFLICT (school_id, setting_key) DO NOTHING;

-- Note: During playground time, classrooms with the same ratio requirement
-- are combined. For example:
-- - Classroom A (1:12): 10 students = 1 teacher
-- - Classroom B (1:12): 8 students = 1 teacher
-- - Classroom C (1:12): 4 students = 1 teacher
-- Total indoors: 3 teachers
--
-- During playground (combined):
-- - Combined (1:12): 22 students = ceil(22/12) = 2 teachers
-- Savings: 1 teacher freed up for breaks
