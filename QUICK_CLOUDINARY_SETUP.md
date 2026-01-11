# ⚡ ตั้งค่า Cloudinary เร็วๆ

## ขั้นตอนด่วน

### 1. ไปที่ Cloudinary Dashboard
https://cloudinary.com/console

### 2. Copy Credentials
- **Cloud Name** (เช่น `dxxxxx`)
- **API Key** (เช่น `123456789012345`)
- **API Secret** (เช่น `abcdefghijklmnopqrstuvwxyz123456`)

### 3. ตั้งค่าใน Supabase
**ไปที่:** https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/settings/functions

**เพิ่ม Secrets:**
- `CLOUDINARY_CLOUD_NAME` = Cloud Name
- `CLOUDINARY_API_KEY` = API Key
- `CLOUDINARY_API_SECRET` = API Secret

### 4. Redeploy Function
```bash
npx supabase functions deploy upload-image
```

**หรือ:** Dashboard → Functions → upload-image → Redeploy

### 5. ทดสอบ
ลองอัปโหลดรูปภาพใหม่!

---

## 📋 Checklist

- [ ] สร้าง Cloudinary account
- [ ] Copy credentials (Cloud Name, API Key, API Secret)
- [ ] ตั้งค่า secrets ใน Supabase (3 ตัว)
- [ ] Redeploy function `upload-image`
- [ ] ทดสอบอัปโหลดรูปภาพ
