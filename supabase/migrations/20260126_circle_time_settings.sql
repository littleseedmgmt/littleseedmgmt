-- Add circle time settings for combined classroom optimization
-- During circle time, preschoolers (2s, 3s, 4s) are gathered together
-- with 1-2 teachers (usually director reads stories), freeing other teachers for breaks

-- Circle times setting (configurable per school)
INSERT INTO school_settings (school_id, setting_key, setting_value, description)
VALUES (NULL, 'circle_times', '[
  {"start": "09:15", "end": "09:30", "age_groups": ["twos", "threes", "preschool", "pre_k"]},
  {"start": "11:45", "end": "12:00", "age_groups": ["twos", "threes", "preschool", "pre_k"]},
  {"start": "14:45", "end": "15:00", "age_groups": ["twos", "threes", "preschool", "pre_k"]}
]', 'Circle time periods when preschoolers (2s, 3s, 4s) are combined for stories/activities. Frees teachers for breaks.')
ON CONFLICT (school_id, setting_key) DO NOTHING;

-- Note: Circle time is typically:
-- - 10-15 minutes duration
-- - Before major transitions (playground, lunch, afternoon activities)
-- - Director or lead teacher reads to all preschoolers combined
-- - Other teachers can take 10-minute breaks
-- - Infants/toddlers do NOT participate (they stay in their room)
