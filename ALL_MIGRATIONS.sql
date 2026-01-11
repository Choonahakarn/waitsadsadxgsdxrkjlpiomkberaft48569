-- ============================================
-- COMBINED MIGRATIONS FOR SUPABASE PROJECT
-- Project: bwimmqwtmrprnrhdszts
-- Total: 47 migrations
-- ============================================

-- ============================================
-- Migration 1/47: 20260106073508_77d966cb-c5ac-4c55-8ddd-7809cd9cafe7.sql
-- ============================================

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'artist', 'buyer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create artist_profiles table for additional artist info
CREATE TABLE public.artist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  artist_name TEXT NOT NULL,
  specialty TEXT,
  tools_used TEXT[],
  years_experience INTEGER,
  is_verified BOOLEAN DEFAULT false,
  verification_submitted_at TIMESTAMP WITH TIME ZONE,
  portfolio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Artist profiles policies
CREATE POLICY "Anyone can view verified artist profiles"
  ON public.artist_profiles FOR SELECT
  USING (is_verified = true);

CREATE POLICY "Artists can view their own profile"
  ON public.artist_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Artists can update their own profile"
  ON public.artist_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Artists can insert their own profile"
  ON public.artist_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all artist profiles"
  ON public.artist_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  
  -- Determine role from metadata (default to buyer)
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'buyer');
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- If artist, create artist profile
  IF user_role = 'artist' THEN
    INSERT INTO public.artist_profiles (user_id, artist_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Artist'));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artist_profiles_updated_at
  BEFORE UPDATE ON public.artist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Migration 2/47: 20260106073904_65baad84-dc15-4470-8e1a-25dd86dacb73.sql
-- ============================================

-- Fix update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- Migration 3/47: 20260106074858_a0af6774-3954-419c-a4e0-b5c9dc5c120a.sql
-- ============================================

-- Add RLS policy for users to insert their own roles
CREATE POLICY "Users can add roles for themselves"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Migration 4/47: 20260106075651_be3e8062-22b0-4571-8faa-9b7227716c20.sql
-- ============================================

-- Add identity verification fields to artist_profiles
ALTER TABLE public.artist_profiles 
ADD COLUMN IF NOT EXISTS real_name text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false;

-- ============================================
-- Migration 5/47: 20260106084347_f7f496cd-73a9-4838-9c5e-ff8835b25a1d.sql
-- ============================================

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

-- ============================================
-- Migration 6/47: 20260106085252_888c5235-e5e5-4ed9-b2b0-efd95e24bcbb.sql
-- ============================================

-- Create storage bucket for payment slips
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-slips', 'payment-slips', false);

-- Storage policies for payment slips
CREATE POLICY "Users can upload their own payment slips"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-slips' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own payment slips"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-slips' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all payment slips"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-slips' 
  AND has_role(auth.uid(), 'admin')
);

-- Create wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Wallet policies
CREATE POLICY "Users can view their own wallet"
ON public.wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
ON public.wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all wallets"
ON public.wallets FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create top-up requests table
CREATE TABLE public.topup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  slip_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on topup_requests
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

-- Top-up request policies
CREATE POLICY "Users can view their own topup requests"
ON public.topup_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own topup requests"
ON public.topup_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all topup requests"
ON public.topup_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all topup requests"
ON public.topup_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create wallet transactions table for history
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'topup', 'purchase', 'refund'
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID, -- topup_request_id or artwork_id
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Transaction policies
CREATE POLICY "Users can view their own transactions"
ON public.wallet_transactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.wallets 
  WHERE wallets.id = wallet_transactions.wallet_id 
  AND wallets.user_id = auth.uid()
));

CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert transactions"
ON public.wallet_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on wallets
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on topup_requests
CREATE TRIGGER update_topup_requests_updated_at
BEFORE UPDATE ON public.topup_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create wallet for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create wallet when user signs up
CREATE TRIGGER on_auth_user_created_wallet
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_wallet();

-- ============================================
-- Migration 7/47: 20260106085859_e3009060-5312-4f8b-aa04-8e4973afa001.sql
-- ============================================

-- Create orders table for purchases
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artist_profiles(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order policies
CREATE POLICY "Buyers can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Artists can view orders for their artworks"
ON public.orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.artist_profiles 
  WHERE artist_profiles.id = orders.artist_id 
  AND artist_profiles.user_id = auth.uid()
));

CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Function to handle artwork purchase
CREATE OR REPLACE FUNCTION public.purchase_artwork(
  p_artwork_id UUID,
  p_buyer_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artwork RECORD;
  v_wallet RECORD;
  v_order_id UUID;
BEGIN
  -- Get artwork details
  SELECT * INTO v_artwork FROM artworks WHERE id = p_artwork_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบผลงานนี้');
  END IF;
  
  IF v_artwork.is_sold = true THEN
    RETURN json_build_object('success', false, 'error', 'ผลงานนี้ถูกขายไปแล้ว');
  END IF;
  
  -- Get buyer's wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_buyer_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบกระเป๋าเงิน');
  END IF;
  
  IF v_wallet.balance < v_artwork.price THEN
    RETURN json_build_object('success', false, 'error', 'ยอดเงินไม่เพียงพอ กรุณาเติมเงิน');
  END IF;
  
  -- Deduct from wallet
  UPDATE wallets 
  SET balance = balance - v_artwork.price 
  WHERE id = v_wallet.id;
  
  -- Create order
  INSERT INTO orders (buyer_id, artwork_id, artist_id, amount)
  VALUES (p_buyer_id, p_artwork_id, v_artwork.artist_id, v_artwork.price)
  RETURNING id INTO v_order_id;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  VALUES (v_wallet.id, 'purchase', -v_artwork.price, 'ซื้อผลงาน: ' || v_artwork.title, v_order_id);
  
  -- Mark artwork as sold
  UPDATE artworks SET is_sold = true WHERE id = p_artwork_id;
  
  RETURN json_build_object(
    'success', true, 
    'order_id', v_order_id,
    'message', 'ซื้อผลงานสำเร็จ!'
  );
END;
$$;

-- ============================================
-- Migration 8/47: 20260106090817_f9cb7dbc-b242-482c-a5fe-d72455fc684e.sql
-- ============================================

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

-- ============================================
-- Migration 9/47: 20260106093304_70d6fc5e-f02d-4099-828b-609b9e4511aa.sql
-- ============================================

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- ============================================
-- Migration 10/47: 20260106093733_08335be5-6c79-4399-8466-df6e390e3401.sql
-- ============================================

-- Update purchase_artwork function to send notification to artist
CREATE OR REPLACE FUNCTION public.purchase_artwork(p_artwork_id uuid, p_buyer_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_artwork RECORD;
  v_wallet RECORD;
  v_artist_profile RECORD;
  v_order_id UUID;
BEGIN
  -- Get artwork details
  SELECT * INTO v_artwork FROM artworks WHERE id = p_artwork_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบผลงานนี้');
  END IF;
  
  IF v_artwork.is_sold = true THEN
    RETURN json_build_object('success', false, 'error', 'ผลงานนี้ถูกขายไปแล้ว');
  END IF;
  
  -- Get buyer's wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_buyer_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบกระเป๋าเงิน');
  END IF;
  
  IF v_wallet.balance < v_artwork.price THEN
    RETURN json_build_object('success', false, 'error', 'ยอดเงินไม่เพียงพอ กรุณาเติมเงิน');
  END IF;
  
  -- Get artist profile
  SELECT * INTO v_artist_profile FROM artist_profiles WHERE id = v_artwork.artist_id;
  
  -- Deduct from buyer wallet
  UPDATE wallets 
  SET balance = balance - v_artwork.price 
  WHERE id = v_wallet.id;
  
  -- Add to artist wallet
  UPDATE wallets 
  SET balance = balance + v_artwork.price 
  WHERE user_id = v_artist_profile.user_id;
  
  -- Create order
  INSERT INTO orders (buyer_id, artwork_id, artist_id, amount)
  VALUES (p_buyer_id, p_artwork_id, v_artwork.artist_id, v_artwork.price)
  RETURNING id INTO v_order_id;
  
  -- Create buyer transaction record
  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  VALUES (v_wallet.id, 'purchase', -v_artwork.price, 'ซื้อผลงาน: ' || v_artwork.title, v_order_id);
  
  -- Create artist income transaction record
  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  SELECT w.id, 'income', v_artwork.price, 'ขายผลงาน: ' || v_artwork.title, v_order_id
  FROM wallets w WHERE w.user_id = v_artist_profile.user_id;
  
  -- Mark artwork as sold
  UPDATE artworks SET is_sold = true WHERE id = p_artwork_id;
  
  -- Send notification to artist
  INSERT INTO notifications (user_id, title, message, type, reference_id)
  VALUES (
    v_artist_profile.user_id,
    'ยินดีด้วย! ผลงานของคุณถูกขายแล้ว 🎉',
    'ผลงาน "' || v_artwork.title || '" ถูกซื้อในราคา ฿' || v_artwork.price::text || ' เงินได้เข้ากระเป๋าเรียบร้อยแล้ว',
    'success',
    v_order_id
  );
  
  RETURN json_build_object(
    'success', true, 
    'order_id', v_order_id,
    'message', 'ซื้อผลงานสำเร็จ!'
  );
END;
$function$;

-- ============================================
-- Migration 11/47: 20260106094112_5ce95393-15b3-4106-b9d9-c0f59312207d.sql
-- ============================================

-- Add bank account info to artist_profiles
ALTER TABLE public.artist_profiles 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_account_name TEXT;

-- Create withdrawal requests table
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests" 
ON public.withdrawal_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all withdrawal requests" 
ON public.withdrawal_requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);

-- Create trigger for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Migration 12/47: 20260106094546_b8318caa-89eb-488b-ab60-a855d49fc1d1.sql
-- ============================================

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Reviews are publicly viewable" 
ON public.reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Buyers can create reviews for their orders" 
ON public.reviews 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their own reviews" 
ON public.reviews 
FOR UPDATE 
USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can delete their own reviews" 
ON public.reviews 
FOR DELETE 
USING (auth.uid() = buyer_id);

-- Create indexes
CREATE INDEX idx_reviews_artwork_id ON public.reviews(artwork_id);
CREATE INDEX idx_reviews_buyer_id ON public.reviews(buyer_id);

-- Create trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Migration 13/47: 20260106095054_64925ee3-1266-445c-8a57-28d5f0023cba.sql
-- ============================================

-- Create community_posts table for sharing artworks
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  tools_used TEXT[] DEFAULT '{}',
  category TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_comments table
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_likes table for tracking likes
CREATE TABLE public.community_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

-- RLS for community_posts
CREATE POLICY "Anyone can view community posts" 
ON public.community_posts FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create posts" 
ON public.community_posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON public.community_posts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.community_posts FOR DELETE 
USING (auth.uid() = user_id);

-- RLS for community_comments
CREATE POLICY "Anyone can view comments" 
ON public.community_comments FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create comments" 
ON public.community_comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.community_comments FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.community_comments FOR DELETE 
USING (auth.uid() = user_id);

-- RLS for community_likes
CREATE POLICY "Anyone can view likes" 
ON public.community_likes FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can like" 
ON public.community_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" 
ON public.community_likes FOR DELETE 
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX idx_community_comments_post_id ON public.community_comments(post_id);
CREATE INDEX idx_community_likes_post_id ON public.community_likes(post_id);

-- Trigger for updated_at
CREATE TRIGGER update_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at
BEFORE UPDATE ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;

-- ============================================
-- Migration 14/47: 20260106095700_68523986-9362-41d8-bf41-bfc011728f75.sql
-- ============================================

-- Create follows table
CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view follows" 
ON public.follows FOR SELECT 
USING (true);

CREATE POLICY "Users can follow others" 
ON public.follows FOR INSERT 
WITH CHECK (auth.uid() = follower_id AND auth.uid() != following_id);

CREATE POLICY "Users can unfollow" 
ON public.follows FOR DELETE 
USING (auth.uid() = follower_id);

-- Indexes
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

-- ============================================
-- Migration 15/47: 20260106103551_10849d00-ab49-427b-bdc7-1df4bc214018.sql
-- ============================================

-- Create saved_posts table
CREATE TABLE public.saved_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved posts
CREATE POLICY "Users can view their own saved posts"
ON public.saved_posts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can save posts
CREATE POLICY "Users can save posts"
ON public.saved_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unsave their own saved posts
CREATE POLICY "Users can unsave posts"
ON public.saved_posts
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- Migration 16/47: 20260106104033_a81d48db-b79d-478c-9860-f298aac90c96.sql
-- ============================================

-- Create shared_posts table for internal sharing
CREATE TABLE public.shared_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can view shared posts
CREATE POLICY "Anyone can view shared posts"
ON public.shared_posts
FOR SELECT
USING (true);

-- Users can share posts
CREATE POLICY "Users can share posts"
ON public.shared_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete their shares"
ON public.shared_posts
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_shared_posts_user_id ON public.shared_posts(user_id);
CREATE INDEX idx_shared_posts_post_id ON public.shared_posts(post_id);
CREATE INDEX idx_shared_posts_created_at ON public.shared_posts(created_at DESC);

-- ============================================
-- Migration 17/47: 20260107032115_42e9d407-46e5-4e67-b8ba-8e4c7460a0ad.sql
-- ============================================

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

-- ============================================
-- Migration 18/47: 20260107072817_41cd526d-cd44-44e2-b6b2-d67de2daca8a.sql
-- ============================================

-- First, remove any duplicate likes (keeping the oldest one)
DELETE FROM community_likes a
USING community_likes b
WHERE a.created_at > b.created_at
  AND a.post_id = b.post_id
  AND a.user_id = b.user_id;

-- Add unique constraint to prevent duplicate likes
ALTER TABLE community_likes 
ADD CONSTRAINT community_likes_post_user_unique UNIQUE (post_id, user_id);

-- ============================================
-- Migration 19/47: 20260107082136_335f97fe-21fc-4944-8f7c-8aa2d6d8f00a.sql
-- ============================================

-- Add cover_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Add cover_url column to artist_profiles table  
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- ============================================
-- Migration 20/47: 20260107082637_033913ea-8b31-4674-a18f-9c58e16689d7.sql
-- ============================================

-- Add position columns for cover and avatar images
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS cover_position_y INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_position_x INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_position_y INTEGER DEFAULT 50;

ALTER TABLE public.artist_profiles 
  ADD COLUMN IF NOT EXISTS cover_position_y INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_position_x INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_position_y INTEGER DEFAULT 50;

-- ============================================
-- Migration 21/47: 20260107090246_0a4b92cb-3683-4868-93ac-44d2e49a27b3.sql
-- ============================================

-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- Create user_mutes table
CREATE TABLE public.user_mutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  muter_id UUID NOT NULL,
  muted_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (muter_id, muted_id)
);

-- Create user_reports table
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_id UUID NOT NULL,
  reason TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_blocks
CREATE POLICY "Users can block others"
  ON public.user_blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id AND auth.uid() != blocked_id);

CREATE POLICY "Users can unblock"
  ON public.user_blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can view their own blocks"
  ON public.user_blocks
  FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Admins can view all blocks"
  ON public.user_blocks
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_mutes
CREATE POLICY "Users can mute others"
  ON public.user_mutes
  FOR INSERT
  WITH CHECK (auth.uid() = muter_id AND auth.uid() != muted_id);

CREATE POLICY "Users can unmute"
  ON public.user_mutes
  FOR DELETE
  USING (auth.uid() = muter_id);

CREATE POLICY "Users can view their own mutes"
  ON public.user_mutes
  FOR SELECT
  USING (auth.uid() = muter_id);

CREATE POLICY "Admins can view all mutes"
  ON public.user_mutes
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_reports
CREATE POLICY "Users can create reports"
  ON public.user_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id AND auth.uid() != reported_id);

CREATE POLICY "Users can view their own reports"
  ON public.user_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON public.user_reports
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
  ON public.user_reports
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_id);
CREATE INDEX idx_user_mutes_muter ON public.user_mutes(muter_id);
CREATE INDEX idx_user_mutes_muted ON public.user_mutes(muted_id);
CREATE INDEX idx_user_reports_reporter ON public.user_reports(reporter_id);
CREATE INDEX idx_user_reports_reported ON public.user_reports(reported_id);
CREATE INDEX idx_user_reports_status ON public.user_reports(status);

-- ============================================
-- Migration 22/47: 20260107093036_5ca4ed24-9b68-4c21-aa17-eb937165ff7f.sql
-- ============================================

-- Enable realtime for community_likes table
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_likes;

-- ============================================
-- Migration 23/47: 20260107093647_830cbb9a-2ecd-4062-88a5-e2af2c4746f2.sql
-- ============================================

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================
-- Migration 24/47: 20260107094650_7a26dc36-d1b1-4e77-bbfb-c50d8488ba74.sql
-- ============================================

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


-- ============================================
-- Migration 25/47: 20260107095106_9b409238-2c90-449e-83ee-2d76cc545eff.sql
-- ============================================

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


-- ============================================
-- Migration 26/47: 20260107100547_d632bc39-deaa-4123-ab41-fe83db72eb3d.sql
-- ============================================

-- Add is_clicked column to track if notification item was actually viewed
ALTER TABLE public.notifications
ADD COLUMN is_clicked BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- Migration 27/47: 20260108032735_ae5abcbd-ad3d-4daa-9850-1149ad57ff9b.sql
-- ============================================

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

-- ============================================
-- Migration 28/47: 20260108033429_d92c21eb-3166-4b83-a775-c13bdd97bd3b.sql
-- ============================================

-- Add parent_id column for nested comments
ALTER TABLE public.community_comments 
ADD COLUMN parent_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE;

-- Create index for faster parent lookups
CREATE INDEX idx_comments_parent_id ON public.community_comments(parent_id);

-- Create index for faster post comments lookup
CREATE INDEX idx_comments_post_id ON public.community_comments(post_id);

-- ============================================
-- Migration 29/47: 20260109125212_ab555094-b622-49f6-963b-4e72369c3c5a.sql
-- ============================================

-- Add display_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_id text UNIQUE;

-- Create a function to generate sequential user IDs
CREATE OR REPLACE FUNCTION generate_user_display_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
BEGIN
  -- Get the next number based on existing User IDs
  SELECT COALESCE(MAX(
    CASE 
      WHEN display_id ~ '^User[0-9]+$' 
      THEN CAST(SUBSTRING(display_id FROM 5) AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.profiles
  WHERE display_id IS NOT NULL;
  
  RETURN 'User' || next_number;
END;
$$;

-- Update existing profiles that don't have a display_id
DO $$
DECLARE
  profile_record RECORD;
  counter integer := 1;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles 
    WHERE display_id IS NULL 
    ORDER BY created_at ASC
  LOOP
    UPDATE public.profiles 
    SET display_id = 'User' || counter 
    WHERE id = profile_record.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Create trigger to auto-generate display_id for new profiles
CREATE OR REPLACE FUNCTION set_default_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := generate_user_display_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_default_display_id ON public.profiles;

CREATE TRIGGER trigger_set_default_display_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION set_default_display_id();

-- ============================================
-- Migration 30/47: 20260109125243_5ef0e8e3-48b5-488d-a9db-8d11b9835c87.sql
-- ============================================

-- Fix function search path for generate_user_display_id
CREATE OR REPLACE FUNCTION public.generate_user_display_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number integer;
BEGIN
  -- Get the next number based on existing User IDs
  SELECT COALESCE(MAX(
    CASE 
      WHEN display_id ~ '^User[0-9]+$' 
      THEN CAST(SUBSTRING(display_id FROM 5) AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.profiles
  WHERE display_id IS NOT NULL;
  
  RETURN 'User' || next_number;
END;
$$;

-- ============================================
-- Migration 31/47: 20260109130031_19cf05be-4e17-48c1-ab17-845b2d61b69f.sql
-- ============================================

-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;

-- Update existing profiles: split full_name into first_name and last_name
-- For profiles with full_name, split by first space
UPDATE public.profiles
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      CASE 
        WHEN position(' ' in full_name) > 0 THEN split_part(full_name, ' ', 1)
        ELSE full_name
      END
    ELSE NULL
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' AND position(' ' in full_name) > 0 THEN
      substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL;

-- For users without names, assign sequential names like "name1", "lastname1"
DO $$
DECLARE
  profile_record RECORD;
  counter integer := 1;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles 
    WHERE (first_name IS NULL OR first_name = '') 
    ORDER BY created_at ASC
  LOOP
    UPDATE public.profiles 
    SET 
      first_name = 'name' || counter,
      last_name = 'lastname' || counter
    WHERE id = profile_record.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Update handle_new_user function to store first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_full_name text;
  user_first_name text;
  user_last_name text;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  
  -- Split full_name into first and last name
  IF position(' ' in user_full_name) > 0 THEN
    user_first_name := split_part(user_full_name, ' ', 1);
    user_last_name := substring(user_full_name from position(' ' in user_full_name) + 1);
  ELSE
    user_first_name := user_full_name;
    user_last_name := '';
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_first_name,
    user_last_name
  );
  
  -- Determine role from metadata (default to buyer)
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'buyer');
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- If artist, create artist profile
  IF user_role = 'artist' THEN
    INSERT INTO public.artist_profiles (user_id, artist_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_id', NEW.raw_user_meta_data ->> 'full_name', 'Artist'));
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- Migration 32/47: 20260109130315_4f2f20b6-4f3f-471d-95d4-c3bde4976277.sql
-- ============================================

-- Add column to track when artist name was last changed
ALTER TABLE public.artist_profiles 
ADD COLUMN artist_name_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ============================================
-- Migration 33/47: 20260109131140_e3da555c-a40e-4555-881e-acfb09e01dab.sql
-- ============================================

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

-- ============================================
-- Migration 34/47: 20260109135156_b579d0da-d0cb-4e3d-bd7b-c423a192a916.sql
-- ============================================

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

-- ============================================
-- Migration 35/47: 20260109140401_2790bdf2-69f9-4634-891b-3dea928339bd.sql
-- ============================================

-- Add display_name column to profiles for buyers to set their own name
ALTER TABLE public.profiles
ADD COLUMN display_name TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.display_name IS 'Custom display name for users, similar to artist_name for artists';

-- ============================================
-- Migration 36/47: 20260109141303_4b379181-c284-43d6-a238-d011d4ea9bbd.sql
-- ============================================

-- Add display_name_changed_at column to track when display_name was last changed
ALTER TABLE public.profiles
ADD COLUMN display_name_changed_at TIMESTAMP WITH TIME ZONE;

-- Update existing profiles to set display_name from display_id if not already set
UPDATE public.profiles
SET display_name = display_id
WHERE display_name IS NULL AND display_id IS NOT NULL;

-- Update handle_new_user function to set display_name from display_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  user_full_name text;
  user_first_name text;
  user_last_name text;
  user_display_id text;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  user_display_id := NEW.raw_user_meta_data ->> 'display_id';
  
  -- Split full_name into first and last name
  IF position(' ' in user_full_name) > 0 THEN
    user_first_name := split_part(user_full_name, ' ', 1);
    user_last_name := substring(user_full_name from position(' ' in user_full_name) + 1);
  ELSE
    user_first_name := user_full_name;
    user_last_name := '';
  END IF;
  
  -- Insert profile with display_name set to display_id
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, display_id, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_first_name,
    user_last_name,
    user_display_id,
    user_display_id  -- Set display_name same as display_id
  );
  
  -- Determine role from metadata (default to buyer)
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'buyer');
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- If artist, create artist profile
  IF user_role = 'artist' THEN
    INSERT INTO public.artist_profiles (user_id, artist_name)
    VALUES (NEW.id, COALESCE(user_display_id, user_full_name, 'Artist'));
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================
-- Migration 37/47: 20260109142042_b8d4b74d-5604-4409-a74f-ae9720586cf0.sql
-- ============================================

-- Update handle_new_user function to also set display_name from display_id or from passed display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  user_full_name text;
  user_first_name text;
  user_last_name text;
  user_display_id text;
  user_display_name text;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  user_display_id := NEW.raw_user_meta_data ->> 'display_id';
  user_display_name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', user_display_id);
  
  -- Split full_name into first and last name
  IF position(' ' in user_full_name) > 0 THEN
    user_first_name := split_part(user_full_name, ' ', 1);
    user_last_name := substring(user_full_name from position(' ' in user_full_name) + 1);
  ELSE
    user_first_name := user_full_name;
    user_last_name := '';
  END IF;
  
  -- Insert profile with display_name
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, display_id, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_first_name,
    user_last_name,
    user_display_id,
    user_display_name  -- Set display_name from metadata or fallback to display_id
  );
  
  -- Determine role from metadata (default to buyer)
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'buyer');
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- If artist, create artist profile
  IF user_role = 'artist' THEN
    INSERT INTO public.artist_profiles (user_id, artist_name)
    VALUES (NEW.id, COALESCE(user_display_id, user_full_name, 'Artist'));
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================
-- Migration 38/47: 20260109144814_2d40d3cc-1e4f-4868-a705-85dca34bb6e8.sql
-- ============================================

-- Create table for storing email OTP codes
CREATE TABLE public.email_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_email_otps_email ON public.email_otps(email);
CREATE INDEX idx_email_otps_expires_at ON public.email_otps(expires_at);

-- Enable RLS
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for signup flow)
CREATE POLICY "Anyone can insert OTP"
ON public.email_otps
FOR INSERT
WITH CHECK (true);

-- Allow anyone to select their own OTP by email
CREATE POLICY "Anyone can select OTP by email"
ON public.email_otps
FOR SELECT
USING (true);

-- Allow anyone to update (for marking as verified)
CREATE POLICY "Anyone can update OTP"
ON public.email_otps
FOR UPDATE
USING (true);

-- Allow deletion of expired OTPs
CREATE POLICY "Anyone can delete expired OTPs"
ON public.email_otps
FOR DELETE
USING (expires_at < now());

-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_otps WHERE expires_at < now();
END;
$$;

-- ============================================
-- Migration 39/47: 20260109151057_84b37a35-c00c-4e04-a3fd-b6643865f060.sql
-- ============================================

-- Remove unused OTP table (security hardening)
DROP TABLE IF EXISTS public.email_otps CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_otps();

-- Update signup handler to correctly assign roles for artists (artist + buyer)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
  user_full_name text;
  user_first_name text;
  user_last_name text;
  user_display_id text;
  user_display_name text;
  user_real_name text;
  user_phone_number text;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  user_display_id := NEW.raw_user_meta_data ->> 'display_id';
  user_display_name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', user_display_id);

  -- Optional artist verification info (stored as metadata at signup)
  user_real_name := NEW.raw_user_meta_data ->> 'real_name';
  user_phone_number := NEW.raw_user_meta_data ->> 'phone_number';

  -- Split full_name into first and last name
  IF position(' ' in user_full_name) > 0 THEN
    user_first_name := split_part(user_full_name, ' ', 1);
    user_last_name := substring(user_full_name from position(' ' in user_full_name) + 1);
  ELSE
    user_first_name := user_full_name;
    user_last_name := '';
  END IF;

  -- Insert profile with display_name
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, display_id, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_first_name,
    user_last_name,
    user_display_id,
    user_display_name
  );

  -- Determine role from metadata (default to buyer)
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'buyer');

  -- Insert primary role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  -- If artist, also grant buyer role (so artists can purchase too)
  IF user_role = 'artist' THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT NEW.id, 'buyer'::app_role
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'buyer'::app_role
    );

    -- Create artist profile
    INSERT INTO public.artist_profiles (user_id, artist_name, real_name, phone_number, verification_submitted_at)
    VALUES (
      NEW.id,
      COALESCE(user_display_name, user_display_id, user_full_name, 'Artist'),
      user_real_name,
      user_phone_number,
      CASE
        WHEN user_real_name IS NOT NULL AND user_real_name <> '' AND user_phone_number IS NOT NULL AND user_phone_number <> ''
        THEN now()
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- Migration 40/47: 20260109151843_40e683a3-c73c-4b54-8bf0-ba57128de37a.sql
-- ============================================

-- Create email_otps table for artist email verification
CREATE TABLE IF NOT EXISTS public.email_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON public.email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON public.email_otps(expires_at);

-- Enable RLS
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- No public access - only edge functions with service role can access
-- This is intentional for security

-- ============================================
-- Migration 41/47: 20260109160105_f69c5cc3-18da-4a13-acb9-6e8c45183ab5.sql
-- ============================================

-- Create table for user pinned tags (for ordering and visibility on profile)
CREATE TABLE public.user_pinned_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tag TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag)
);

-- Enable RLS
ALTER TABLE public.user_pinned_tags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view anyone's pinned tags"
ON public.user_pinned_tags
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own pinned tags"
ON public.user_pinned_tags
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pinned tags"
ON public.user_pinned_tags
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pinned tags"
ON public.user_pinned_tags
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_pinned_tags_user_id ON public.user_pinned_tags(user_id);
CREATE INDEX idx_user_pinned_tags_order ON public.user_pinned_tags(user_id, display_order);

-- ============================================
-- Migration 42/47: 20260109161512_6e57547a-d12f-4823-8035-f9b0820f4964.sql
-- ============================================

-- Add hashtags column to community_posts table
ALTER TABLE public.community_posts 
ADD COLUMN hashtags TEXT[] DEFAULT '{}'::text[];

-- ============================================
-- Migration 43/47: 20260109174520_0ef88da5-62d3-41bc-a396-42b40c42cbed.sql
-- ============================================

-- Create image_assets table for storing image metadata and CDN URLs
CREATE TABLE public.image_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  
  -- Metadata
  original_filename TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  format TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  
  -- CDN URLs for each variant
  url_blur TEXT NOT NULL,
  url_small TEXT NOT NULL,
  url_medium TEXT NOT NULL,
  url_large TEXT NOT NULL,
  
  -- Original is private, accessed via signed URL
  original_private BOOLEAN DEFAULT true,
  
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view public images"
  ON public.image_assets FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can view their own images"
  ON public.image_assets FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own images"
  ON public.image_assets FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own images"
  ON public.image_assets FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own images"
  ON public.image_assets FOR DELETE
  USING (auth.uid() = owner_id);

-- Indexes
CREATE INDEX idx_image_assets_owner ON public.image_assets(owner_id);
CREATE INDEX idx_image_assets_cloudinary_id ON public.image_assets(cloudinary_public_id);
CREATE INDEX idx_image_assets_visibility ON public.image_assets(visibility);

-- Add updated_at trigger
CREATE TRIGGER update_image_assets_updated_at
  BEFORE UPDATE ON public.image_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add image variant columns to community_posts
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS image_asset_id UUID REFERENCES public.image_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_blur_url TEXT,
  ADD COLUMN IF NOT EXISTS image_small_url TEXT,
  ADD COLUMN IF NOT EXISTS image_medium_url TEXT,
  ADD COLUMN IF NOT EXISTS image_large_url TEXT;

-- Add image variant columns to artworks
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS image_asset_id UUID REFERENCES public.image_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_blur_url TEXT,
  ADD COLUMN IF NOT EXISTS image_small_url TEXT,
  ADD COLUMN IF NOT EXISTS image_medium_url TEXT,
  ADD COLUMN IF NOT EXISTS image_large_url TEXT;

-- ============================================
-- Migration 44/47: 20260111004600_4c08127d-8ddc-467e-969f-2e3786d78f51.sql
-- ============================================

-- Fix race condition in purchase_artwork by adding row-level locking
CREATE OR REPLACE FUNCTION public.purchase_artwork(p_artwork_id uuid, p_buyer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_artwork RECORD;
  v_wallet RECORD;
  v_artist_profile RECORD;
  v_artist_wallet RECORD;
  v_order_id UUID;
BEGIN
  -- CRITICAL: Lock the artwork row to prevent concurrent purchases
  -- FOR UPDATE NOWAIT will immediately fail if another transaction has the lock
  SELECT * INTO v_artwork 
  FROM artworks 
  WHERE id = p_artwork_id 
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบผลงานนี้');
  END IF;
  
  -- Check if already sold (after acquiring lock)
  IF v_artwork.is_sold = true THEN
    RETURN json_build_object('success', false, 'error', 'ผลงานนี้ถูกขายไปแล้ว');
  END IF;
  
  -- Get artist profile (needed for wallet lookup)
  SELECT * INTO v_artist_profile FROM artist_profiles WHERE id = v_artwork.artist_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบข้อมูลศิลปิน');
  END IF;
  
  -- Lock buyer's wallet to prevent concurrent balance modifications
  SELECT * INTO v_wallet 
  FROM wallets 
  WHERE user_id = p_buyer_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบกระเป๋าเงิน');
  END IF;
  
  IF v_wallet.balance < v_artwork.price THEN
    RETURN json_build_object('success', false, 'error', 'ยอดเงินไม่เพียงพอ กรุณาเติมเงิน');
  END IF;
  
  -- Lock artist's wallet to prevent concurrent modifications
  SELECT * INTO v_artist_wallet
  FROM wallets 
  WHERE user_id = v_artist_profile.user_id 
  FOR UPDATE;
  
  -- Deduct from buyer wallet
  UPDATE wallets 
  SET balance = balance - v_artwork.price 
  WHERE id = v_wallet.id;
  
  -- Add to artist wallet
  UPDATE wallets 
  SET balance = balance + v_artwork.price 
  WHERE user_id = v_artist_profile.user_id;
  
  -- Create order
  INSERT INTO orders (buyer_id, artwork_id, artist_id, amount)
  VALUES (p_buyer_id, p_artwork_id, v_artwork.artist_id, v_artwork.price)
  RETURNING id INTO v_order_id;
  
  -- Create buyer transaction record
  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  VALUES (v_wallet.id, 'purchase', -v_artwork.price, 'ซื้อผลงาน: ' || v_artwork.title, v_order_id);
  
  -- Create artist income transaction record
  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  SELECT w.id, 'income', v_artwork.price, 'ขายผลงาน: ' || v_artwork.title, v_order_id
  FROM wallets w WHERE w.user_id = v_artist_profile.user_id;
  
  -- Mark artwork as sold
  UPDATE artworks SET is_sold = true WHERE id = p_artwork_id;
  
  -- Send notification to artist
  INSERT INTO notifications (user_id, title, message, type, reference_id)
  VALUES (
    v_artist_profile.user_id,
    'ยินดีด้วย! ผลงานของคุณถูกขายแล้ว 🎉',
    'ผลงาน "' || v_artwork.title || '" ถูกซื้อในราคา ฿' || v_artwork.price::text || ' เงินได้เข้ากระเป๋าเรียบร้อยแล้ว',
    'success',
    v_order_id
  );
  
  RETURN json_build_object(
    'success', true, 
    'order_id', v_order_id,
    'message', 'ซื้อผลงานสำเร็จ!'
  );

EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction is currently purchasing this artwork
    RETURN json_build_object('success', false, 'error', 'ผลงานนี้กำลังถูกซื้อโดยผู้อื่น กรุณาลองใหม่');
  WHEN OTHERS THEN
    -- Re-raise other unexpected exceptions
    RAISE;
END;
$function$;

-- ============================================
-- Migration 45/47: 20260111120000_fix_notifications_policy.sql
-- ============================================

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


-- ============================================
-- Migration 46/47: 20260111130000_add_comment_likes.sql
-- ============================================

-- Create community_comment_likes table for tracking comment likes
CREATE TABLE public.community_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS for community_comment_likes
CREATE POLICY "Anyone can view comment likes" 
ON public.community_comment_likes FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can like comments" 
ON public.community_comment_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own comment likes" 
ON public.community_comment_likes FOR DELETE 
USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX idx_comment_likes_comment_id ON public.community_comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.community_comment_likes(user_id);

-- Enable realtime for comment likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comment_likes;


-- ============================================
-- Migration 47/47: 20250120000000_add_post_id_to_artworks.sql
-- ============================================

-- Add post_id column to artworks table to link with community_posts
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artworks_post_id ON public.artworks(post_id);

-- Add comment for documentation
COMMENT ON COLUMN public.artworks.post_id IS 'Links artwork to community post when added to portfolio';


