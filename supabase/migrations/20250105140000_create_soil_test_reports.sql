-- Create soil_test_reports table for storing extracted soil test data
CREATE TABLE IF NOT EXISTS soil_test_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referential integrity
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  
  -- Client/Grower Information
  client_name TEXT,
  client_location TEXT,
  grower_name TEXT,
  grower_location TEXT,
  report_date DATE,
  date_received DATE,
  field_id TEXT,
  sample_id TEXT,
  
  -- Soil Test Results
  ph_soil NUMERIC,
  ph_buffer NUMERIC,
  phosphorus_op NUMERIC,
  phosphorus_m3 NUMERIC,
  potassium NUMERIC,
  calcium NUMERIC,
  magnesium NUMERIC,
  sulfur NUMERIC,
  boron NUMERIC,
  copper NUMERIC,
  iron NUMERIC,
  manganese NUMERIC,
  zinc NUMERIC,
  sodium NUMERIC,
  soluble_salts NUMERIC,
  organic_matter NUMERIC,
  estimated_n_release NUMERIC,
  nitrate_nitrogen NUMERIC,
  
  -- Calculated Values
  cec NUMERIC,
  
  -- Base Saturation (% and meq)
  sat_k_percent NUMERIC,
  sat_k_meq NUMERIC,
  sat_ca_percent NUMERIC,
  sat_ca_meq NUMERIC,
  sat_mg_percent NUMERIC,
  sat_mg_meq NUMERIC,
  sat_h_percent NUMERIC,
  sat_h_meq NUMERIC,
  sat_na_percent NUMERIC,
  sat_na_meq NUMERIC,
  
  -- Ratios
  k_mg_ratio NUMERIC,
  ca_mg_ratio NUMERIC,
  
  -- Storage & Metadata
  report_image_url TEXT,
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extraction_raw_json JSONB,
  extraction_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE soil_test_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own soil test reports"
  ON soil_test_reports FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own soil test reports"
  ON soil_test_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own soil test reports"
  ON soil_test_reports FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own soil test reports"
  ON soil_test_reports FOR DELETE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all soil test reports"
  ON soil_test_reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_soil_test_reports_profile_id ON soil_test_reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_soil_test_reports_farm_id ON soil_test_reports(farm_id);
CREATE INDEX IF NOT EXISTS idx_soil_test_reports_report_date ON soil_test_reports(report_date);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_soil_test_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER soil_test_reports_updated_at
  BEFORE UPDATE ON soil_test_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_soil_test_reports_updated_at();

