-- ตรวจสอบข้อมูล Portfolio สำหรับ Comment Dialog
-- Run this in Supabase SQL Editor

-- 1. ตรวจสอบว่า user มี artist_profile หรือไม่
SELECT 
  u.id as user_id,
  u.email,
  ap.id as artist_profile_id,
  ap.artist_name
FROM auth.users u
LEFT JOIN public.artist_profiles ap ON ap.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 2. ตรวจสอบว่า artist มี artworks หรือไม่
SELECT 
  ap.id as artist_profile_id,
  ap.artist_name,
  COUNT(a.id) as artworks_count
FROM public.artist_profiles ap
LEFT JOIN public.artworks a ON a.artist_id = ap.id
GROUP BY ap.id, ap.artist_name
ORDER BY artworks_count DESC;

-- 3. ตรวจสอบ artworks ของ artist ใดๆ (เปลี่ยน artist_id ตามต้องการ)
-- แทนที่ 'YOUR_ARTIST_PROFILE_ID' ด้วย artist_profile.id จริง
SELECT 
  id,
  title,
  image_url,
  artist_id,
  created_at
FROM public.artworks
WHERE artist_id = 'YOUR_ARTIST_PROFILE_ID'
ORDER BY created_at DESC
LIMIT 6;

-- 4. ตรวจสอบ RLS policies สำหรับ artworks table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'artworks';

-- 5. ตรวจสอบว่า artworks table มีข้อมูลหรือไม่
SELECT COUNT(*) as total_artworks FROM public.artworks;

-- 6. ตรวจสอบ artist_profiles และ artworks ร่วมกัน
SELECT 
  ap.id as artist_profile_id,
  ap.user_id,
  ap.artist_name,
  a.id as artwork_id,
  a.title,
  a.image_url
FROM public.artist_profiles ap
LEFT JOIN public.artworks a ON a.artist_id = ap.id
ORDER BY ap.created_at DESC, a.created_at DESC
LIMIT 20;
