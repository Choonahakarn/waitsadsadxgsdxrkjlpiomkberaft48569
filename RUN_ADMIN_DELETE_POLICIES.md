# รัน Admin Delete Policies

## ขั้นตอนการรัน SQL Script

1. ไปที่ Supabase Dashboard:
   - URL: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql

2. Copy เนื้อหาจากไฟล์ `ADD_ADMIN_DELETE_POLICIES.sql` และ paste ใน SQL Editor

3. รัน SQL script

4. ตรวจสอบว่า policies ถูกสร้างแล้ว:
   ```sql
   SELECT 
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd,
     qual
   FROM pg_policies
   WHERE tablename IN ('community_posts', 'community_comments')
     AND cmd = 'DELETE'
   ORDER BY tablename, policyname;
   ```

## ตรวจสอบว่าแอดมินมี role หรือไม่

```sql
-- ตรวจสอบว่า user มี admin role หรือไม่
SELECT 
  p.id,
  p.email,
  p.full_name,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'admin';
```

## ถ้ายังไม่มี admin role

```sql
-- ตั้ง user เป็น admin (แทนที่ EMAIL_HERE ด้วย email ของคุณ)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE email = 'EMAIL_HERE'
ON CONFLICT (user_id, role) DO NOTHING;
```
