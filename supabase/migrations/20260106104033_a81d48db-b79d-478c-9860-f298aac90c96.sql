-- Create shared_posts table for internal sharing
CREATE TABLE public.shared_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can view shared posts
CREATE POLICY "Anyone can view shared posts"
ON public.shared_posts
FOR SELECT
USING (true);

-- Users can share posts
CREATE POLICY "Users can share posts"
ON public.shared_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete their shares"
ON public.shared_posts
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_shared_posts_user_id ON public.shared_posts(user_id);
CREATE INDEX idx_shared_posts_post_id ON public.shared_posts(post_id);
CREATE INDEX idx_shared_posts_created_at ON public.shared_posts(created_at DESC);