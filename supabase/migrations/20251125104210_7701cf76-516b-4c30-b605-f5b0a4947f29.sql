-- Create session_brand_variants table for multi-brand distribution
CREATE TABLE IF NOT EXISTS public.session_brand_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  brand_id TEXT NOT NULL,
  variant_name TEXT,
  intro_url TEXT,
  outro_url TEXT,
  final_video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_brand_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all for authenticated users"
  ON public.session_brand_variants
  FOR ALL
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_session_brand_variants_base_session 
  ON public.session_brand_variants(base_session_id);

-- Create index for brand lookups
CREATE INDEX IF NOT EXISTS idx_session_brand_variants_brand 
  ON public.session_brand_variants(brand_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_session_brand_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_brand_variants_updated_at_trigger
  BEFORE UPDATE ON public.session_brand_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_session_brand_variants_updated_at();