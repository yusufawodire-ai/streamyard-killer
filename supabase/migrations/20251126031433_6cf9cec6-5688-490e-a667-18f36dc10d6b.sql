-- Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  is_starred boolean DEFAULT false,
  color text DEFAULT '#3b82f6',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add folder_id to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;

-- Add is_starred to sessions for quick access
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false;

-- Add is_trashed for soft delete
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS is_trashed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trashed_at timestamp with time zone;

-- Enable RLS on folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
CREATE POLICY "Allow all for authenticated users" 
ON public.folders 
FOR ALL 
USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_folder_id ON public.sessions(folder_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_starred ON public.sessions(is_starred);
CREATE INDEX IF NOT EXISTS idx_sessions_is_trashed ON public.sessions(is_trashed);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);

-- Create function to update folders updated_at
CREATE OR REPLACE FUNCTION public.update_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for folders
DROP TRIGGER IF EXISTS update_folders_updated_at ON public.folders;
CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON public.folders
FOR EACH ROW
EXECUTE FUNCTION public.update_folders_updated_at();