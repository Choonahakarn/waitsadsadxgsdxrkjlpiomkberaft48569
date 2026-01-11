# 🔍 Debug Portfolio ไม่แสดงภาพ

## วิธีตรวจสอบ

1. **เปิด Console (F12 → Console)**
2. **ดู logs ที่มี "Portfolio Tab Debug"**
3. **ตรวจสอบ:**
   - `totalPosts` - จำนวน posts ทั้งหมด
   - `totalArtworks` - จำนวน artworks ทั้งหมด
   - `artworksWithPostId` - จำนวน artworks ที่มี post_id
   - `portfolioPostIdsFromArtworks` - post IDs จาก artworks
   - `portfolioPostsCount` - จำนวน posts ที่จะแสดง

## ปัญหาที่เป็นไปได้

### 1. Artworks ไม่มี post_id
- **สาเหตุ:** โพสต์ก่อน migration หรือ artwork ไม่ถูกสร้างพร้อม post_id
- **แก้ไข:** ต้องโพสต์ใหม่หลังจาก migration แล้ว

### 2. Posts ไม่ถูก fetch
- **สาเหตุ:** Query ไม่ดึง posts มา
- **แก้ไข:** ตรวจสอบ console logs

### 3. Mapping ไม่ทำงาน
- **สาเหตุ:** artwork.post_id ไม่ตรงกับ post.id
- **แก้ไข:** ตรวจสอบ console logs

## วิธีแก้ไขชั่วคราว

ถ้ายังไม่แสดง ให้ลอง:
1. Refresh หน้าเว็บ (F5)
2. ตรวจสอบ console logs
3. ตรวจสอบว่า artwork มี post_id หรือไม่

## SQL เพื่อตรวจสอบ

```sql
-- ตรวจสอบ artworks ที่มี post_id
SELECT 
  a.id,
  a.title,
  a.post_id,
  a.created_at,
  p.id as post_id_check,
  p.title as post_title
FROM artworks a
LEFT JOIN community_posts p ON a.post_id = p.id
WHERE a.artist_id = (SELECT id FROM artist_profiles WHERE user_id = 'USER_ID_HERE')
ORDER BY a.created_at DESC;
```
