-- Create image_assets table for storing image metadata and CDN URLs
CREATE TABLE public.image_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  
  -- Metadata
  original_filename TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  format TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  
  -- CDN URLs for each variant
  url_blur TEXT NOT NULL,
  url_small TEXT NOT NULL,
  url_medium TEXT NOT NULL,
  url_large TEXT NOT NULL,
  
  -- Original is private, accessed via signed URL
  original_private BOOLEAN DEFAULT true,
  
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view public images"
  ON public.image_assets FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can view their own images"
  ON public.image_assets FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own images"
  ON public.image_assets FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own images"
  ON public.image_assets FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own images"
  ON public.image_assets FOR DELETE
  USING (auth.uid() = owner_id);

-- Indexes
CREATE INDEX idx_image_assets_owner ON public.image_assets(owner_id);
CREATE INDEX idx_image_assets_cloudinary_id ON public.image_assets(cloudinary_public_id);
CREATE INDEX idx_image_assets_visibility ON public.image_assets(visibility);

-- Add updated_at trigger
CREATE TRIGGER update_image_assets_updated_at
  BEFORE UPDATE ON public.image_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add image variant columns to community_posts
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS image_asset_id UUID REFERENCES public.image_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_blur_url TEXT,
  ADD COLUMN IF NOT EXISTS image_small_url TEXT,
  ADD COLUMN IF NOT EXISTS image_medium_url TEXT,
  ADD COLUMN IF NOT EXISTS image_large_url TEXT;

-- Add image variant columns to artworks
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS image_asset_id UUID REFERENCES public.image_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_blur_url TEXT,
  ADD COLUMN IF NOT EXISTS image_small_url TEXT,
  ADD COLUMN IF NOT EXISTS image_medium_url TEXT,
  ADD COLUMN IF NOT EXISTS image_large_url TEXT;