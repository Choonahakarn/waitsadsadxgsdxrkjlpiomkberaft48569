-- Add parent_id column for nested comments
ALTER TABLE public.community_comments 
ADD COLUMN parent_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE;

-- Create index for faster parent lookups
CREATE INDEX idx_comments_parent_id ON public.community_comments(parent_id);

-- Create index for faster post comments lookup
CREATE INDEX idx_comments_post_id ON public.community_comments(post_id);