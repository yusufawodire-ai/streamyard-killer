-- Add sharing fields to sessions table
ALTER TABLE sessions 
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add index for fast lookups of public shared sessions
CREATE INDEX IF NOT EXISTS idx_sessions_share_token ON sessions(share_token) 
  WHERE is_public = true;

-- Add RLS policy for public access to shared sessions
CREATE POLICY "Allow public read for shared sessions"
ON sessions
FOR SELECT
USING (
  is_public = true 
  AND (share_expires_at IS NULL OR share_expires_at > now())
);