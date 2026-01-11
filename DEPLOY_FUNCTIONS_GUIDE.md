# 🚀 คู่มือ Deploy Edge Functions

## วิธีที่ 1: ใช้ Supabase CLI (แนะนำ - เร็วที่สุด)

### ขั้นตอนที่ 1: สร้าง Access Token

1. ไปที่: **https://supabase.com/dashboard/account/tokens**
2. คลิก **Generate new token**
3. ตั้งชื่อ token (เช่น "CLI Access Token")
4. Copy token ที่ได้ (จะแสดงแค่ครั้งเดียว!)

### ขั้นตอนที่ 2: Login และ Link Project

```bash
# Login (จะถาม Access Token)
npx supabase login

# Link project
npx supabase link --project-ref bwimmqwtmrprnrhdszts
```

### ขั้นตอนที่ 3: Deploy Functions

```bash
# Deploy ทีละตัว
npx supabase functions deploy confirm-buyer-email
npx supabase functions deploy get-signed-url
npx supabase functions deploy send-otp
npx supabase functions deploy translate-text
npx supabase functions deploy upload-image
npx supabase functions deploy verify-otp
```

**หรือใช้ PowerShell script:**
```powershell
.\deploy-functions.ps1
```

---

## วิธีที่ 2: ใช้ Supabase Dashboard (ถ้า CLI ไม่ได้)

1. **ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions

2. **สำหรับแต่ละ function:**
   - คลิก **"Create a new function"**
   - ตั้งชื่อ function (เช่น `confirm-buyer-email`)
   - Copy code จาก `supabase/functions/confirm-buyer-email/index.ts`
   - Paste ใน editor
   - คลิก **Deploy**

**Functions ที่ต้อง Deploy:**
1. `confirm-buyer-email`
2. `get-signed-url`
3. `send-otp`
4. `translate-text`
5. `upload-image`
6. `verify-otp`

---

## ✅ ตรวจสอบว่า Deploy สำเร็จ

1. ไปที่: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions
2. ตรวจสอบว่ามี functions ทั้ง 6 ตัวแสดงอยู่

---

## 🆘 ถ้ามีปัญหา

- **Login error**: ตรวจสอบว่า Access Token ถูกต้อง
- **Link error**: Project อาจจะถูก link อยู่แล้ว ลอง deploy functions เลย
- **Deploy error**: ตรวจสอบว่า function code ไม่มี syntax error
