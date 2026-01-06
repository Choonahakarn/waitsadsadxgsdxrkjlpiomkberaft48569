import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Palette, ShieldCheck, BarChart3 } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, loading, isAdmin, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const stats = [
    {
      title: 'ผู้ใช้ทั้งหมด',
      value: '0',
      description: 'ศิลปินและผู้ซื้อ',
      icon: Users,
      href: '/admin/users',
    },
    {
      title: 'ศิลปิน',
      value: '0',
      description: 'ศิลปินที่ลงทะเบียน',
      icon: Palette,
      href: '/admin/artists',
    },
    {
      title: 'รอการยืนยัน',
      value: '0',
      description: 'ศิลปินรอการตรวจสอบ',
      icon: ShieldCheck,
      href: '/admin/verifications',
    },
    {
      title: 'ยอดขาย',
      value: '฿0',
      description: 'รายได้ทั้งหมด',
      icon: BarChart3,
      href: '/admin/sales',
    },
  ];

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              แดชบอร์ด Admin
            </h1>
            <p className="mt-2 text-muted-foreground">
              จัดการผู้ใช้ ศิลปิน และการยืนยันตัวตน
            </p>
          </motion.div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Link to={stat.href}>
                  <Card className="transition-shadow hover:shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <stat.icon className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <CardDescription>{stat.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>การจัดการ</CardTitle>
                  <CardDescription>เมนูหลักสำหรับ Admin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    to="/admin/users"
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">จัดการผู้ใช้</p>
                      <p className="text-sm text-muted-foreground">ดูและจัดการบัญชีผู้ใช้ทั้งหมด</p>
                    </div>
                  </Link>
                  <Link
                    to="/admin/artists"
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <Palette className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">จัดการศิลปิน</p>
                      <p className="text-sm text-muted-foreground">ดูโปรไฟล์ศิลปินและผลงาน</p>
                    </div>
                  </Link>
                  <Link
                    to="/admin/verifications"
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">การยืนยันตัวตน</p>
                      <p className="text-sm text-muted-foreground">ตรวจสอบและอนุมัติศิลปิน</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>กิจกรรมล่าสุด</CardTitle>
                  <CardDescription>การเคลื่อนไหวในระบบ</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    ยังไม่มีกิจกรรม
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AdminDashboard;
