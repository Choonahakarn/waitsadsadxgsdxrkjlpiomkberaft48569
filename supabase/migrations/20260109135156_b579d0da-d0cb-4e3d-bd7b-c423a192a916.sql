-- Fix artworks UPDATE policy - add WITH CHECK clause
DROP POLICY IF EXISTS "Artists can update their own artworks" ON public.artworks;

CREATE POLICY "Artists can update their own artworks" 
ON public.artworks 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM artist_profiles
  WHERE artist_profiles.id = artworks.artist_id 
  AND artist_profiles.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM artist_profiles
  WHERE artist_profiles.id = artworks.artist_id 
  AND artist_profiles.user_id = auth.uid()
));

-- Fix verification_submissions Artists UPDATE policy - add WITH CHECK clause
DROP POLICY IF EXISTS "Artists can update their own pending submissions" ON public.verification_submissions;

CREATE POLICY "Artists can update their own pending submissions" 
ON public.verification_submissions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM artist_profiles
    WHERE artist_profiles.id = verification_submissions.artist_id 
    AND artist_profiles.user_id = auth.uid()
  ) 
  AND status = 'pending'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM artist_profiles
    WHERE artist_profiles.id = verification_submissions.artist_id 
    AND artist_profiles.user_id = auth.uid()
  ) 
  AND status = 'pending'
);

-- Fix verification_submissions Admins UPDATE policy - add WITH CHECK clause  
DROP POLICY IF EXISTS "Admins can update all submissions" ON public.verification_submissions;

CREATE POLICY "Admins can update all submissions" 
ON public.verification_submissions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));