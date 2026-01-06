-- Add storage policies for artworks bucket (artists can upload their own artworks)
CREATE POLICY "Artists can upload their own artworks"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artworks' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM artist_profiles 
    WHERE artist_profiles.id::text = (storage.foldername(name))[1]
    AND artist_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Artists can update their own artworks"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artworks' 
  AND EXISTS (
    SELECT 1 FROM artist_profiles 
    WHERE artist_profiles.id::text = (storage.foldername(name))[1]
    AND artist_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Artists can delete their own artworks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artworks' 
  AND EXISTS (
    SELECT 1 FROM artist_profiles 
    WHERE artist_profiles.id::text = (storage.foldername(name))[1]
    AND artist_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view artworks"
ON storage.objects FOR SELECT
USING (bucket_id = 'artworks');