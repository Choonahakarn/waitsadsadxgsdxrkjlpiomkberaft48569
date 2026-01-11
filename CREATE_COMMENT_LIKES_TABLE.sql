-- Run this SQL in Supabase Dashboard -> SQL Editor
-- Create community_comment_likes table for tracking comment likes
CREATE TABLE IF NOT EXISTS public.community_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS for community_comment_likes
DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.community_comment_likes;
CREATE POLICY "Anyone can view comment likes" 
ON public.community_comment_likes FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can like comments" ON public.community_comment_likes;
CREATE POLICY "Authenticated users can like comments" 
ON public.community_comment_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike their own comment likes" ON public.community_comment_likes;
CREATE POLICY "Users can unlike their own comment likes" 
ON public.community_comment_likes FOR DELETE 
USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.community_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.community_comment_likes(user_id);

-- Enable realtime for comment likes (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'community_comment_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comment_likes;
  END IF;
END $$;
