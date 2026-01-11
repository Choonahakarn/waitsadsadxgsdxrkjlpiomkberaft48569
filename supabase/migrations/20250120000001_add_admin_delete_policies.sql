-- Add admin delete policies for community_posts and community_comments
-- This allows admins to delete any posts and comments

-- Admin can delete any community post
CREATE POLICY "Admins can delete any posts"
ON public.community_posts FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any comment
CREATE POLICY "Admins can delete any comments"
ON public.community_comments FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
