import { useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Shield, 
  Lock, 
  Users, 
  ChevronRight,
  Settings,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  artistOnly?: boolean;
}

const artistMenuItems: MenuItem[] = [
  {
    title: 'แก้ไขโปรไฟล์ศิลปิน',
    description: 'แก้ไขข้อมูลโปรไฟล์ศิลปิน ชื่อศิลปิน และผลงาน',
    icon: Palette,
    href: '/artist/edit-profile',
  },
];

const buyerMenuItems: MenuItem[] = [
  {
    title: 'แก้ไขโปรไฟล์',
    description: 'แก้ไขข้อมูลโปรไฟล์ รูปภาพ และข้อมูลส่วนตัว',
    icon: User,
    href: '/settings/edit-profile',
  },
];

const commonMenuItems: MenuItem[] = [
  {
    title: 'ความเป็นส่วนตัว',
    description: 'จัดการผู้ใช้ที่บล็อกและปิดเสียง',
    icon: Shield,
    href: '/settings/privacy',
  },
  {
    title: 'เปลี่ยนรหัสผ่าน',
    description: 'ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ',
    icon: Lock,
    href: '/settings/change-password',
  },
  {
    title: 'ผู้ติดตาม',
    description: 'ดูรายชื่อผู้ติดตามและผู้ที่คุณติดตาม',
    icon: Users,
    href: '/followers',
  },
];

const AccountSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, isArtist } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  // Build menu items based on user role
  // Artist: show artist edit profile only (no buyer edit profile)
  // Buyer: show buyer edit profile only
  const menuItems: MenuItem[] = [
    ...(isArtist ? artistMenuItems : buyerMenuItems),
    ...commonMenuItems,
  ];

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-primary/10 p-2">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
                  จัดการบัญชี
                </h1>
                <p className="text-muted-foreground">
                  ตั้งค่าและจัดการบัญชีของคุณ
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Link
                          to={item.href}
                          className={cn(
                            "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
                            isActive && "bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "rounded-full p-2.5",
                            isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">
                              {item.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Info Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">ข้อมูลบัญชี</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">อีเมล</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">สถานะ</span>
                  <span className="font-medium text-green-600">ใช้งานอยู่</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default AccountSettings;
