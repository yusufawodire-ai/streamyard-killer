-- Remove Daily.co specific columns from sessions table
ALTER TABLE sessions 
DROP COLUMN IF EXISTS daily_room_id,
DROP COLUMN IF EXISTS daily_room_url,
DROP COLUMN IF EXISTS daily_recording_id,
DROP COLUMN IF EXISTS daily_download_url;

-- Add new column for recording metadata if needed
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS recording_metadata JSONB DEFAULT '{}'::jsonb;

-- Update any existing sessions in 'recording' status to a more appropriate status
UPDATE sessions 
SET status = 'draft' 
WHERE status = 'recording';