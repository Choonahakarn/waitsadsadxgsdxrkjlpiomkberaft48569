# คู่มือการเปลี่ยน Supabase Project

## ขั้นตอนการเปลี่ยน Supabase Project

### 1. สร้าง Supabase Project ใหม่

1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
2. คลิก "New Project"
3. ตั้งชื่อ project และเลือก region
4. ตั้งรหัสผ่าน database
5. รอให้ project สร้างเสร็จ (ประมาณ 2-3 นาที)

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` ใน root directory ของโปรเจค:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

**วิธีหา URL และ Key:**
1. ไปที่ Supabase Dashboard → Project Settings → API
2. Copy `Project URL` → ใส่ใน `VITE_SUPABASE_URL`
3. Copy `anon public` key → ใส่ใน `VITE_SUPABASE_PUBLISHABLE_KEY`

### 3. รัน Migrations ทั้งหมด

#### วิธีที่ 1: ใช้ Supabase Dashboard (แนะนำ)

1. ไปที่ Supabase Dashboard → SQL Editor
2. เปิดไฟล์ migration แต่ละไฟล์ใน `supabase/migrations/` ตามลำดับ
3. Copy SQL code และรันใน SQL Editor

**ลำดับการรัน migrations:**
- รันตามชื่อไฟล์ (เรียงตามวันที่และเวลา)
- เริ่มจาก `20260106073508_*.sql` → `20260111130000_*.sql`

#### วิธีที่ 2: ใช้ Supabase CLI (ถ้ามี)

```bash
# ติดตั้ง Supabase CLI (ถ้ายังไม่มี)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-id

# Push migrations
supabase db push
```

### 4. ตั้งค่า Edge Functions (ถ้ามี)

ตรวจสอบว่าโปรเจคมี Edge Functions หรือไม่:

- `supabase/functions/confirm-buyer-email/`
- `supabase/functions/get-signed-url/`
- `supabase/functions/send-otp/`
- `supabase/functions/translate-text/`
- `supabase/functions/upload-image/`
- `supabase/functions/verify-otp/`

**Deploy Edge Functions:**

```bash
# ติดตั้ง Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-id

# Deploy functions
supabase functions deploy confirm-buyer-email
supabase functions deploy get-signed-url
supabase functions deploy send-otp
supabase functions deploy translate-text
supabase functions deploy upload-image
supabase functions deploy verify-otp
```

### 5. ตั้งค่า Storage Buckets (ถ้ามี)

ตรวจสอบว่าโปรเจคใช้ Storage หรือไม่:

1. ไปที่ Supabase Dashboard → Storage
2. สร้าง buckets ที่จำเป็น (เช่น `artworks`, `avatars`, `posts`)
3. ตั้งค่า RLS policies สำหรับแต่ละ bucket

### 6. ตั้งค่า Authentication

1. ไปที่ Supabase Dashboard → Authentication → Settings
2. ตั้งค่า Email provider (ถ้าต้องการ)
3. ตั้งค่า OAuth providers (ถ้าต้องการ)
4. ตั้งค่า Site URL: `http://localhost:8080` (สำหรับ development)

### 7. ตั้งค่า Realtime (ถ้ามี)

Realtime จะทำงานอัตโนมัติหลังจากรัน migrations ที่มี `ALTER PUBLICATION supabase_realtime`

### 8. ทดสอบการเชื่อมต่อ

1. Restart development server:
   ```bash
   npm run dev
   ```

2. เปิด browser → `http://localhost:8080`
3. ทดสอบ:
   - Login/Register
   - สร้างโพสต์
   - กดถูกใจ
   - แสดงความคิดเห็น

### 9. ตรวจสอบข้อมูล

หลังจากรัน migrations แล้ว ตรวจสอบว่า tables ถูกสร้างแล้ว:

```sql
-- ตรวจสอบ tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 10. Migration Files ที่ต้องรัน (46 ไฟล์)

รัน migrations ทั้งหมดใน `supabase/migrations/` ตามลำดับ:

1. `20260106073508_*.sql` - สร้าง profiles, user_roles, artist_profiles
2. `20260106073904_*.sql` - ...
3. ... (รันทั้งหมดตามลำดับ)
4. `20260111120000_fix_notifications_policy.sql` - แก้ไข notifications policy
5. `20260111130000_add_comment_likes.sql` - สร้าง comment likes table

## ⚠️ สิ่งที่ต้องระวัง

1. **ข้อมูลเดิมจะหายไป** - การเปลี่ยน project จะทำให้ข้อมูลเดิมหายไปทั้งหมด
2. **ต้องรัน migrations ทั้งหมด** - ถ้าไม่รัน migrations บางไฟล์ อาจทำให้ระบบไม่ทำงาน
3. **Edge Functions ต้อง deploy ใหม่** - Functions จะไม่ทำงานถ้าไม่ deploy
4. **Storage Buckets ต้องสร้างใหม่** - Buckets และ policies ต้องตั้งค่าใหม่
5. **Environment Variables** - ต้องอัพเดท `.env.local` ให้ถูกต้อง

## 📝 Checklist

- [ ] สร้าง Supabase project ใหม่
- [ ] ตั้งค่า `.env.local` ด้วย URL และ Key ใหม่
- [ ] รัน migrations ทั้งหมด (46 ไฟล์)
- [ ] Deploy Edge Functions (6 functions)
- [ ] ตั้งค่า Storage Buckets (ถ้ามี)
- [ ] ตั้งค่า Authentication
- [ ] ทดสอบการทำงานของระบบ
- [ ] ตรวจสอบว่า tables ถูกสร้างแล้ว

## 🔧 Troubleshooting

### Error: "Could not find the table"
- ตรวจสอบว่า migration สำหรับ table นั้นถูกรันแล้วหรือยัง
- ตรวจสอบว่า migration รันสำเร็จหรือไม่ (ดูใน SQL Editor → History)

### Error: "Invalid API key"
- ตรวจสอบว่า `VITE_SUPABASE_PUBLISHABLE_KEY` ถูกต้อง
- ตรวจสอบว่าใช้ `anon` key ไม่ใช่ `service_role` key

### Error: "Function not found"
- ตรวจสอบว่า Edge Functions ถูก deploy แล้วหรือยัง
- ตรวจสอบว่า function name ถูกต้อง

### Error: "RLS policy violation"
- ตรวจสอบว่า RLS policies ถูกสร้างแล้ว
- ตรวจสอบว่า user มีสิทธิ์เข้าถึงข้อมูล

## 📞 ต้องการความช่วยเหลือ?

ถ้ามีปัญหาติดต่อ:
- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
