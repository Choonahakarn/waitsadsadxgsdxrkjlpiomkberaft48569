-- Make SoulHuman user an admin
-- Run this in Supabase SQL Editor

-- First, find the user_id for SoulHuman
-- Check profiles table for username or email containing "SoulHuman"
SELECT id, email, full_name 
FROM public.profiles 
WHERE email ILIKE '%soulhuman%' 
   OR full_name ILIKE '%soulhuman%'
   OR id::text ILIKE '%soulhuman%';

-- If you found the user_id, replace 'USER_ID_HERE' with the actual UUID
-- Then run the INSERT statement below:

-- Insert admin role for the user
-- Replace 'USER_ID_HERE' with the actual user_id UUID
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was added
SELECT 
  p.id,
  p.email,
  p.full_name,
  ur.role,
  ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email ILIKE '%soulhuman%' 
   OR p.full_name ILIKE '%soulhuman%'
   OR p.id::text ILIKE '%soulhuman%';
