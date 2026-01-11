# 🔐 วิธี Reset Password สำหรับ choonnahakan@gmail.com

## ⚠️ ไม่สามารถดูรหัสผ่านได้

รหัสผ่านถูกเข้ารหัส (hashed) ในฐานข้อมูล ไม่สามารถดูรหัสผ่านเดิมได้

## ✅ วิธี Reset Password

### วิธีที่ 1: ใช้ Supabase Dashboard (Admin)

1. **ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/auth/users

2. **ค้นหา user:**
   - ค้นหา `choonnahakan@gmail.com`
   - หรือใช้ filter: `email = choonnahakan@gmail.com`

3. **Reset Password:**
   - คลิกที่ user
   - คลิก **"Send password reset email"** หรือ **"Reset password"**
   - User จะได้รับ email สำหรับ reset password

### วิธีที่ 2: ใช้ "Forgot Password" ในหน้าเว็บ

1. ไปที่หน้า Login
2. คลิก **"Forgot Password"** หรือ **"ลืมรหัสผ่าน"**
3. ใส่ email: `choonnahakan@gmail.com`
4. ตรวจสอบ email และทำตามขั้นตอน

### วิธีที่ 3: ตั้งรหัสผ่านใหม่โดยตรง (Admin)

1. **ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/auth/users

2. **ค้นหา user:**
   - ค้นหา `choonnahakan@gmail.com`

3. **Update Password:**
   - คลิกที่ user
   - คลิก **"Update"** หรือ **"Edit"**
   - ตั้งรหัสผ่านใหม่
   - บันทึก

---

## 🔍 ตรวจสอบข้อมูล User

รัน SQL นี้ใน Supabase SQL Editor:

```sql
-- Check user info
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'choonnahakan@gmail.com';

-- Check profile
SELECT 
  id,
  email,
  full_name,
  display_id,
  display_name
FROM public.profiles
WHERE email = 'choonnahakan@gmail.com';

-- Check roles
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'choonnahakan@gmail.com';
```

---

## 📝 หมายเหตุ

- **ไม่สามารถดูรหัสผ่านเดิมได้** - ถูกเข้ารหัสแล้ว
- **ต้อง reset ผ่าน Dashboard หรือ Forgot Password**
- **ถ้าเป็น Admin** สามารถตั้งรหัสผ่านใหม่ได้โดยตรง
