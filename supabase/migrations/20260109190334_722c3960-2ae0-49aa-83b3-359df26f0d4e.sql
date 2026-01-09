-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.community_comments;

-- Create new policy that allows:
-- 1. Users to delete their own comments
-- 2. Post owners to delete any comments on their posts
CREATE POLICY "Users can delete comments on own posts or own comments"
ON public.community_comments
FOR DELETE
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.community_posts 
    WHERE community_posts.id = community_comments.post_id 
    AND community_posts.user_id = auth.uid()
  )
);