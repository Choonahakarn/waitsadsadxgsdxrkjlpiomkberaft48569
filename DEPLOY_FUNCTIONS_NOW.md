# ⚡ Deploy Edge Functions - ขั้นตอนด่วน

## ต้องมี Access Token ก่อน!

### Step 1: สร้าง Access Token

1. **ไปที่:** https://supabase.com/dashboard/account/tokens
2. คลิก **"Generate new token"**
3. ตั้งชื่อ: `CLI Access Token`
4. **Copy token ที่ได้** (จะแสดงแค่ครั้งเดียว!)

### Step 2: Login

```bash
npx supabase login
```

เมื่อถาม Access Token → วาง token ที่ copy มา

### Step 3: Link Project

```bash
npx supabase link --project-ref bwimmqwtmrprnrhdszts
```

### Step 4: Deploy Functions

```bash
npx supabase functions deploy confirm-buyer-email
npx supabase functions deploy get-signed-url
npx supabase functions deploy send-otp
npx supabase functions deploy translate-text
npx supabase functions deploy upload-image
npx supabase functions deploy verify-otp
```

---

## หรือใช้ Dashboard (ไม่ต้อง Access Token)

1. **ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions

2. **สำหรับแต่ละ function:**
   - คลิก **"Create a new function"**
   - ตั้งชื่อ: `confirm-buyer-email` (หรือชื่ออื่น)
   - Copy code จาก `supabase/functions/confirm-buyer-email/index.ts`
   - Paste และ Deploy

**ทำซ้ำสำหรับ 6 functions:**
- confirm-buyer-email
- get-signed-url
- send-otp
- translate-text
- upload-image
- verify-otp
