-- Fix function search path for generate_user_display_id
CREATE OR REPLACE FUNCTION public.generate_user_display_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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