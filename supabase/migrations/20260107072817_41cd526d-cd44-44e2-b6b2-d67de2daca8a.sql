-- First, remove any duplicate likes (keeping the oldest one)
DELETE FROM community_likes a
USING community_likes b
WHERE a.created_at > b.created_at
  AND a.post_id = b.post_id
  AND a.user_id = b.user_id;

-- Add unique constraint to prevent duplicate likes
ALTER TABLE community_likes 
ADD CONSTRAINT community_likes_post_user_unique UNIQUE (post_id, user_id);