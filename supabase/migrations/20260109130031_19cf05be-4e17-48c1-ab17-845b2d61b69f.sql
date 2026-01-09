-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;

-- Update existing profiles: split full_name into first_name and last_name
-- For profiles with full_name, split by first space
UPDATE public.profiles
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      CASE 
        WHEN position(' ' in full_name) > 0 THEN split_part(full_name, ' ', 1)
        ELSE full_name
      END
    ELSE NULL
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' AND position(' ' in full_name) > 0 THEN
      substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL;

-- For users without names, assign sequential names like "name1", "lastname1"
DO $$
DECLARE
  profile_record RECORD;
  counter integer := 1;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles 
    WHERE (first_name IS NULL OR first_name = '') 
    ORDER BY created_at ASC
  LOOP
    UPDATE public.profiles 
    SET 
      first_name = 'name' || counter,
      last_name = 'lastname' || counter
    WHERE id = profile_record.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Update handle_new_user function to store first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_full_name text;
  user_first_name text;
  user_last_name text;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  
  -- Split full_name into first and last name
  IF position(' ' in user_full_name) > 0 THEN
    user_first_name := split_part(user_full_name, ' ', 1);
    user_last_name := substring(user_full_name from position(' ' in user_full_name) + 1);
  ELSE
    user_first_name := user_full_name;
    user_last_name := '';
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_first_name,
    user_last_name
  );
  
  -- Determine role from metadata (default to buyer)
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'buyer');
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- If artist, create artist profile
  IF user_role = 'artist' THEN
    INSERT INTO public.artist_profiles (user_id, artist_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_id', NEW.raw_user_meta_data ->> 'full_name', 'Artist'));
  END IF;
  
  RETURN NEW;
END;
$$;