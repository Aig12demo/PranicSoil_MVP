-- Fix RLS policies to allow users to access their own profiles
-- This fixes the "Setting up your profile..." hanging issue

-- Drop existing policies and recreate them with proper permissions
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Policy 1: Users can view their own profile (by id OR user_id)
-- This is the PRIMARY policy that allows users to access their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    auth.uid() = user_id
  );

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = id 
    OR 
    auth.uid() = user_id
  );

-- Policy 3: Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id 
    OR 
    auth.uid() = user_id
  );

-- Policy 4: Admins can view all profiles
-- NOTE: This policy allows admins to view all profiles
-- We check if the user's profile (which they can access via Policy 1) has role='admin'
-- This uses a subquery that leverages the existing "Users can view own profile" policy
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Check if current user's own profile has role='admin'
    -- This works because Policy 1 allows users to view their own profile
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
    OR
    -- Also allow if user is viewing their own profile (redundant but safe)
    auth.uid() = id 
    OR 
    auth.uid() = user_id
  );

-- Ensure the profile exists for admin user
DO $$
DECLARE
  admin_user_id uuid := 'f42813d5-1f67-4f8d-b322-033304687bc4';
  admin_email text := 'rkaruturi@gmail.com';
BEGIN
  -- Insert profile if it doesn't exist
  INSERT INTO profiles (
    id,
    user_id,
    email,
    role,
    full_name,
    email_confirmed
  )
  SELECT 
    admin_user_id,
    admin_user_id,
    admin_email,
    'admin',
    'Ravi Karuturi',
    true
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = admin_user_id
  );
END $$;

