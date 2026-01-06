-- Create storage bucket for avatars (profile images)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for verification documents (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for artwork images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('artworks', 'artworks', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket (public access for viewing)
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for verification-docs bucket (private - only owner and admin can view)
CREATE POLICY "Users can view their own verification docs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all verification docs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload their own verification docs" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own verification docs" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for artworks bucket (public viewing, owner can manage)
CREATE POLICY "Artwork images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'artworks');

CREATE POLICY "Users can upload their own artwork images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'artworks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own artwork images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'artworks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own artwork images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'artworks' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add bio column to artist_profiles if not exists
ALTER TABLE public.artist_profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create artworks table for real artworks
CREATE TABLE IF NOT EXISTS public.artworks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  medium TEXT,
  category TEXT CHECK (category IN ('traditional', 'digital')),
  type TEXT CHECK (type IN ('original', 'commission')),
  dimensions TEXT,
  year INTEGER,
  tools_used TEXT[],
  is_verified BOOLEAN DEFAULT false,
  is_sold BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on artworks
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;

-- Artworks RLS policies
CREATE POLICY "Artworks are publicly viewable" 
ON public.artworks FOR SELECT 
USING (true);

CREATE POLICY "Artists can create their own artworks" 
ON public.artworks FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.artist_profiles 
  WHERE id = artist_id AND user_id = auth.uid()
));

CREATE POLICY "Artists can update their own artworks" 
ON public.artworks FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.artist_profiles 
  WHERE id = artist_id AND user_id = auth.uid()
));

CREATE POLICY "Artists can delete their own artworks" 
ON public.artworks FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.artist_profiles 
  WHERE id = artist_id AND user_id = auth.uid()
));

CREATE POLICY "Admins can manage all artworks" 
ON public.artworks FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create verification_submissions table
CREATE TABLE IF NOT EXISTS public.verification_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('sketch', 'wip', 'timelapse', 'photo')),
  document_url TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on verification_submissions
ALTER TABLE public.verification_submissions ENABLE ROW LEVEL SECURITY;

-- Verification submissions RLS policies
CREATE POLICY "Artists can view their own submissions" 
ON public.verification_submissions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.artist_profiles 
  WHERE id = artist_id AND user_id = auth.uid()
));

CREATE POLICY "Admins can view all submissions" 
ON public.verification_submissions FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can create submissions" 
ON public.verification_submissions FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.artist_profiles 
  WHERE id = artist_id AND user_id = auth.uid()
));

CREATE POLICY "Artists can update their own pending submissions" 
ON public.verification_submissions FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.artist_profiles 
    WHERE id = artist_id AND user_id = auth.uid()
  ) AND status = 'pending'
);

CREATE POLICY "Admins can update all submissions" 
ON public.verification_submissions FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can delete their own pending submissions" 
ON public.verification_submissions FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.artist_profiles 
    WHERE id = artist_id AND user_id = auth.uid()
  ) AND status = 'pending'
);

-- Create trigger for artworks updated_at
CREATE TRIGGER update_artworks_updated_at
BEFORE UPDATE ON public.artworks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();