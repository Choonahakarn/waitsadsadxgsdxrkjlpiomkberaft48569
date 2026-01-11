-- Add admin delete policies for community_posts and community_comments
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql
-- This allows admins to delete any posts and comments

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can delete any posts" ON public.community_posts;
DROP POLICY IF EXISTS "Admins can delete any comments" ON public.community_comments;

-- Admin can delete any community post
CREATE POLICY "Admins can delete any posts"
ON public.community_posts FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any comment
CREATE POLICY "Admins can delete any comments"
ON public.community_comments FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('community_posts', 'community_comments')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;
