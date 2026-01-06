-- Add RLS policy for users to insert their own roles
CREATE POLICY "Users can add roles for themselves"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);