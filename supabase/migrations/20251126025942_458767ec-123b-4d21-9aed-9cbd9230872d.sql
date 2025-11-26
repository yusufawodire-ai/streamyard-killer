-- Create thumbnails storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  1048576, -- 1MB limit for thumbnails
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Add thumbnail_url column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Create RLS policies for thumbnails bucket
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'thumbnails' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'thumbnails' AND auth.role() = 'authenticated');