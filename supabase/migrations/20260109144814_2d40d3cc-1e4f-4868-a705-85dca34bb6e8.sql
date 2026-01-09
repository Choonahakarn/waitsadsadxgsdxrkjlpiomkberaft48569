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