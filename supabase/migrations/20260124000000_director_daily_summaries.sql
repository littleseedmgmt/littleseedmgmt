-- Director daily summary table for WhatsApp message parsing
CREATE TABLE director_daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Parsed student counts by age group (JSONB array)
  student_counts JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"age_group": "infant", "count": 7, "qualified_teachers": 1, "aides": 1}]

  -- Parsed teacher absences (JSONB array of names)
  teacher_absences JSONB NOT NULL DEFAULT '[]',
  -- Example: ["Shannon", "Pat"]

  -- Parsed schedule changes (JSONB array)
  schedule_changes JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"name": "Christina", "note": "going home ill at 1pm"}]

  -- Original message for reference
  raw_message TEXT NOT NULL,

  -- Who submitted this
  submitted_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(school_id, date)
);

-- Index for common queries
CREATE INDEX idx_director_summaries_school_date ON director_daily_summaries(school_id, date);

-- Trigger for updated_at
CREATE TRIGGER director_daily_summaries_updated_at
  BEFORE UPDATE ON director_daily_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE director_daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY director_summaries_select ON director_daily_summaries
  FOR SELECT USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY director_summaries_insert ON director_daily_summaries
  FOR INSERT WITH CHECK (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY director_summaries_update ON director_daily_summaries
  FOR UPDATE USING (school_id IN (SELECT get_user_schools(auth.uid())));
