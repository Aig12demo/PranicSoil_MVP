-- =============================================
-- COMPREHENSIVE FIX FOR ALL CRUD PERMISSIONS
-- =============================================
-- This fixes Todos and Documents functionality
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zilrthstnuxncufdgiys/sql/new

-- =============================================
-- SHARED_TODOS TABLE PERMISSIONS
-- =============================================

-- Drop all existing todo policies
DROP POLICY IF EXISTS "Users can view own todos" ON shared_todos;
DROP POLICY IF EXISTS "Users can create todos" ON shared_todos;
DROP POLICY IF EXISTS "Users can update own todos" ON shared_todos;
DROP POLICY IF EXISTS "Users can delete own todos" ON shared_todos;
DROP POLICY IF EXISTS "Admins can manage all todos" ON shared_todos;

-- CREATE - Allow users to create todos
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

-- READ - Allow users to view their todos
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

-- UPDATE - Allow users to update their todos (status changes, etc.)
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

-- DELETE - Allow users to delete their todos
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

-- ADMIN - Allow admins to manage all todos
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

-- =============================================
-- DOCUMENTS TABLE PERMISSIONS
-- =============================================

-- Drop all existing document policies
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can upload documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;

-- CREATE - Allow users to upload documents
CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- READ - Allow users to view their documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- DELETE - Allow users to delete their documents
CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ADMIN - Allow admins to manage all documents
CREATE POLICY "Admins can manage all documents"
  ON documents FOR ALL
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

-- =============================================
-- VERIFY POLICIES WERE CREATED
-- =============================================

-- Check shared_todos policies
SELECT 
  'shared_todos' as table_name,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'shared_todos'
ORDER BY policyname;

-- Check documents policies
SELECT 
  'documents' as table_name,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY policyname;

