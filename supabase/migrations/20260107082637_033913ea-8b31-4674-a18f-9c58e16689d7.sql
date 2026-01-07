-- Add position columns for cover and avatar images
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS cover_position_y INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_position_x INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_position_y INTEGER DEFAULT 50;

ALTER TABLE public.artist_profiles 
  ADD COLUMN IF NOT EXISTS cover_position_y INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_position_x INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_position_y INTEGER DEFAULT 50;