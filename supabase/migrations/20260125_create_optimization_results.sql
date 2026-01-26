-- Create optimization_results table to persist optimization calculations
CREATE TABLE IF NOT EXISTS optimization_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  result_type TEXT NOT NULL CHECK (result_type IN ('regular', 'minimal')),
  result_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint for upsert
  UNIQUE(school_id, date, result_type)
);

-- Index for fast lookups by school and date
CREATE INDEX IF NOT EXISTS idx_optimization_results_school_date
  ON optimization_results(school_id, date);

-- Enable RLS
ALTER TABLE optimization_results ENABLE ROW LEVEL SECURITY;

-- RLS policies using get_user_schools function (consistent with other tables)
CREATE POLICY optimization_results_select
  ON optimization_results FOR SELECT
  USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY optimization_results_insert
  ON optimization_results FOR INSERT
  WITH CHECK (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY optimization_results_update
  ON optimization_results FOR UPDATE
  USING (school_id IN (SELECT get_user_schools(auth.uid())));

CREATE POLICY optimization_results_delete
  ON optimization_results FOR DELETE
  USING (school_id IN (SELECT get_user_schools(auth.uid())));
