-- Fix RLS policy for shared_todos to allow users to create todos
-- The issue: users need to be able to insert todos with their own profile_id

DROP POLICY IF EXISTS "Users can create todos" ON shared_todos;

CREATE POLICY "Users can create todos"
  ON shared_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = (select auth.uid())
    )
    OR created_by IN (
      SELECT id FROM profiles WHERE user_id = (select auth.uid())
    )
  );

-- Also add a delete policy if it doesn't exist
DROP POLICY IF EXISTS "Users can delete own todos" ON shared_todos;

CREATE POLICY "Users can delete own todos"
  ON shared_todos FOR DELETE
  TO authenticated
  USING (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = (select auth.uid())
    )
  );

