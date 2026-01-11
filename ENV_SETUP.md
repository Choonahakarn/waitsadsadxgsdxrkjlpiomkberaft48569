# Environment Variables Setup for Lovable

## Required Environment Variables

เพื่อให้แอปพลิเคชันทำงานได้ใน Lovable คุณต้องตั้งค่า Environment Variables ต่อไปนี้:

### Supabase Configuration

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Cloudinary Configuration (สำหรับการอัปโหลดภาพ)

```
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_API_KEY=your_cloudinary_api_key
VITE_CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## วิธีตั้งค่าใน Lovable

1. ไปที่ Project Settings ใน Lovable
2. เลือก "Environment Variables"
3. เพิ่มตัวแปรทั้งหมดข้างต้น
4. คลิก "Save"

## หมายเหตุ

- **อย่า** commit ไฟล์ `.env` หรือ `.env.local` ลงใน Git
- ใช้ Environment Variables ใน Lovable แทนการสร้างไฟล์ `.env`
- ตรวจสอบว่า Supabase และ Cloudinary services ทำงานถูกต้อง

## การตรวจสอบ

หลังจากตั้งค่า Environment Variables แล้ว:
1. รัน `npm run dev` เพื่อทดสอบใน local
2. Deploy บน Lovable
3. ตรวจสอบว่าแอปพลิเคชันทำงานได้ปกติ
