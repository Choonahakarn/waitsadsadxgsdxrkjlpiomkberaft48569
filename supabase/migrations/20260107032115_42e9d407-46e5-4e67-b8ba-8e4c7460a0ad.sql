-- Drop existing restrictive policies for profiles SELECT
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy to allow anyone to view all profiles (for showing names in posts/comments)
CREATE POLICY "Anyone can view profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Also add policy to allow viewing artist profiles for unverified ones (for community features)
DROP POLICY IF EXISTS "Anyone can view verified artist profiles" ON public.artist_profiles;

CREATE POLICY "Anyone can view all artist profiles for community" 
ON public.artist_profiles 
FOR SELECT 
USING (true);