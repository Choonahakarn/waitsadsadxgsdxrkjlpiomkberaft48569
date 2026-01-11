# ✅ Migrations รันสำเร็จแล้ว! ขั้นตอนต่อไป

## 📦 Step 1: ตั้งค่า Storage Buckets

**ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/storage/buckets

**คลิก "New bucket" และสร้าง 5 buckets:**

### 1. artworks (Public)
- **Name**: `artworks`
- **Public bucket**: ✅ Yes
- **File size limit**: 10 MB (หรือตามต้องการ)
- **Allowed MIME types**: `image/*`

### 2. avatars (Public)
- **Name**: `avatars`
- **Public bucket**: ✅ Yes
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/*`

### 3. posts (Public)
- **Name**: `posts`
- **Public bucket**: ✅ Yes
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/*`

### 4. verification-docs (Private)
- **Name**: `verification-docs`
- **Public bucket**: ❌ No (Private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/*, application/pdf`

### 5. payment-slips (Private)
- **Name**: `payment-slips`
- **Public bucket**: ❌ No (Private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/*, application/pdf`

**หมายเหตุ:** RLS policies จะถูกสร้างโดย migrations อัตโนมัติ

---

## ⚙️ Step 2: Deploy Edge Functions

### วิธีที่ 1: ใช้ Supabase Dashboard (ง่าย)

1. **ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions

2. **สำหรับแต่ละ function:**
   - คลิก "Create a new function"
   - ตั้งชื่อ function (เช่น `confirm-buyer-email`)
   - Copy code จาก `supabase/functions/[function-name]/index.ts`
   - Paste และ Deploy

### วิธีที่ 2: ใช้ Supabase CLI (เร็ว)

```bash
# 1. สร้าง Access Token ก่อน (ไม่ใช่ Service Role Key)
#    ไปที่: Account Settings → Access Tokens → Generate new token

# 2. Login
npx supabase login

# 3. Link project
npx supabase link --project-ref bwimmqwtmrprnrhdszts

# 4. Deploy functions
npx supabase functions deploy confirm-buyer-email
npx supabase functions deploy get-signed-url
npx supabase functions deploy send-otp
npx supabase functions deploy translate-text
npx supabase functions deploy upload-image
npx supabase functions deploy verify-otp
```

**Functions ที่ต้อง Deploy:**
1. `confirm-buyer-email` - ยืนยันอีเมลผู้ซื้อ
2. `get-signed-url` - สร้าง signed URL สำหรับ upload
3. `send-otp` - ส่ง OTP
4. `translate-text` - แปลข้อความ
5. `upload-image` - อัปโหลดรูปภาพ
6. `verify-otp` - ตรวจสอบ OTP

---

## 🔄 Step 3: Restart Dev Server

```bash
# หยุด server เดิม (ถ้ายังรันอยู่)
# กด Ctrl+C ใน terminal

# รันใหม่
npm run dev
```

---

## ✅ Step 4: ทดสอบการทำงาน

1. **เปิดเว็บ:** http://localhost:5173 (หรือ port ที่แสดง)

2. **ทดสอบ:**
   - ✅ Sign up / Sign in
   - ✅ สร้าง Post และติ๊ก "Add to Portfolio"
   - ✅ ตรวจสอบว่า Portfolio แสดงรูปภาพ
   - ✅ ทดสอบ Marketplace (ไม่ควรแสดง Portfolio items)

---

## 📝 Checklist

- [ ] ตั้งค่า Storage Buckets (5 buckets)
- [ ] Deploy Edge Functions (6 functions)
- [ ] Restart dev server
- [ ] ทดสอบ Sign up/Sign in
- [ ] ทดสอบสร้าง Post
- [ ] ทดสอบ Portfolio

---

## 🆘 ถ้ามีปัญหา

- **Storage error**: ตรวจสอบว่า buckets ถูกสร้างแล้ว
- **Function error**: ตรวจสอบว่า functions ถูก deploy แล้ว
- **Connection error**: ตรวจสอบ `.env.local` และ restart dev server
