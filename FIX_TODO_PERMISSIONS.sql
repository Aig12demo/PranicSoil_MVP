-- ========================================
-- COMPREHENSIVE FIX FOR TODO FUNCTIONALITY
-- ========================================
-- This fixes all CRUD operations on shared_todos table
-- Run this in Supabase SQL Editor

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own todos" ON shared_todos;
DROP POLICY IF EXISTS "Users can create todos" ON shared_todos;
DROP POLICY IF EXISTS "Users can update own todos" ON shared_todos;
DROP POLICY IF EXISTS "Users can delete own todos" ON shared_todos;
DROP POLICY IF EXISTS "Admins can manage all todos" ON shared_todos;

-- ========================================
-- CREATE (INSERT) - Allow users to create todos
-- ========================================
CREATE POLICY "Users can create todos"
  ON shared_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- READ (SELECT) - Allow users to view their todos
-- ========================================
CREATE POLICY "Users can view own todos"
  ON shared_todos FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- UPDATE - Allow users to update their todos
-- ========================================
CREATE POLICY "Users can update own todos"
  ON shared_todos FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- DELETE - Allow users to delete their todos
-- ========================================
CREATE POLICY "Users can delete own todos"
  ON shared_todos FOR DELETE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- ADMIN - Allow admins to manage all todos
-- ========================================
CREATE POLICY "Admins can manage all todos"
  ON shared_todos FOR ALL
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

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'shared_todos'
ORDER BY policyname;

