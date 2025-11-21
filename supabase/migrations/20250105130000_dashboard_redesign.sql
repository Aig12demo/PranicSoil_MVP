-- =============================================
-- DASHBOARD REDESIGN MIGRATION
-- =============================================

-- 1. Add status to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'inactive'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- 2. Create land_allocations table for crop management
CREATE TABLE IF NOT EXISTS land_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  acreage NUMERIC(10, 2) NOT NULL CHECK (acreage > 0),
  status TEXT NOT NULL DEFAULT 'planted' CHECK (status IN ('planted', 'growing', 'harvested', 'unfarmed')),
  planting_date DATE,
  expected_harvest_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE land_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for land_allocations
CREATE POLICY "Users can view own land allocations"
  ON land_allocations FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own land allocations"
  ON land_allocations FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own land allocations"
  ON land_allocations FOR UPDATE
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

CREATE POLICY "Users can delete own land allocations"
  ON land_allocations FOR DELETE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all land allocations"
  ON land_allocations FOR ALL
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

-- 3. Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_land_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER land_allocations_updated_at
  BEFORE UPDATE ON land_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_land_allocations_updated_at();

-- 4. Create view for active profiles with customer details
CREATE OR REPLACE VIEW active_customer_profiles AS
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.full_name,
  p.role,
  p.phone,
  p.status,
  p.created_at,
  COALESCE(f.total_acreage, 0) as total_acreage,
  COALESCE(la.allocated_acreage, 0) as allocated_acreage,
  COALESCE(t.pending_tasks, 0) as pending_tasks,
  COALESCE(t.total_tasks, 0) as total_tasks
FROM profiles p
LEFT JOIN (
  SELECT profile_id, SUM(acreage) as total_acreage
  FROM farms
  GROUP BY profile_id
) f ON p.id = f.profile_id
LEFT JOIN (
  SELECT profile_id, SUM(acreage) as allocated_acreage
  FROM land_allocations
  GROUP BY profile_id
) la ON p.id = la.profile_id
LEFT JOIN (
  SELECT 
    profile_id,
    COUNT(*) as total_tasks,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
  FROM shared_todos
  GROUP BY profile_id
) t ON p.id = t.profile_id
WHERE p.role IN ('farmer', 'gardener', 'rancher')
  AND p.status = 'active'
ORDER BY p.created_at DESC;

-- Grant access to the view
GRANT SELECT ON active_customer_profiles TO authenticated;

-- 5. Create function to get customer dashboard data
CREATE OR REPLACE FUNCTION get_customer_dashboard_summary(customer_profile_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = customer_profile_id),
    'farms', (SELECT COALESCE(json_agg(row_to_json(f)), '[]'::json) FROM farms f WHERE f.profile_id = customer_profile_id),
    'land_allocations', (SELECT COALESCE(json_agg(row_to_json(la)), '[]'::json) FROM land_allocations la WHERE la.profile_id = customer_profile_id),
    'total_acreage', (SELECT COALESCE(SUM(acreage), 0) FROM farms WHERE profile_id = customer_profile_id),
    'allocated_acreage', (SELECT COALESCE(SUM(acreage), 0) FROM land_allocations WHERE profile_id = customer_profile_id),
    'pending_todos', (SELECT COUNT(*) FROM shared_todos WHERE profile_id = customer_profile_id AND status = 'pending'),
    'in_progress_todos', (SELECT COUNT(*) FROM shared_todos WHERE profile_id = customer_profile_id AND status = 'in_progress'),
    'completed_todos', (SELECT COUNT(*) FROM shared_todos WHERE profile_id = customer_profile_id AND status = 'completed')
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_customer_dashboard_summary(UUID) TO authenticated;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_land_allocations_profile_id ON land_allocations(profile_id);
CREATE INDEX IF NOT EXISTS idx_land_allocations_farm_id ON land_allocations(farm_id);
CREATE INDEX IF NOT EXISTS idx_shared_todos_assigned_to ON shared_todos(assigned_to);

