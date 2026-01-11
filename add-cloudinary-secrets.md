# 🔧 ตั้งค่า Cloudinary Secrets ใน Supabase

## Credentials ที่มี:
- **Cloud Name:** `dhwph9hve`
- **API Key:** `777291323799533`
- **API Secret:** `4IQ53N90qL_DJVNRrha7QgoCPqk`

## ขั้นตอน:

### Step 1: ไปที่ Secrets
1. ไปที่: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions
2. คลิก **"Secrets"** ใน sidebar ด้านซ้าย

### Step 2: เพิ่ม Secrets 3 ตัว

**Secret 1:**
- **Name:** `CLOUDINARY_CLOUD_NAME`
- **Value:** `dhwph9hve`

**Secret 2:**
- **Name:** `CLOUDINARY_API_KEY`
- **Value:** `777291323799533`

**Secret 3:**
- **Name:** `CLOUDINARY_API_SECRET`
- **Value:** `4IQ53N90qL_DJVNRrha7QgoCPqk`

### Step 3: Redeploy Function

หลังจากตั้งค่า secrets แล้ว:
1. กลับมาหน้า Functions
2. คลิกที่ function **`upload-image`**
3. คลิก **"Redeploy"** หรือ **"Deploy"**

หรือใช้ CLI:
```bash
npx supabase functions deploy upload-image
```

### Step 4: ทดสอบ
ลองอัปโหลดรูปภาพใหม่!
