-- Update handle_new_user function to also set display_name from display_id or from passed display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  user_full_name text;
  user_first_name text;
  user_last_name text;
  user_display_id text;
  user_display_name text;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  user_display_id := NEW.raw_user_meta_data ->> 'display_id';
  user_display_name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', user_display_id);
  
  -- Split full_name into first and last name
  IF position(' ' in user_full_name) > 0 THEN
    user_first_name := split_part(user_full_name, ' ', 1);
    user_last_name := substring(user_full_name from position(' ' in user_full_name) + 1);
  ELSE
    user_first_name := user_full_name;
    user_last_name := '';
  END IF;
  
  -- Insert profile with display_name
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, display_id, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_first_name,
    user_last_name,
    user_display_id,
    user_display_name  -- Set display_name from metadata or fallback to display_id
  );
  
  -- Determine role from metadata (default to buyer)
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'buyer');
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- If artist, create artist profile
  IF user_role = 'artist' THEN
    INSERT INTO public.artist_profiles (user_id, artist_name)
    VALUES (NEW.id, COALESCE(user_display_id, user_full_name, 'Artist'));
  END IF;
  
  RETURN NEW;
END;
$function$;