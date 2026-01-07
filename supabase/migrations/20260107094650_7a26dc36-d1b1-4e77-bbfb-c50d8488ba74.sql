-- Add actor_id to notifications so we can safely dedupe/revert notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS actor_id uuid;

-- Helpful index for lookups (recipient + type + reference + actor + time)
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_ref_actor_created
ON public.notifications (user_id, type, reference_id, actor_id, created_at DESC);

-- Allow the actor to delete their own LIKE notifications shortly after creating them
-- This prevents notification spam (like/unlike) while keeping access tightly scoped.
DROP POLICY IF EXISTS "Actors can delete their own like notifications quickly" ON public.notifications;
CREATE POLICY "Actors can delete their own like notifications quickly"
ON public.notifications
FOR DELETE
USING (
  auth.uid() = actor_id
  AND type = 'like'
  AND created_at >= (now() - interval '5 seconds')
);
