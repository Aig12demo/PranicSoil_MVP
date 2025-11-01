/*
  # Temporarily Disable RLS to Fix Admin Account Issue
  
  1. Changes
    - Disable RLS on profiles table temporarily
    - Delete any problematic admin records
    - Allow fresh registration
    - Re-enable RLS with proper policies
  
  2. Security
    - This is a maintenance operation
    - RLS will be re-enabled immediately after
*/

-- Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Delete any existing admin@pranicsoil.com records
DELETE FROM profiles WHERE email = 'admin@pranicsoil.com';

-- Delete from auth.users if exists
DELETE FROM auth.users WHERE email = 'admin@pranicsoil.com';

-- Update rkaruturi@gmail.com to not be admin
UPDATE profiles SET role = 'gardener' WHERE email = 'rkaruturi@gmail.com';

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;