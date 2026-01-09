-- Remove unused OTP table (security hardening)
DROP TABLE IF EXISTS public.email_otps CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_otps();

-- Update signup handler to correctly assign roles for artists (artist + buyer)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
  user_full_name text;
  user_first_name text;
  user_last_name text;
  user_display_id text;
  user_display_name text;
  user_real_name text;
  user_phone_number text;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  user_display_id := NEW.raw_user_meta_data ->> 'display_id';
  user_display_name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', user_display_id);

  -- Optional artist verification info (stored as metadata at signup)
  user_real_name := NEW.raw_user_meta_data ->> 'real_name';
  user_phone_number := NEW.raw_user_meta_data ->> 'phone_number';

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
    user_display_name
  );

  -- Determine role from metadata (default to buyer)
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'buyer');

  -- Insert primary role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  -- If artist, also grant buyer role (so artists can purchase too)
  IF user_role = 'artist' THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT NEW.id, 'buyer'::app_role
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'buyer'::app_role
    );

    -- Create artist profile
    INSERT INTO public.artist_profiles (user_id, artist_name, real_name, phone_number, verification_submitted_at)
    VALUES (
      NEW.id,
      COALESCE(user_display_name, user_display_id, user_full_name, 'Artist'),
      user_real_name,
      user_phone_number,
      CASE
        WHEN user_real_name IS NOT NULL AND user_real_name <> '' AND user_phone_number IS NOT NULL AND user_phone_number <> ''
        THEN now()
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$;