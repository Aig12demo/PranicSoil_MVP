/*
  # COMPLETE DATABASE SETUP
  Run this file in Supabase SQL Editor to set up your entire database
  
  This includes:
  - All tables (profiles, farms, service_agreements, invoices, etc.)
  - Database triggers for automatic profile/farm creation
  - Row Level Security policies
  - All necessary functions
*/

-- ============================================
-- STEP 1: Create Initial Schema
-- ============================================

-- Create user_role enum type (skip if already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type 
    WHERE typname = 'user_role'
  ) THEN
    CREATE TYPE user_role AS ENUM ('gardener', 'farmer', 'rancher', 'admin');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Type already exists, skip
    NULL;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'gardener',
  full_name text NOT NULL,
  phone text,
  avatar_url text,
  notifications_enabled boolean DEFAULT true,
  email_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create farms table (unified for all roles)
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  farm_type text NOT NULL CHECK (farm_type IN ('gardener', 'farmer', 'rancher')),
  
  property_size text,
  current_challenges text,
  
  -- Gardener fields
  garden_type text,
  growing_zone text,
  soil_type text,
  sunlight_exposure text,
  
  -- Farmer fields
  crop_types text[],
  certifications text[],
  equipment text,
  farming_practices text,
  
  -- Rancher fields
  livestock_types text[],
  herd_size text,
  grazing_management text,
  water_resources text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT farms_profile_id_key UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS farms_profile_id_idx ON farms(profile_id);
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- Farms RLS policies
DROP POLICY IF EXISTS "Users can view own farm" ON farms;
CREATE POLICY "Users can view own farm"
  ON farms FOR SELECT
  TO authenticated
  USING (
    auth.uid() = profile_id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own farm" ON farms;
CREATE POLICY "Users can insert own farm"
  ON farms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own farm" ON farms;
CREATE POLICY "Users can update own farm"
  ON farms FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own farm" ON farms;
CREATE POLICY "Users can delete own farm"
  ON farms FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- Create other essential tables
CREATE TABLE IF NOT EXISTS service_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  agreement_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'completed', 'cancelled')),
  start_date date,
  end_date date,
  total_amount numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_agreement_id uuid REFERENCES service_agreements(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority text CHECK (priority IN ('low', 'medium', 'high')),
  due_date date,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS todo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id uuid REFERENCES shared_todos(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('user', 'assistant')),
  message_content text NOT NULL,
  context_type text NOT NULL DEFAULT 'authenticated' CHECK (context_type IN ('public', 'authenticated')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text,
  file_url text NOT NULL,
  description text,
  uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  context_type text NOT NULL DEFAULT 'authenticated' CHECK (context_type IN ('public', 'authenticated')),
  duration_seconds integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  user_role text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
DROP POLICY IF EXISTS "Users can view own agreements" ON service_agreements;
CREATE POLICY "Users can view own agreements"
  ON service_agreements FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can view own todos" ON shared_todos;
CREATE POLICY "Users can view own todos"
  ON shared_todos FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id OR auth.uid() = assigned_to OR auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can view own comments" ON todo_comments;
CREATE POLICY "Users can view own comments"
  ON todo_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_todos 
      WHERE shared_todos.id = todo_comments.todo_id 
      AND (shared_todos.profile_id = auth.uid() OR shared_todos.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own chat" ON chat_history;
CREATE POLICY "Users can view own chat"
  ON chat_history FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id OR context_type = 'public');

DROP POLICY IF EXISTS "Users can view own documents" ON documents;
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- ============================================
-- STEP 2: Create Trigger Function for Auto Profile/Farm Creation
-- ============================================

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  user_role text;
  user_full_name text;
  user_phone text;
BEGIN
  -- Extract user metadata with defaults
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gardener');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

  -- Insert profile with both id and user_id set
  INSERT INTO public.profiles (
    id,
    user_id,
    email,
    role,
    full_name,
    phone,
    email_confirmed
  ) VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    user_role,
    user_full_name,
    user_phone,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    email_confirmed = EXCLUDED.email_confirmed,
    updated_at = now();

  -- Only create farm record for non-admin users
  IF user_role IN ('gardener', 'farmer', 'rancher') THEN
    INSERT INTO public.farms (
      profile_id,
      farm_type,
      property_size,
      current_challenges,
      garden_type,
      growing_zone,
      soil_type,
      sunlight_exposure,
      crop_types,
      certifications,
      equipment,
      farming_practices,
      livestock_types,
      herd_size,
      grazing_management,
      water_resources
    ) VALUES (
      NEW.id,
      user_role,
      COALESCE(
        NEW.raw_user_meta_data->>'property_size',
        NEW.raw_user_meta_data->>'farm_size',
        NEW.raw_user_meta_data->>'ranch_size'
      ),
      NEW.raw_user_meta_data->>'current_challenges',
      NEW.raw_user_meta_data->>'garden_type',
      NEW.raw_user_meta_data->>'growing_zone',
      NEW.raw_user_meta_data->>'soil_type',
      NEW.raw_user_meta_data->>'sunlight_exposure',
      CASE 
        WHEN NEW.raw_user_meta_data->>'crop_types' IS NOT NULL 
        THEN string_to_array(NEW.raw_user_meta_data->>'crop_types', ',')
        ELSE NULL
      END,
      CASE 
        WHEN NEW.raw_user_meta_data->>'certifications' IS NOT NULL 
        THEN string_to_array(NEW.raw_user_meta_data->>'certifications', ',')
        ELSE NULL
      END,
      NEW.raw_user_meta_data->>'equipment',
      NEW.raw_user_meta_data->>'farming_practices',
      CASE 
        WHEN NEW.raw_user_meta_data->>'livestock_types' IS NOT NULL 
        THEN string_to_array(NEW.raw_user_meta_data->>'livestock_types', ',')
        ELSE NULL
      END,
      NEW.raw_user_meta_data->>'herd_size',
      NEW.raw_user_meta_data->>'grazing_management',
      NEW.raw_user_meta_data->>'water_resources'
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================
-- STEP 3: Create Trigger on auth.users
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after INSERT or UPDATE on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DONE! Your database is now set up.
-- ============================================

-- After running this migration:
-- 1. New users will automatically get profiles and farms created
-- 2. Run fix-saahi-user.js to create profile/farm for existing user "saahi"

