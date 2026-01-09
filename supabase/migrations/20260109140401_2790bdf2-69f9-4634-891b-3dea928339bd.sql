-- Add display_name column to profiles for buyers to set their own name
ALTER TABLE public.profiles
ADD COLUMN display_name TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.display_name IS 'Custom display name for users, similar to artist_name for artists';