-- Drop the old check constraint
ALTER TABLE sessions DROP CONSTRAINT sessions_brand_id_check;

-- Add updated check constraint with the correct brand values
ALTER TABLE sessions ADD CONSTRAINT sessions_brand_id_check 
  CHECK (brand_id = ANY (ARRAY['ssv'::text, 'pco'::text, 'meo'::text, 'igta'::text, 'camino'::text, 'aventus'::text, 'innovative'::text]));