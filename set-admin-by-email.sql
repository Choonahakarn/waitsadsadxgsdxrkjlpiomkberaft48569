-- Set user with email choonnahakan@gmail.com as admin
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql

-- Step 1: Find and verify the user
SELECT 
  id,
  email,
  full_name,
  display_id,
  display_name
FROM public.profiles
WHERE email = 'choonnahakan@gmail.com';

-- Step 2: Set as admin (run this after verifying the user above)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE email = 'choonnahakan@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Verify the admin role was added
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.display_id,
  ur.role,
  ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email = 'choonnahakan@gmail.com';
