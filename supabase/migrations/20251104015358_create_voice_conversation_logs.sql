/*
  # Create Voice Conversation Logs Table

  1. New Tables
    - `voice_conversations`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, nullable, foreign key to profiles)
      - `session_id` (text) - unique identifier for the conversation session
      - `context_type` (text) - 'public' or 'authenticated'
      - `duration_seconds` (integer) - length of conversation in seconds
      - `started_at` (timestamptz) - when conversation began
      - `ended_at` (timestamptz, nullable) - when conversation ended
      - `user_role` (text, nullable) - role of user if authenticated
      - `metadata` (jsonb, nullable) - additional conversation metadata
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `voice_conversations` table
    - Add policy for authenticated users to view their own conversations
    - Add policy for admin users to view all conversations
    - Add policy for system to insert conversation logs

  3. Indexes
    - Index on profile_id for faster user conversation lookups
    - Index on session_id for conversation tracking
    - Index on started_at for analytics queries
*/

CREATE TABLE IF NOT EXISTS voice_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  context_type text NOT NULL CHECK (context_type IN ('public', 'authenticated')),
  duration_seconds integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  user_role text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE voice_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON voice_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

CREATE POLICY "Admins can view all conversations"
  ON voice_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert conversation logs"
  ON voice_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own conversations"
  ON voice_conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

CREATE INDEX IF NOT EXISTS idx_voice_conversations_profile_id ON voice_conversations(profile_id);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_session_id ON voice_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_started_at ON voice_conversations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_context_type ON voice_conversations(context_type);