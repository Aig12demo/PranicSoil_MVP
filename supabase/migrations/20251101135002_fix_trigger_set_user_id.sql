/*
  # Fix Trigger to Set user_id

  1. Problem
    - Trigger creates profiles without setting user_id
    - Many RLS policies depend on user_id being set
    
  2. Solution
    - Update trigger to set both id and user_id to NEW.id
    - Update existing profiles to set user_id = id where user_id is null
*/

-- Update existing profiles to set user_id
UPDATE profiles
SET user_id = id
WHERE user_id IS NULL;

-- Update the trigger function to set user_id
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

  -- Create farms entry with role-specific fields
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

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;
