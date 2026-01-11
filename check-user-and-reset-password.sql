-- Check user and reset password for choonnahakan@gmail.com
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql

-- Step 1: Check if user exists
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'choonnahakan@gmail.com';

-- Step 2: Check profile
SELECT 
  id,
  email,
  full_name,
  display_id,
  display_name,
  created_at
FROM public.profiles
WHERE email = 'choonnahakan@gmail.com';

-- Step 3: Check roles
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'choonnahakan@gmail.com';

-- ============================================
-- RESET PASSWORD (ต้องทำผ่าน Supabase Dashboard)
-- ============================================
-- ไม่สามารถ reset password ผ่าน SQL ได้
-- ต้องทำผ่าน:
-- 1. Supabase Dashboard → Authentication → Users → Find user → Reset Password
-- 2. หรือใช้ Supabase Auth API
-- 3. หรือใช้ "Forgot Password" ในหน้าเว็บ
