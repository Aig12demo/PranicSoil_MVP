/*
  # Fix Profile Creation - Only Insert Existing Fields
  
  1. Changes
    - Update handle_new_user to only insert fields that exist in profiles table
    - Remove references to role-specific fields that don't exist
  
  2. Fields Inserted
    - id, user_id, email, role, full_name, phone, email_confirmed
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
      email_confirmed
    ) VALUES (
      NEW.id,
      NEW.id,
      NEW.email,
      user_role,
      user_full_name,
      user_phone,
      NEW.email_confirmed_at IS NOT NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
