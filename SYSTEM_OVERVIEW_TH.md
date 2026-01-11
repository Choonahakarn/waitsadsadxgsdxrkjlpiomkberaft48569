# 📋 สรุประบบแพลตฟอร์มศิลปิน (SoulHuman)

**แพลตฟอร์ม:** แพลตฟอร์มชุมชนและตลาดซื้อขายงานศิลปะ (คล้าย Pixiv, ArtStation, Cara)

---

## 🎯 ระบบหลัก (Core Systems)

### 1. 🔐 ระบบ Authentication & Authorization
- **การสมัครสมาชิก:** Email/Password, Role-based (Admin, Artist, Buyer)
- **การเข้าสู่ระบบ:** Login, Logout
- **Email Verification:** ระบบยืนยันอีเมล
- **Role Management:** รองรับหลาย roles (Admin, Artist, Buyer)
- **Password Reset:** เปลี่ยนรหัสผ่าน

**ไฟล์ที่เกี่ยวข้อง:**
- `src/pages/Auth.tsx` - หน้า Login/Signup
- `src/hooks/useAuth.tsx` - Authentication hook
- `src/pages/ChangePassword.tsx` - เปลี่ยนรหัสผ่าน
- `supabase/functions/send-otp/` - OTP สำหรับยืนยัน

---

### 2. 👤 ระบบ User Management

#### 2.1 User Profiles
- **Profile หลัก:** full_name, avatar_url, bio, website, display_name
- **Privacy Settings:** การตั้งค่าความเป็นส่วนตัว
- **Account Settings:** จัดการบัญชี
- **Block/Mute Users:** บล็อกและปิดเสียงผู้ใช้

#### 2.2 Artist Profiles
- **Artist Info:** artist_name, specialty, years_experience, portfolio_url
- **Tools Used:** รายการเครื่องมือที่ใช้
- **Verification Badge:** ตรายืนยันตัวตนศิลปิน
- **Portfolio Management:** จัดการพอร์ตโฟลิโอ

**ไฟล์ที่เกี่ยวข้อง:**
- `src/pages/UserProfile.tsx` - โปรไฟล์ผู้ใช้
- `src/pages/EditUserProfile.tsx` - แก้ไขโปรไฟล์
- `src/pages/artist/EditProfile.tsx` - แก้ไขโปรไฟล์ศิลปิน
- `src/pages/PrivacySettings.tsx` - ตั้งค่าความเป็นส่วนตัว
- `src/pages/AccountSettings.tsx` - ตั้งค่าบัญชี

---

### 3. 🎨 ระบบ Artwork Marketplace

#### 3.1 Artwork Management
- **สร้างงานศิลปะ:** Title, Description, Image, Price, Category, Type
- **Categories:** Traditional, Digital
- **Types:** Original, Commission
- **Image Optimization:** 
  - หลายขนาด (Blur, 600px, 1200px, 2400px)
  - Cloudinary CDN
  - WebP/AVIF support
  - Lazy loading

#### 3.2 Marketplace Features
- **Browse Artworks:** แสดงผลงานศิลปะทั้งหมด
- **Search & Filter:** ค้นหาและกรองตาม category, type, verified
- **Pagination:** Infinite scroll
- **Artwork Detail:** หน้ารายละเอียดงานศิลปะ
- **Verified Artworks:** งานศิลปะที่ผ่านการยืนยัน

**ไฟล์ที่เกี่ยวข้อง:**
- `src/pages/Marketplace.tsx` - ตลาดงานศิลปะ
- `src/pages/ArtworkDetail.tsx` - รายละเอียดงานศิลปะ
- `src/pages/Sell.tsx` - ขายงานศิลปะ
- `src/components/artwork/ArtworkCard.tsx` - การ์ดงานศิลปะ
- `supabase/functions/upload-image/` - อัปโหลดรูปภาพ

---

### 4. 💰 ระบบการเงิน (Payment & Wallet)

#### 4.1 Wallet System
- **Wallet Balance:** ยอดเงินคงเหลือ
- **Top-up:** เติมเงินเข้า wallet
- **Withdraw:** ถอนเงิน (สำหรับศิลปิน)
- **Transaction History:** ประวัติการทำธุรกรรม

#### 4.2 Purchase System
- **Buy Artwork:** ซื้องานศิลปะ
- **Order Management:** จัดการคำสั่งซื้อ
- **My Orders:** คำสั่งซื้อของฉัน
- **Earnings (Artist):** รายได้ของศิลปิน

**ไฟล์ที่เกี่ยวข้อง:**
- `src/pages/Wallet.tsx` - กระเป๋าเงิน
- `src/pages/MyOrders.tsx` - คำสั่งซื้อของฉัน
- `src/pages/artist/Earnings.tsx` - รายได้ศิลปิน
- `src/pages/artist/Withdraw.tsx` - ถอนเงิน
- `src/pages/admin/TopupRequests.tsx` - คำขอเติมเงิน
- `src/pages/admin/WithdrawalRequests.tsx` - คำขอถอนเงิน

---

### 5. 🎭 ระบบ Community (Social Features)

#### 5.1 Community Feed
- **Posts:** โพสต์ผลงานศิลปะ
- **Likes:** กดไลค์โพสต์
- **Comments:** แสดงความคิดเห็น
- **Shares/Reposts:** แชร์/รีโพสต์
- **Saved Posts:** บันทึกโพสต์
- **Hashtags:** แฮชแท็ก
- **Categories:** หมวดหมู่โพสต์
- **Tools Used:** เครื่องมือที่ใช้

#### 5.2 Social Interactions
- **Follow/Unfollow:** ติดตาม/เลิกติดตาม
- **Mentions:** กล่าวถึงผู้ใช้ (@username)
- **Notifications:** การแจ้งเตือน
- **Followers/Following:** รายชื่อผู้ติดตาม

#### 5.3 Content Management
- **Create Post:** สร้างโพสต์
- **Edit Post:** แก้ไขโพสต์
- **Delete Post:** ลบโพสต์
- **Image Upload:** อัปโหลดรูปภาพ

**ไฟล์ที่เกี่ยวข้อง:**
- `src/pages/Community.tsx` - หน้าชุมชน (Main feed)
- `src/pages/SavedPosts.tsx` - โพสต์ที่บันทึกไว้
- `src/pages/Followers.tsx` - ผู้ติดตาม
- `src/components/community/PostDetailDialog.tsx` - รายละเอียดโพสต์
- `src/components/ui/NotificationBell.tsx` - การแจ้งเตือน

---

### 6. ✅ ระบบ Verification

#### 6.1 Artist Verification
- **Submit Verification:** ส่งคำขอยืนยันตัวตนศิลปิน
- **Upload Documents:** อัปโหลดเอกสารยืนยันตัวตน
- **Status Tracking:** ติดตามสถานะการยืนยัน

#### 6.2 Artwork Verification
- **Artwork Review:** ตรวจสอบงานศิลปะ
- **Verification Badge:** ตรายืนยันงานศิลปะ

#### 6.3 Admin Verification
- **Identity Verifications:** ยืนยันตัวตน
- **Artwork Verifications:** ยืนยันงานศิลปะ

**ไฟล์ที่เกี่ยวข้อง:**
- `src/pages/Verification.tsx` - หน้า verification
- `src/pages/artist/VerificationSubmit.tsx` - ส่งคำขอยืนยัน
- `src/pages/admin/Verifications.tsx` - จัดการคำขอยืนยัน
- `src/pages/admin/IdentityVerifications.tsx` - ยืนยันตัวตน
- `src/pages/admin/ArtworkVerifications.tsx` - ยืนยันงานศิลปะ

---

### 7. 👨‍💼 ระบบ Admin Panel

#### 7.1 Dashboard
- **Statistics:** สถิติผู้ใช้, ศิลปิน, งานศิลปะ, ยอดขาย
- **Recent Orders:** คำสั่งซื้อล่าสุด
- **Quick Actions:** การกระทำด่วน

#### 7.2 User Management
- **Manage Users:** จัดการผู้ใช้
- **Manage Artists:** จัดการศิลปิน
- **User Reports:** รายงานผู้ใช้

#### 7.3 Content Management
- **Verify Artworks:** ยืนยันงานศิลปะ
- **Verify Artists:** ยืนยันศิลปิน
- **Review Reports:** ตรวจสอบรายงาน

#### 7.4 Financial Management
- **Top-up Requests:** คำขอเติมเงิน
- **Withdrawal Requests:** คำขอถอนเงิน

**ไฟล์ที่เกี่ยวข้อง:**
- `src/pages/admin/Dashboard.tsx` - แดชบอร์ด
- `src/pages/admin/Users.tsx` - จัดการผู้ใช้
- `src/pages/admin/Artists.tsx` - จัดการศิลปิน
- `src/pages/admin/Reports.tsx` - รายงาน
- `src/pages/admin/TopupRequests.tsx` - คำขอเติมเงิน
- `src/pages/admin/WithdrawalRequests.tsx` - คำขอถอนเงิน

---

### 8. 🌐 ระบบ Internationalization (i18n)

- **Multi-language:** รองรับหลายภาษา (ไทย, อังกฤษ)
- **Language Switcher:** สลับภาษา
- **Auto Translation:** แปลอัตโนมัติ

**ไฟล์ที่เกี่ยวข้อง:**
- `src/i18n/` - การตั้งค่า i18n
- `src/components/ui/LanguageSwitcher.tsx` - สลับภาษา
- `src/components/ui/TranslateButton.tsx` - ปุ่มแปล
- `supabase/functions/translate-text/` - ฟังก์ชันแปล

---

### 9. 🖼️ ระบบจัดการรูปภาพ (Image Management)

#### 9.1 Image Upload
- **Upload:** อัปโหลดรูปภาพ
- **Compression:** บีบอัดอัตโนมัติ
- **Multiple Sizes:** สร้างหลายขนาดอัตโนมัติ
- **Format Optimization:** WebP/AVIF support

#### 9.2 Image Display
- **Optimized Image Component:** Component สำหรับแสดงรูปภาพ
- **Lazy Loading:** โหลดรูปภาพเมื่อจำเป็น
- **Blur Placeholder:** ภาพเบลอระหว่างโหลด
- **Responsive Images:** รูปภาพที่ปรับตามขนาดหน้าจอ

**ไฟล์ที่เกี่ยวข้อง:**
- `src/components/ui/OptimizedImage.tsx` - Component รูปภาพ
- `src/components/ui/ImageUploader.tsx` - อัปโหลดรูปภาพ
- `src/components/ui/ImageViewer.tsx` - ดูรูปภาพ
- `src/components/ui/ImageCropper.tsx` - ตัดรูปภาพ
- `src/components/ui/ImagePositioner.tsx` - ตำแหน่งรูปภาพ
- `supabase/functions/upload-image/` - API อัปโหลด

---

### 10. 🔒 ระบบความปลอดภัย (Security)

#### 10.1 User Safety
- **Block Users:** บล็อกผู้ใช้
- **Mute Users:** ปิดเสียงผู้ใช้
- **Report Users:** รายงานผู้ใช้
- **Privacy Settings:** ตั้งค่าความเป็นส่วนตัว

#### 10.2 Content Moderation
- **Admin Review:** ตรวจสอบเนื้อหา
- **Report System:** ระบบรายงาน
- **Content Filtering:** กรองเนื้อหา

**Database Tables:**
- `user_blocks` - ผู้ใช้ที่ถูกบล็อก
- `user_mutes` - ผู้ใช้ที่ถูกปิดเสียง
- `user_reports` - รายงานผู้ใช้

---

## 📊 Database Schema

### หลัก Tables:

1. **profiles** - โปรไฟล์ผู้ใช้
2. **user_roles** - บทบาทผู้ใช้ (Admin, Artist, Buyer)
3. **artist_profiles** - โปรไฟล์ศิลปิน
4. **artworks** - งานศิลปะ
5. **orders** - คำสั่งซื้อ
6. **wallets** - กระเป๋าเงิน
7. **community_posts** - โพสต์ชุมชน
8. **community_comments** - ความคิดเห็น
9. **community_likes** - ไลค์
10. **shared_posts** - โพสต์ที่แชร์
11. **saved_posts** - โพสต์ที่บันทึก
12. **follows** - การติดตาม
13. **user_blocks** - บล็อกผู้ใช้
14. **user_mutes** - ปิดเสียงผู้ใช้
15. **user_reports** - รายงานผู้ใช้
16. **verification_submissions** - คำขอยืนยันตัวตน
17. **topup_requests** - คำขอเติมเงิน
18. **withdrawal_requests** - คำขอถอนเงิน
19. **image_assets** - รูปภาพ (Cloudinary)

---

## 🔧 Edge Functions (Supabase Functions)

1. **upload-image** - อัปโหลดและปรับรูปภาพ
2. **get-signed-url** - สร้าง signed URL สำหรับรูปภาพต้นฉบับ
3. **send-otp** - ส่ง OTP
4. **verify-otp** - ยืนยัน OTP
5. **translate-text** - แปลข้อความ
6. **confirm-buyer-email** - ยืนยันอีเมลผู้ซื้อ

---

## 🎨 UI Components

### Custom Components:
- `OptimizedImage` - รูปภาพที่ปรับปรุงแล้ว
- `ImageUploader` - อัปโหลดรูปภาพ
- `ImageViewer` - ดูรูปภาพ
- `MasonryGrid` - Grid แบบ masonry
- `MentionInput` - Input สำหรับ mention
- `NotificationBell` - การแจ้งเตือน
- `TrustBadge` - ตราเชื่อถือ
- `VerificationBadge` - ตรายืนยัน
- `LanguageSwitcher` - สลับภาษา
- `TranslateButton` - ปุ่มแปล

### UI Library:
ใช้ **shadcn/ui** + **Radix UI** + **Tailwind CSS**

---

## 🚀 Features ที่เด่น

### Performance Optimizations:
✅ **Image Optimization** - Multiple sizes, lazy loading, blur placeholders
✅ **Batch Queries** - แก้ปัญหา N+1 queries
✅ **Pagination** - Infinite scroll
✅ **React Query Caching** - แคชข้อมูล
✅ **Code Splitting** - แบ่ง bundle

### UX Features:
✅ **Real-time Updates** - อัปเดตแบบ real-time
✅ **Responsive Design** - รองรับทุกขนาดหน้าจอ
✅ **Dark Mode** - โหมดมืด
✅ **Animations** - Framer Motion
✅ **Loading States** - สถานะการโหลด
✅ **Error Handling** - จัดการข้อผิดพลาด

---

## 📱 Pages (Routes)

### Public Pages:
- `/` - หน้าแรก
- `/marketplace` - ตลาดงานศิลปะ
- `/artwork/:id` - รายละเอียดงานศิลปะ
- `/artist/:id` - โปรไฟล์ศิลปิน
- `/artists` - รายชื่อศิลปิน
- `/community` - ชุมชน
- `/profile/:userId` - โปรไฟล์ผู้ใช้
- `/auth` - เข้าสู่ระบบ/สมัครสมาชิก
- `/verification` - ยืนยันตัวตน
- `/commission` - คอมมิชชั่น
- `/policy` - นโยบาย

### User Pages:
- `/wallet` - กระเป๋าเงิน
- `/my-orders` - คำสั่งซื้อของฉัน
- `/saved` - โพสต์ที่บันทึก
- `/followers` - ผู้ติดตาม
- `/settings/*` - ตั้งค่าต่างๆ

### Artist Pages:
- `/artist/edit-profile` - แก้ไขโปรไฟล์
- `/artist/verification` - ส่งคำขอยืนยัน
- `/artist/earnings` - รายได้
- `/artist/withdraw` - ถอนเงิน
- `/sell` - ขายงานศิลปะ

### Admin Pages:
- `/admin` - แดชบอร์ด
- `/admin/users` - จัดการผู้ใช้
- `/admin/artists` - จัดการศิลปิน
- `/admin/verifications` - คำขอยืนยัน
- `/admin/identity-verifications` - ยืนยันตัวตน
- `/admin/artwork-verifications` - ยืนยันงานศิลปะ
- `/admin/topup-requests` - คำขอเติมเงิน
- `/admin/withdrawal-requests` - คำขอถอนเงิน
- `/admin/reports` - รายงาน

---

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript
- **UI Framework:** Tailwind CSS + shadcn/ui
- **State Management:** React Query + Context API
- **Routing:** React Router v6
- **Animations:** Framer Motion
- **Build Tool:** Vite
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Image Storage:** Cloudinary CDN
- **Authentication:** Supabase Auth
- **i18n:** react-i18next

---

## 📈 สถิติ Codebase

- **Total Pages:** ~40+ pages
- **Components:** 100+ components
- **Database Tables:** 19+ tables
- **Edge Functions:** 6 functions
- **Routes:** 30+ routes

---

## ✨ Highlights

นี่คือแพลตฟอร์มที่ครบครันสำหรับชุมชนศิลปินที่มี:
- 🎨 Marketplace สำหรับซื้อขายงานศิลปะ
- 👥 Community สำหรับแชร์และโต้ตอบ
- 💰 ระบบการเงิน (Wallet, Top-up, Withdraw)
- ✅ ระบบยืนยันตัวตน (Artist & Artwork Verification)
- 👨‍💼 Admin Panel ที่ครอบคลุม
- 🖼️ ระบบจัดการรูปภาพที่ยอดเยี่ยม
- 🌐 รองรับหลายภาษา

**พร้อมใช้งานแล้ว!** 🚀
