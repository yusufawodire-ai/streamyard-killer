-- Fix function search_path for security (drop trigger first)
DROP TRIGGER IF EXISTS update_folders_updated_at ON public.folders;
DROP FUNCTION IF EXISTS public.update_folders_updated_at();

CREATE OR REPLACE FUNCTION public.update_folders_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON public.folders
FOR EACH ROW
EXECUTE FUNCTION public.update_folders_updated_at();