# 🔧 ตั้งค่า Cloudinary สำหรับอัปโหลดรูปภาพ

## ❌ ปัญหา
Error: "Cloudinary configuration missing"

## ✅ วิธีแก้ไข

### Step 1: สร้าง Cloudinary Account (ถ้ายังไม่มี)

1. ไปที่: https://cloudinary.com/
2. สมัครสมาชิก (Free tier มีให้ใช้)
3. หลังจาก login จะเห็น **Dashboard**

### Step 2: เก็บ Cloudinary Credentials

ใน Cloudinary Dashboard จะเห็น:
- **Cloud Name** (เช่น `dxxxxx`)
- **API Key** (เช่น `123456789012345`)
- **API Secret** (เช่น `abcdefghijklmnopqrstuvwxyz123456`)

### Step 3: ตั้งค่าใน Supabase Edge Functions

1. **ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/settings/functions

2. **หรือไปที่:** Project Settings → Edge Functions → Secrets

3. **เพิ่ม Secrets ต่อไปนี้:**

   **Secret 1:**
   - **Name:** `CLOUDINARY_CLOUD_NAME`
   - **Value:** Cloud Name จาก Cloudinary Dashboard
   - **Example:** `dxxxxx`

   **Secret 2:**
   - **Name:** `CLOUDINARY_API_KEY`
   - **Value:** API Key จาก Cloudinary Dashboard
   - **Example:** `123456789012345`

   **Secret 3:**
   - **Name:** `CLOUDINARY_API_SECRET`
   - **Value:** API Secret จาก Cloudinary Dashboard
   - **Example:** `abcdefghijklmnopqrstuvwxyz123456`

4. **คลิก "Save"** สำหรับแต่ละ secret

### Step 4: Redeploy Edge Functions (สำคัญ!)

หลังจากตั้งค่า secrets แล้ว ต้อง redeploy function `upload-image`:

```bash
npx supabase functions deploy upload-image
```

**หรือใช้ Dashboard:**
1. ไปที่: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions
2. คลิกที่ function `upload-image`
3. คลิก **"Redeploy"** หรือ **"Deploy"**

### Step 5: ทดสอบ

1. Restart dev server (ถ้ายังรันอยู่)
2. ลองอัปโหลดรูปภาพใหม่
3. ควรจะอัปโหลดได้แล้ว!

---

## 📝 หมายเหตุ

- **Cloudinary Free Tier** มีให้ใช้ฟรี (25 credits/month)
- **API Secret** ต้องมีความยาวอย่างน้อย 20 ตัวอักษร
- หลังจากตั้งค่า secrets แล้ว **ต้อง redeploy functions** ถึงจะใช้งานได้

---

## 🔍 ตรวจสอบว่า Secrets ถูกตั้งค่าแล้ว

1. ไปที่: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/settings/functions
2. ตรวจสอบว่ามี secrets ทั้ง 3 ตัว:
   - ✅ `CLOUDINARY_CLOUD_NAME`
   - ✅ `CLOUDINARY_API_KEY`
   - ✅ `CLOUDINARY_API_SECRET`

---

## 🆘 ถ้ายังไม่ได้

1. ตรวจสอบว่า secrets ถูกตั้งค่าแล้ว
2. ตรวจสอบว่า redeploy function `upload-image` แล้ว
3. ตรวจสอบว่า API Secret มีความยาวอย่างน้อย 20 ตัวอักษร
4. ดู logs ใน Supabase Dashboard → Edge Functions → upload-image → Logs
