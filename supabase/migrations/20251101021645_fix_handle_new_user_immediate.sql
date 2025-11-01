/*
  # Fix Profile Creation on Signup
  
  1. Changes
    - Update handle_new_user to create profile immediately (no email confirmation wait)
    - Store all user metadata fields in the profile
    - Works with the auto-admin trigger
  
  2. Security
    - Profile created on user signup
    - Admin role set by separate trigger if email matches
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  user_full_name text;
  user_phone text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gardener');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

    INSERT INTO public.profiles (
      id,
      user_id,
      email,
      role,
      full_name,
      phone,
      email_confirmed,
      property_size,
      garden_type,
      growing_zone,
      farm_size,
      crop_types,
      farming_practices,
      ranch_size,
      livestock_types,
      grazing_management
    ) VALUES (
      NEW.id,
      NEW.id,
      NEW.email,
      user_role,
      user_full_name,
      user_phone,
      NEW.email_confirmed_at IS NOT NULL,
      NEW.raw_user_meta_data->>'property_size',
      NEW.raw_user_meta_data->>'garden_type',
      NEW.raw_user_meta_data->>'growing_zone',
      NEW.raw_user_meta_data->>'farm_size',
      NEW.raw_user_meta_data->>'crop_types',
      NEW.raw_user_meta_data->>'farming_practices',
      NEW.raw_user_meta_data->>'ranch_size',
      NEW.raw_user_meta_data->>'livestock_types',
      NEW.raw_user_meta_data->>'grazing_management'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';