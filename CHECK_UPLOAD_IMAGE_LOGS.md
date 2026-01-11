# 🔍 ตรวจสอบ Logs ของ upload-image Function

## จาก Dashboard เห็นว่า:
- ✅ Function ทำงานแล้ว (4 invocations)
- ⚠️ มี errors (5xx responses)
- 📊 มี 13 worker logs (info และ error)

## วิธีตรวจสอบ Error:

### Step 1: ดู Logs
1. ในหน้า Overview ของ `upload-image` function
2. คลิกแท็บ **"Logs"** (ด้านบน)
3. ดู logs ที่มี status "error" หรือ "5xx"

### Step 2: ตรวจสอบ Error Messages
ดู error messages ใน logs เพื่อหาสาเหตุ:
- Cloudinary configuration missing?
- Invalid API credentials?
- File validation error?
- Network error?

### Step 3: ตรวจสอบ Secrets
1. ไปที่: **Secrets** (sidebar)
2. ตรวจสอบว่ามี secrets ทั้ง 3 ตัว:
   - ✅ `CLOUDINARY_CLOUD_NAME` = `dhwph9hve`
   - ✅ `CLOUDINARY_API_KEY` = `777291323799533`
   - ✅ `CLOUDINARY_API_SECRET` = `4IQ53N90qL_DJVNRrha7QgoCPqk`

### Step 4: Redeploy (ถ้ายังไม่ได้)
หลังจากตั้งค่า secrets แล้ว ต้อง redeploy:
1. คลิกแท็บ **"Code"**
2. คลิก **"Redeploy"** หรือ **"Deploy"**

---

## 🔍 วิธีดู Logs:
1. ไปที่: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions/upload-image
2. คลิกแท็บ **"Logs"**
3. ดู logs ที่มีสีแดง (error) หรือ status 5xx

---

## 💡 Common Errors:

1. **"Cloudinary configuration missing"**
   - แก้ไข: ตรวจสอบว่า secrets ถูกตั้งค่าแล้ว

2. **"Cloudinary API secret looks invalid"**
   - แก้ไข: ตรวจสอบว่า API Secret มีความยาวอย่างน้อย 20 ตัวอักษร

3. **"Cloudinary upload failed"**
   - แก้ไข: ตรวจสอบว่า Cloudinary credentials ถูกต้อง

4. **"File too large"**
   - แก้ไข: ลดขนาดไฟล์ (max 25MB)

5. **"Invalid file type"**
   - แก้ไข: ใช้ไฟล์ JPG หรือ PNG เท่านั้น
