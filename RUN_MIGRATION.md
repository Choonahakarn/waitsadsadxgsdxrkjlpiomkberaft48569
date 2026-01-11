# วิธีรัน Migration สำหรับเพิ่ม post_id ใน artworks

## วิธีที่ 1: ใช้ Supabase Dashboard (ง่ายที่สุด)

1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
2. เลือก project ของคุณ
3. ไปที่ **SQL Editor** (เมนูด้านซ้าย)
4. Copy SQL ด้านล่างและวางใน SQL Editor
5. คลิก **Run** หรือกด `Ctrl+Enter`

```sql
-- Add post_id column to artworks table to link with community_posts
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artworks_post_id ON public.artworks(post_id);

-- Add comment for documentation
COMMENT ON COLUMN public.artworks.post_id IS 'Links artwork to community post when added to portfolio';
```

## วิธีที่ 2: ใช้ Supabase CLI

### ขั้นตอนที่ 1: สร้าง Access Token
1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
2. คลิกที่ profile icon (มุมขวาบน) → **Account Settings**
3. ไปที่ **Access Tokens**
4. คลิก **Generate new token**
5. Copy token ที่ได้

### ขั้นตอนที่ 2: Login และ Link Project

```bash
# Login ด้วย token
npx supabase login --token YOUR_ACCESS_TOKEN

# Link project (ใช้ project reference จาก Supabase Dashboard)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

## วิธีที่ 3: ใช้ Environment Variable

```bash
# ตั้งค่า access token
$env:SUPABASE_ACCESS_TOKEN="your_access_token_here"

# Link project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

## ตรวจสอบว่า Migration สำเร็จ

หลังจากรัน migration แล้ว ตรวจสอบว่า column ถูกเพิ่มแล้ว:

```sql
-- ตรวจสอบว่า post_id column มีอยู่แล้ว
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'artworks' AND column_name = 'post_id';
```

## หมายเหตุ

- Migration นี้จะเพิ่ม column `post_id` ใน `artworks` table
- Column นี้จะเชื่อมกับ `community_posts` table
- Portfolio items จะมี `post_id` ที่ชี้ไปยัง post ต้นฉบับ
- Marketplace จะไม่แสดง items ที่มี `post_id` (Portfolio items)
