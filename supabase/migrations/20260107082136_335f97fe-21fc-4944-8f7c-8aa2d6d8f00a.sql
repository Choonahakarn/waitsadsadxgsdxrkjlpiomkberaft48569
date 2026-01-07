-- Add cover_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Add cover_url column to artist_profiles table  
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;