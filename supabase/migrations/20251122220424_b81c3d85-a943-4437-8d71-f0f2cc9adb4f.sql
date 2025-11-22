-- Create sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL CHECK (brand_id IN ('ssv', 'igta', 'camino', 'aventus', 'innovative')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'recording', 'recorded', 'transcribing', 'transcribed', 'processing', 'completed', 'failed')),
  
  -- Daily.co specific fields
  daily_room_id TEXT,
  daily_room_url TEXT,
  daily_recording_id TEXT,
  daily_download_url TEXT,
  
  -- Video metadata
  duration_seconds INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE,
  
  -- File URLs
  raw_video_url TEXT,
  final_video_url TEXT,
  transcript_url TEXT,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT
);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON sessions
  FOR ALL USING (true);

-- Create indexes for faster queries
CREATE INDEX idx_sessions_brand_id ON sessions(brand_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- Create brand_assets table
CREATE TABLE brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL CHECK (brand_id IN ('ssv', 'igta', 'camino', 'aventus', 'innovative')),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('intro', 'outro', 'logo', 'watermark')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  duration_seconds INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(brand_id, asset_type)
);

ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON brand_assets
  FOR ALL USING (true);

-- Create transcripts table
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  full_text TEXT,
  srt_content TEXT,
  vtt_content TEXT,
  word_count INTEGER,
  language TEXT DEFAULT 'en',
  provider TEXT DEFAULT 'assemblyai',
  provider_job_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON transcripts
  FOR ALL USING (true);

CREATE INDEX idx_transcripts_session_id ON transcripts(session_id);

-- Create distribution_logs table
CREATE TABLE distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'linkedin', 'tiktok', 'instagram', 'twitter')),
  platform_post_id TEXT,
  post_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed')),
  error_message TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE distribution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON distribution_logs
  FOR ALL USING (true);

CREATE INDEX idx_distribution_logs_session_id ON distribution_logs(session_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('brand-assets', 'brand-assets', true),
  ('recordings', 'recordings', false),
  ('final-videos', 'final-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for brand-assets (public)
CREATE POLICY "Public access for brand assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can upload brand assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can update brand assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can delete brand assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-assets');

-- Storage policies for recordings (private)
CREATE POLICY "Authenticated users can access recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'recordings');

CREATE POLICY "Authenticated users can upload recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recordings');

-- Storage policies for final-videos (public)
CREATE POLICY "Public access for final videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'final-videos');

CREATE POLICY "Authenticated users can upload final videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'final-videos');

CREATE POLICY "Authenticated users can update final videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'final-videos');

CREATE POLICY "Authenticated users can delete final videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'final-videos');