# คู่มือตั้งค่า Supabase Project ใหม่

## ข้อมูลที่ต้องการจาก Supabase Dashboard

### 1. Project Reference (Project ID)
- ไปที่: Supabase Dashboard → Project Settings → General
- Copy **Reference ID** หรือดูจาก URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### 2. Project URL
- ไปที่: Supabase Dashboard → Project Settings → API
- Copy **Project URL** (รูปแบบ: `https://xxxxx.supabase.co`)

### 3. API Keys
- ไปที่: Supabase Dashboard → Project Settings → API
- Copy **anon public** key (สำหรับ client-side)
- Copy **service_role** key (สำหรับ server-side/admin - เก็บเป็นความลับ!)

### 4. Database Password
- ไปที่: Supabase Dashboard → Project Settings → Database
- ตั้งรหัสผ่าน database (ถ้ายังไม่มี)

---

## ขั้นตอนการตั้งค่า

### Step 1: สร้างไฟล์ .env.local

สร้างไฟล์ `.env.local` ใน root directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

### Step 2: อัปเดต supabase/config.toml

```toml
project_id = "your-project-reference-id"
```

### Step 3: รัน Migrations

รัน migrations ทั้งหมด 47 ไฟล์ตามลำดับ:
- เริ่มจาก `20260106073508_*.sql`
- จนถึง `20250120000000_add_post_id_to_artworks.sql`

### Step 4: ตั้งค่า Storage Buckets

สร้าง buckets:
- `artworks`
- `avatars`
- `posts`
- `verification-docs`
- `payment-slips`

### Step 5: Deploy Edge Functions

Deploy functions:
- `confirm-buyer-email`
- `get-signed-url`
- `send-otp`
- `translate-text`
- `upload-image`
- `verify-otp`

---

## ส่งข้อมูลมาให้

กรุณาส่งข้อมูลต่อไปนี้:

1. **Project Reference ID**: `_____________`
2. **Project URL**: `https://________.supabase.co`
3. **Anon Key**: `_____________`
4. **Service Role Key**: `_____________` (เก็บเป็นความลับ!)
