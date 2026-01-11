# Deploy Edge Functions

## วิธีที่ 1: ใช้ Supabase CLI (แนะนำ)

```bash
# Login
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

## วิธีที่ 2: ใช้ Supabase Dashboard

1. ไปที่: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions

2. สำหรับแต่ละ function:
   - คลิก "Create a new function"
   - ตั้งชื่อ function
   - Copy code จาก `supabase/functions/[function-name]/index.ts`
   - Paste และ Deploy

## Functions ที่ต้อง Deploy:

1. **confirm-buyer-email** - ยืนยันอีเมลผู้ซื้อ
2. **get-signed-url** - สร้าง signed URL สำหรับ upload
3. **send-otp** - ส่ง OTP
4. **translate-text** - แปลข้อความ
5. **upload-image** - อัปโหลดรูปภาพ
6. **verify-otp** - ตรวจสอบ OTP

## หมายเหตุ

- Functions จะใช้ environment variables จาก Supabase Dashboard
- ตรวจสอบว่า functions มีสิทธิ์เข้าถึง database และ storage
