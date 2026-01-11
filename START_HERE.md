# 🚀 เริ่มต้นที่นี่ - ตั้งค่า Supabase Project ใหม่

## ✅ สิ่งที่ทำเสร็จแล้ว

1. ✅ อัปเดต `supabase/config.toml` → Project ID: `bwimmqwtmrprnrhdszts`
2. ✅ สร้างไฟล์ `.env.local` พร้อม API keys
3. ✅ สร้างไฟล์ `ALL_MIGRATIONS.sql` (รวม migrations ทั้ง 47 ไฟล์)

## 📋 ขั้นตอนการตั้งค่า (ทำตามลำดับ)

### ⚡ Step 1: รัน Migrations (สำคัญที่สุด!)

**ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql

**วิธีรัน:**

1. เปิดไฟล์ `ALL_MIGRATIONS.sql` ในโปรเจกต์
2. **Copy เนื้อหาทั้งหมด** (Ctrl+A, Ctrl+C)
3. วางใน SQL Editor (Ctrl+V)
4. คลิก **Run** หรือกด `Ctrl+Enter`
5. รอให้รันเสร็จ (อาจใช้เวลา 1-2 นาที)

**⚠️ ถ้ามี Error:**
- รัน migrations ทีละไฟล์ตามลำดับใน `RUN_ALL_MIGRATIONS.md`
- เริ่มจาก `20260106073508_*.sql` → `20250120000000_*.sql` (สุดท้าย)

### 📦 Step 2: ตั้งค่า Storage Buckets

**ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/storage/buckets

**คลิก "New bucket" และสร้าง:**

1. **artworks** - Public ✅
2. **avatars** - Public ✅
3. **posts** - Public ✅
4. **verification-docs** - Private ❌
5. **payment-slips** - Private ❌

### ⚙️ Step 3: Deploy Edge Functions

**ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions

**หรือใช้ CLI:**
```bash
# ต้องสร้าง Access Token ก่อน (ไม่ใช่ Service Role Key)
# ไปที่: Account Settings → Access Tokens → Generate new token

npx supabase login
npx supabase link --project-ref bwimmqwtmrprnrhdszts
npx supabase functions deploy confirm-buyer-email
npx supabase functions deploy get-signed-url
npx supabase functions deploy send-otp
npx supabase functions deploy translate-text
npx supabase functions deploy upload-image
npx supabase functions deploy verify-otp
```

### 🔄 Step 4: Restart Dev Server

```bash
# หยุด server เดิม (Ctrl+C ใน terminal)
npm run dev
```

## ✅ ตรวจสอบ

1. ✅ เปิดเว็บ → ตรวจสอบว่าเชื่อมต่อ Supabase ได้
2. ✅ ทดสอบ Sign up/Sign in
3. ✅ ทดสอบสร้าง Post และติ๊ก "Add to Portfolio"
4. ✅ ตรวจสอบว่า Portfolio แสดงรูปภาพ

## 📁 ไฟล์ที่สำคัญ

- `ALL_MIGRATIONS.sql` - รวม migrations ทั้งหมด (รันไฟล์นี้!)
- `QUICK_SETUP.md` - คู่มือตั้งค่าครบถ้วน
- `RUN_ALL_MIGRATIONS.md` - รายการ migrations แบบละเอียด
- `SETUP_STORAGE_BUCKETS.md` - วิธีตั้งค่า Storage
- `DEPLOY_EDGE_FUNCTIONS.md` - วิธี Deploy Functions

## 🆘 ถ้ามีปัญหา

- **Migration error**: ดู `RUN_ALL_MIGRATIONS.md` และรันทีละไฟล์
- **Connection error**: ตรวจสอบ `.env.local` และ restart dev server
- **Storage error**: ตรวจสอบว่า buckets ถูกสร้างแล้ว
