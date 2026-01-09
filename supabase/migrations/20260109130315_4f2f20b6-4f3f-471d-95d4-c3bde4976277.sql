-- Add column to track when artist name was last changed
ALTER TABLE public.artist_profiles 
ADD COLUMN artist_name_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;