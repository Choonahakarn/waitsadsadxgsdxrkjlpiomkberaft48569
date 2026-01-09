-- Create table for user pinned tags (for ordering and visibility on profile)
CREATE TABLE public.user_pinned_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tag TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag)
);

-- Enable RLS
ALTER TABLE public.user_pinned_tags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view anyone's pinned tags"
ON public.user_pinned_tags
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own pinned tags"
ON public.user_pinned_tags
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pinned tags"
ON public.user_pinned_tags
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pinned tags"
ON public.user_pinned_tags
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_pinned_tags_user_id ON public.user_pinned_tags(user_id);
CREATE INDEX idx_user_pinned_tags_order ON public.user_pinned_tags(user_id, display_order);