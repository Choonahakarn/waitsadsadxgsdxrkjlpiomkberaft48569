-- Add post_id column to artworks table to link with community_posts
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artworks_post_id ON public.artworks(post_id);

-- Add comment for documentation
COMMENT ON COLUMN public.artworks.post_id IS 'Links artwork to community post when added to portfolio';
