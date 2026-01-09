-- Add hashtags column to community_posts table
ALTER TABLE public.community_posts 
ADD COLUMN hashtags TEXT[] DEFAULT '{}'::text[];