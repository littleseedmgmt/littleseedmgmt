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

-- Policy: Users can read optimization results for schools they have access to
CREATE POLICY "Users can read optimization results"
  ON optimization_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = optimization_results.school_id
      AND user_schools.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );

-- Policy: Users can insert/update optimization results for schools they have access to
CREATE POLICY "Users can write optimization results"
  ON optimization_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = optimization_results.school_id
      AND user_schools.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'owner'
    )
  );
