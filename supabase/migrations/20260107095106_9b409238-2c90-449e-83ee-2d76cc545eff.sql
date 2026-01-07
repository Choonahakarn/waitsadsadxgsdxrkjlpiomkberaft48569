-- Update policy to allow actors to delete their own LIKE notifications (no strict time window)
DROP POLICY IF EXISTS "Actors can delete their own like notifications quickly" ON public.notifications;
DROP POLICY IF EXISTS "Actors can delete their own like notifications" ON public.notifications;

CREATE POLICY "Actors can delete their own like notifications"
ON public.notifications
FOR DELETE
USING (
  auth.uid() = actor_id
  AND type = 'like'
);
