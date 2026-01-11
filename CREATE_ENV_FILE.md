# สร้างไฟล์ .env.local

## ขั้นตอน

1. สร้างไฟล์ชื่อ `.env.local` ใน root directory (เดียวกับ package.json)

2. Copy เนื้อหานี้ลงไป:

```env
VITE_SUPABASE_URL=https://bwimmqwtmrprnrhdszts.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_IxLJbB46XkQ6CbhWoYurzQ_HYUAtr6o
```

3. บันทึกไฟล์

## หมายเหตุ

- ไฟล์ `.env.local` จะถูก ignore โดย git (ไม่ถูก commit)
- อย่า commit secret keys ลง git!
