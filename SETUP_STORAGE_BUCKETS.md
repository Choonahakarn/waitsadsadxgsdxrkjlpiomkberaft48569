# ตั้งค่า Storage Buckets

## ไปที่ Supabase Dashboard

https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/storage/buckets

## สร้าง Buckets ต่อไปนี้:

### 1. artworks (Public)
- **Name**: `artworks`
- **Public**: ✅ Yes
- **File size limit**: 10 MB (หรือตามต้องการ)
- **Allowed MIME types**: `image/*`

### 2. avatars (Public)
- **Name**: `avatars`
- **Public**: ✅ Yes
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/*`

### 3. posts (Public)
- **Name**: `posts`
- **Public**: ✅ Yes
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/*`

### 4. verification-docs (Private)
- **Name**: `verification-docs`
- **Public**: ❌ No (Private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/*, application/pdf`

### 5. payment-slips (Private)
- **Name**: `payment-slips`
- **Public**: ❌ No (Private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/*, application/pdf`

## หมายเหตุ

- RLS policies จะถูกสร้างโดย migrations อัตโนมัติ
- ถ้า buckets ยังไม่ถูกสร้าง migrations บางตัวอาจจะ error
- สร้าง buckets ก่อนรัน migrations ที่เกี่ยวข้องกับ storage
