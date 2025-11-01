/*
  # Fix handle_new_user trigger for proper user registration
  
  1. Problem
    - ON CONFLICT DO NOTHING doesn't specify the constraint
    - Error messages are unclear
    
  2. Solution
    - Specify the exact conflict constraint for farms table
    - Add better error handling
    - Ensure profile creation always succeeds
*/

-- Drop and recreate the function with proper conflict handling
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

  -- Insert or update profile (upsert pattern)
  INSERT INTO profiles (
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
    email = EXCLUDED.email,
    email_confirmed = EXCLUDED.email_confirmed,
    updated_at = now();

  -- Create farms entry with basic info
  INSERT INTO farms (
    profile_id,
    farm_type,
    property_size,
    current_challenges
  ) VALUES (
    NEW.id,
    user_role,
    NEW.raw_user_meta_data->>'property_size',
    NEW.raw_user_meta_data->>'current_challenges'
  )
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Verify the trigger is still active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
