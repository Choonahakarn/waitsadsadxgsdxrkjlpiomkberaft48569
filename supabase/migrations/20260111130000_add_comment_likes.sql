-- Create community_comment_likes table for tracking comment likes
CREATE TABLE public.community_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS for community_comment_likes
CREATE POLICY "Anyone can view comment likes" 
ON public.community_comment_likes FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can like comments" 
ON public.community_comment_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own comment likes" 
ON public.community_comment_likes FOR DELETE 
USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX idx_comment_likes_comment_id ON public.community_comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.community_comment_likes(user_id);

-- Enable realtime for comment likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comment_likes;
