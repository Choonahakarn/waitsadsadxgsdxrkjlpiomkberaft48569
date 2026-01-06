-- Add identity verification fields to artist_profiles
ALTER TABLE public.artist_profiles 
ADD COLUMN IF NOT EXISTS real_name text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false;