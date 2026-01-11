-- Fix notifications policy to allow authenticated users to insert notifications
-- This allows users to send notifications to other users (e.g., when commenting, liking, following)

-- Drop the old policy that only allows service role
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Create new policy that allows authenticated users to insert notifications
-- Users can insert notifications for any user_id (to allow sending notifications to others)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow service role for edge functions
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);
