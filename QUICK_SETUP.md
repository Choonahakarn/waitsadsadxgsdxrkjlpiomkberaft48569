# 🚀 Quick Setup Guide - Supabase Project ใหม่

## ✅ สิ่งที่ทำเสร็จแล้ว

1. ✅ อัปเดต `supabase/config.toml` → Project ID: `bwimmqwtmrprnrhdszts`
2. ✅ สร้างไฟล์ `.env.local` (ถ้ายังไม่มี)
3. ✅ สร้างไฟล์ `ALL_MIGRATIONS.sql` (รวม migrations ทั้ง 47 ไฟล์)

## 📋 ขั้นตอนการตั้งค่า (ทำตามลำดับ)

### Step 1: ตรวจสอบไฟล์ .env.local

ตรวจสอบว่ามีไฟล์ `.env.local` ใน root directory และมีเนื้อหา:

```env
VITE_SUPABASE_URL=https://bwimmqwtmrprnrhdszts.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_IxLJbB46XkQ6CbhWoYurzQ_HYUAtr6o
```

### Step 2: รัน Migrations ทั้งหมด

**วิธีที่ 1: รันไฟล์เดียว (แนะนำ - เร็วที่สุด)**

1. ไปที่: **https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql**
2. เปิดไฟล์ `ALL_MIGRATIONS.sql` ในโปรเจกต์
3. **Copy เนื้อหาทั้งหมด** (Ctrl+A, Ctrl+C)
4. วางใน SQL Editor (Ctrl+V)
5. คลิก **Run** หรือกด `Ctrl+Enter`
6. รอให้รันเสร็จ (อาจใช้เวลา 1-2 นาที)

**วิธีที่ 2: รันทีละไฟล์ (ถ้าไฟล์เดียว error)**

รัน migrations ตามลำดับใน `RUN_ALL_MIGRATIONS.md`

### Step 3: ตั้งค่า Storage Buckets

**ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/storage/buckets

**สร้าง buckets ต่อไปนี้:**

1. **artworks** 
   - Public: ✅ Yes
   - File size limit: 10 MB

2. **avatars**
   - Public: ✅ Yes  
   - File size limit: 5 MB

3. **posts**
   - Public: ✅ Yes
   - File size limit: 10 MB

4. **verification-docs**
   - Public: ❌ No (Private)
   - File size limit: 10 MB

5. **payment-slips**
   - Public: ❌ No (Private)
   - File size limit: 10 MB

### Step 4: Deploy Edge Functions

**ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions

**หรือใช้ CLI:**
```bash
# ต้อง login ก่อน (ใช้ Access Token จาก Account Settings)
npx supabase login

# Link project
npx supabase link --project-ref bwimmqwtmrprnrhdszts

# Deploy functions
npx supabase functions deploy confirm-buyer-email
npx supabase functions deploy get-signed-url
npx supabase functions deploy send-otp
npx supabase functions deploy translate-text
npx supabase functions deploy upload-image
npx supabase functions deploy verify-otp
```

### Step 5: Restart Dev Server

```bash
# หยุด server เดิม (Ctrl+C)
# แล้วรันใหม่
npm run dev
```

## ✅ ตรวจสอบการตั้งค่า

หลังจากตั้งค่าเสร็จ:

1. ✅ เปิดเว็บ → ตรวจสอบว่าเชื่อมต่อ Supabase ได้
2. ✅ ทดสอบ Sign up/Sign in
3. ✅ ทดสอบสร้าง Post และติ๊ก "Add to Portfolio"
4. ✅ ตรวจสอบว่า Portfolio แสดงรูปภาพ

## 📝 หมายเหตุ

- ไฟล์ `ALL_MIGRATIONS.sql` รวม migrations ทั้ง 47 ไฟล์เรียงตามลำดับ
- Migration `20250120000000_add_post_id_to_artworks.sql` อยู่ท้ายสุด (เพิ่ม column ใน table ที่มีอยู่แล้ว)
- ถ้า migration error ให้รันทีละไฟล์แทน

## 🆘 ถ้ามีปัญหา

1. **Migration error**: รันทีละไฟล์ตามลำดับใน `RUN_ALL_MIGRATIONS.md`
2. **Connection error**: ตรวจสอบ `.env.local` และ restart dev server
3. **Storage error**: ตรวจสอบว่า buckets ถูกสร้างแล้ว
