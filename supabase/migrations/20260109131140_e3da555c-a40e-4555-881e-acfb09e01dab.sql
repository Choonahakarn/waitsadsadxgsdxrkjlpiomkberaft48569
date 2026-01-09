-- Fix artist_profiles UPDATE policy - add WITH CHECK clause
DROP POLICY IF EXISTS "Artists can update their own profile" ON public.artist_profiles;

CREATE POLICY "Artists can update their own profile" 
ON public.artist_profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix profiles UPDATE policy - add WITH CHECK clause
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Fix notifications INSERT policy - should only allow users to receive notifications for themselves
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Create proper INSERT policy for notifications
CREATE POLICY "Users can receive their own notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() = actor_id);

-- Add policy for system/admin to insert notifications (using security definer function)
CREATE POLICY "Service role can insert any notifications" 
ON public.notifications 
FOR INSERT 
TO service_role
WITH CHECK (true);