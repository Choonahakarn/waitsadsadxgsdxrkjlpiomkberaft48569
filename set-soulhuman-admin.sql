-- Set SoulHuman user as admin
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql

-- Step 1: Find the user (search by email, full_name, or display_id)
SELECT 
  id,
  email,
  full_name,
  display_id,
  display_name
FROM public.profiles
WHERE email ILIKE '%soulhuman%'
   OR full_name ILIKE '%soulhuman%'
   OR display_id ILIKE '%soulhuman%'
   OR display_name ILIKE '%soulhuman%';

-- Step 2: After finding the user_id above, replace 'USER_ID_HERE' with the actual UUID
-- Then run this INSERT statement:

INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Verify the role was added
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.display_id,
  ur.role,
  ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email ILIKE '%soulhuman%'
   OR p.full_name ILIKE '%soulhuman%'
   OR p.display_id ILIKE '%soulhuman%'
   OR p.display_name ILIKE '%soulhuman%';

-- Alternative: If you know the exact email or display_id, use this:
-- Replace 'soulhuman@example.com' with the actual email
/*
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE email = 'soulhuman@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
*/
