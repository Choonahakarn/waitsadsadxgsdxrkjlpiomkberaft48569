-- Add display_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_id text UNIQUE;

-- Create a function to generate sequential user IDs
CREATE OR REPLACE FUNCTION generate_user_display_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
BEGIN
  -- Get the next number based on existing User IDs
  SELECT COALESCE(MAX(
    CASE 
      WHEN display_id ~ '^User[0-9]+$' 
      THEN CAST(SUBSTRING(display_id FROM 5) AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.profiles
  WHERE display_id IS NOT NULL;
  
  RETURN 'User' || next_number;
END;
$$;

-- Update existing profiles that don't have a display_id
DO $$
DECLARE
  profile_record RECORD;
  counter integer := 1;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles 
    WHERE display_id IS NULL 
    ORDER BY created_at ASC
  LOOP
    UPDATE public.profiles 
    SET display_id = 'User' || counter 
    WHERE id = profile_record.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Create trigger to auto-generate display_id for new profiles
CREATE OR REPLACE FUNCTION set_default_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := generate_user_display_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_default_display_id ON public.profiles;

CREATE TRIGGER trigger_set_default_display_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION set_default_display_id();