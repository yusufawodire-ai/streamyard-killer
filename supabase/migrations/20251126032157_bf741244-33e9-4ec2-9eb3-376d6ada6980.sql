-- Fix thumbnails storage bucket RLS policies to allow anonymous access
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete thumbnails" ON storage.objects;

-- Create new permissive policies (matching other public buckets)
CREATE POLICY "Anyone can upload thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Anyone can update thumbnails" ON storage.objects
  FOR UPDATE USING (bucket_id = 'thumbnails');

CREATE POLICY "Anyone can delete thumbnails" ON storage.objects
  FOR DELETE USING (bucket_id = 'thumbnails');