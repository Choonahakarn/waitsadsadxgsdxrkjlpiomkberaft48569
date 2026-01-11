# 🔧 แก้ไข Cloudinary Signature Error

## ❌ Error:
```
Invalid Signature 1b53b8e8438d95f99a07ce15ae0b76d063ef0720
String to sign: 'colors=true&folder=community/...&timestamp=1768150129'
```

## 🔍 สาเหตุที่เป็นไปได้:

1. **API Secret ไม่ถูกต้อง** - ตรวจสอบว่า secret ที่ตั้งค่าใน Supabase ตรงกับ Cloudinary Dashboard
2. **API Secret มี whitespace** - อาจมีช่องว่างหน้า/หลัง secret
3. **Signature generation ไม่ถูกต้อง** - ลำดับ parameters หรือการ hash

## ✅ วิธีแก้ไข:

### Step 1: ตรวจสอบ API Secret ใน Supabase

1. ไปที่: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/functions
2. คลิก **"Secrets"**
3. ตรวจสอบ `CLOUDINARY_API_SECRET`:
   - Value ต้องเป็น: `4IQ53N90qL_DJVNRrha7QgoCPqk` (ไม่มีช่องว่าง)
   - ต้องตรงกับ Cloudinary Dashboard

### Step 2: ลบและสร้าง Secret ใหม่ (ถ้ายังไม่ได้)

1. ลบ `CLOUDINARY_API_SECRET` เดิม
2. สร้างใหม่:
   - **Name:** `CLOUDINARY_API_SECRET`
   - **Value:** `4IQ53N90qL_DJVNRrha7QgoCPqk` (copy จาก Cloudinary Dashboard)

### Step 3: Redeploy Function

```bash
npx supabase functions deploy upload-image
```

### Step 4: ดู Logs

1. ไปที่: Functions → upload-image → Logs
2. ดู logs ที่มี:
   - `Cloudinary config:` (จะแสดง cloudName และ apiKey 4 ตัวแรก)
   - `Signature string:` (จะแสดง string ที่ใช้ sign)
   - `Generated signature:` (จะแสดง signature ที่สร้าง)

### Step 5: ทดสอบอีกครั้ง

ลองอัปโหลดรูปภาพใหม่ และดู logs เพื่อ debug

---

## 💡 Tips:

- ตรวจสอบว่า API Secret ไม่มีช่องว่างหน้า/หลัง
- ตรวจสอบว่า API Secret ตรงกับ Cloudinary Dashboard
- ดู logs เพื่อ debug signature generation
