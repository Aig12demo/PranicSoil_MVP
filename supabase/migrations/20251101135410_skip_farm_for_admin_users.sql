/*
  # Skip Farm Creation for Admin Users

  1. Problem
    - Trigger creates farm records for all users including admins
    - Admins don't need farm records
    
  2. Solution
    - Update trigger to only create farms for gardener/farmer/rancher roles
    - Delete existing farm record for admin user
*/

-- Delete farm record for admin user
DELETE FROM farms
WHERE profile_id IN (
  SELECT id FROM profiles WHERE role = 'admin'
);

-- Update trigger to skip farm creation for admins
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
