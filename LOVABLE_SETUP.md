# คู่มือการตั้งค่า Lovable

## ⚠️ สิ่งสำคัญที่ต้องบอก Lovable

### 1. Environment Variables (จำเป็นมาก!)

แอปพลิเคชันนี้ต้องการ Environment Variables ต่อไปนี้ **ต้องตั้งค่าก่อน deploy**:

#### Supabase Configuration
```
VITE_SUPABASE_URL=https://bwimmqwtmrprnrhdszts.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_IxLJbB46XkQ6CbhWoYurzQ_HYUAtr6o
```

#### Cloudinary Configuration (สำหรับการอัปโหลดภาพ)
```
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_API_KEY=your_cloudinary_api_key
VITE_CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

**วิธีตั้งค่า:**
1. ไปที่ Lovable Project Settings
2. เลือก "Environment Variables"
3. เพิ่มตัวแปรทั้งหมดข้างต้น
4. คลิก "Save"
5. **Redeploy** เพื่อให้ตัวแปรมีผล

---

### 2. Build Configuration

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node Version:** 18.x หรือสูงกว่า
- **Package Manager:** npm (มี `package-lock.json`)

---

### 3. Supabase Edge Functions

โปรเจกต์นี้ใช้ Supabase Edge Functions ที่อยู่ใน `supabase/functions/`:

- `upload-image` - สำหรับอัปโหลดภาพไปยัง Cloudinary
- `get-signed-url` - สำหรับดึง signed URL ของภาพ
- `send-otp` - สำหรับส่ง OTP
- `verify-otp` - สำหรับตรวจสอบ OTP
- `translate-text` - สำหรับแปลข้อความ
- `confirm-buyer-email` - สำหรับยืนยันอีเมลผู้ซื้อ

**หมายเหตุ:** Edge Functions เหล่านี้ต้อง deploy ไปยัง Supabase แยกต่างหาก (ไม่ใช่ใน Lovable)

---

### 4. Database Migrations

มี SQL migrations อยู่ใน `supabase/migrations/` (48+ ไฟล์)

**ต้องรัน migrations เหล่านี้ใน Supabase Dashboard:**
1. ไปที่ Supabase Dashboard
2. เลือก SQL Editor
3. รัน migrations ตามลำดับ

---

### 5. Storage Buckets

ต้องสร้าง Storage Buckets ใน Supabase:
- `avatars` - สำหรับเก็บ avatar images
- `artworks` - สำหรับเก็บ artwork images
- `community` - สำหรับเก็บ community post images

**ตั้งค่าใน Supabase Dashboard > Storage**

---

### 6. ปัญหาที่อาจพบ

#### ❌ เว็บไม่แสดงข้อมูล
- **สาเหตุ:** Environment Variables ยังไม่ได้ตั้งค่า
- **แก้ไข:** ตั้งค่า `VITE_SUPABASE_URL` และ `VITE_SUPABASE_PUBLISHABLE_KEY`

#### ❌ ไม่สามารถอัปโหลดภาพได้
- **สาเหตุ:** Cloudinary Environment Variables ยังไม่ได้ตั้งค่า
- **แก้ไข:** ตั้งค่า `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_API_KEY`, `VITE_CLOUDINARY_API_SECRET`

#### ❌ Authentication ไม่ทำงาน
- **สาเหตุ:** Supabase URL หรือ Key ไม่ถูกต้อง
- **แก้ไข:** ตรวจสอบ Environment Variables อีกครั้ง

---

### 7. ขั้นตอนการ Deploy

1. ✅ เชื่อมต่อ GitHub Repository
2. ✅ ตั้งค่า Environment Variables (สำคัญมาก!)
3. ✅ ตรวจสอบ Build Configuration
4. ✅ Deploy
5. ✅ ตรวจสอบว่าเว็บทำงานได้ปกติ

---

### 8. ข้อมูลเพิ่มเติม

- **Repository:** https://github.com/Choonahakarn/waitsadsadxgsdxrkjlpiomkberaft48569
- **Framework:** Vite + React + TypeScript
- **UI Library:** shadcn-ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Image Storage:** Cloudinary

---

## 📝 Checklist สำหรับ Lovable

- [ ] ตั้งค่า `VITE_SUPABASE_URL`
- [ ] ตั้งค่า `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] ตั้งค่า `VITE_CLOUDINARY_CLOUD_NAME`
- [ ] ตั้งค่า `VITE_CLOUDINARY_API_KEY`
- [ ] ตั้งค่า `VITE_CLOUDINARY_API_SECRET`
- [ ] ตรวจสอบ Build Command: `npm run build`
- [ ] ตรวจสอบ Output Directory: `dist`
- [ ] Deploy และทดสอบ

---

**⚠️ หมายเหตุสำคัญ:** 
- Environment Variables **ต้องตั้งค่าก่อน deploy** ไม่งั้นเว็บจะไม่ทำงาน
- หลังจากตั้งค่า Environment Variables แล้ว ต้อง **Redeploy** เพื่อให้มีผล
