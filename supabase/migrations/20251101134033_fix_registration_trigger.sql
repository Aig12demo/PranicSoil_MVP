/*
  # Fix Registration Trigger to Handle All Fields

  1. Problem
    - Trigger function doesn't properly insert farm-specific data
    - Missing field mappings for farmer, gardener, and rancher data
    
  2. Solution
    - Update handle_new_user function to map all registration fields
    - Handle role-specific fields properly (farm_size, crop_types, etc.)
    - Use proper array conversion for array fields
    
  3. Security
    - Maintains SECURITY DEFINER for proper permissions
    - Keeps error handling to prevent auth failures
*/

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

  -- Create farms entry with role-specific fields
  INSERT INTO farms (
    profile_id,
    farm_type,
    property_size,
    current_challenges,
    -- Gardener fields
    garden_type,
    growing_zone,
    soil_type,
    sunlight_exposure,
    -- Farmer fields
    crop_types,
    certifications,
    equipment,
    farming_practices,
    -- Rancher fields
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
    -- Gardener fields
    NEW.raw_user_meta_data->>'garden_type',
    NEW.raw_user_meta_data->>'growing_zone',
    NEW.raw_user_meta_data->>'soil_type',
    NEW.raw_user_meta_data->>'sunlight_exposure',
    -- Farmer fields (convert string to array)
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
    -- Rancher fields (convert string to array)
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
    -- Log error but don't fail the auth
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;
