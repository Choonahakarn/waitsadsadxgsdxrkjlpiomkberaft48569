-- Ensure DELETE realtime payload includes row data
ALTER TABLE public.community_likes REPLICA IDENTITY FULL;

-- Clean up duplicate like notifications per (owner, actor, post)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, actor_id, reference_id, type
           ORDER BY created_at DESC
         ) AS rn
  FROM public.notifications
  WHERE type = 'like'
    AND actor_id IS NOT NULL
    AND reference_id IS NOT NULL
)
DELETE FROM public.notifications n
USING ranked r
WHERE n.id = r.id
  AND r.rn > 1;

-- Prevent future duplicate like notifications (race-safe)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_like_notifications
ON public.notifications (user_id, actor_id, reference_id)
WHERE type = 'like'
  AND actor_id IS NOT NULL
  AND reference_id IS NOT NULL;