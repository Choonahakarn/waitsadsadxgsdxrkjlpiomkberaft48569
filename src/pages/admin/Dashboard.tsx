import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, Palette, ShieldCheck, UserCheck, Image, CreditCard, Loader2, TrendingUp, Clock, ArrowDownToLine, Flag, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
interface Stats {
  totalUsers: number;
  totalArtists: number;
  pendingVerifications: number;
  pendingArtworks: number;
  pendingTopups: number;
  pendingReports: number;
  totalSales: number;
  totalArtworks: number;
  soldArtworks: number;
}

interface RecentOrder {
  id: string;
  amount: number;
  created_at: string;
  artworks: {
    title: string;
  } | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  const { settings, updateSetting: updateAppSetting } = useAppSettings();
  const [togglingCommunity, setTogglingCommunity] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalArtists: 0,
    pendingVerifications: 0,
    pendingArtworks: 0,
    pendingTopups: 0,
    pendingReports: 0,
    totalSales: 0,
    totalArtworks: 0,
    soldArtworks: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const handleToggleCommunity = async (enabled: boolean) => {
    setTogglingCommunity(true);
    const success = await updateAppSetting('community_enabled', enabled);
    setTogglingCommunity(false);
    if (success) {
      toast({
        title: enabled ? 'เปิดคอมมูนิตี้แล้ว' : 'ปิดคอมมูนิตี้แล้ว',
        description: enabled ? 'ผู้ใช้สามารถเข้าถึงหน้าคอมมูนิตี้ได้' : 'หน้าคอมมูนิตี้ถูกปิดการใช้งานชั่วคราว',
      });
    } else {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเปลี่ยนสถานะได้',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // Fetch all stats in parallel
      const [
        profilesRes,
        artistsRes,
        verificationsRes,
        artworksRes,
        pendingArtworksRes,
        topupsRes,
        reportsRes,
        ordersRes,
        recentOrdersRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('artist_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('verification_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('artworks').select('id, is_sold', { count: 'exact' }),
        supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('is_verified', false),
        supabase.from('topup_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('amount'),
        supabase.from('orders').select('id, amount, created_at, artworks (title)').order('created_at', { ascending: false }).limit(5),
      ]);

      const totalSales = ordersRes.data?.reduce((sum, o) => sum + Number(o.amount), 0) || 0;
      const soldArtworks = artworksRes.data?.filter(a => a.is_sold).length || 0;

      setStats({
        totalUsers: profilesRes.count || 0,
        totalArtists: artistsRes.count || 0,
        pendingVerifications: verificationsRes.count || 0,
        pendingArtworks: pendingArtworksRes.count || 0,
        pendingTopups: topupsRes.count || 0,
        pendingReports: reportsRes.count || 0,
        totalSales,
        totalArtworks: artworksRes.count || 0,
        soldArtworks,
      });

      setRecentOrders(recentOrdersRes.data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

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

  const statCards = [
    {
      title: 'ผู้ใช้ทั้งหมด',
      value: stats.totalUsers.toLocaleString(),
      description: 'ศิลปินและผู้ซื้อ',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-500',
    },
    {
      title: 'ศิลปิน',
      value: stats.totalArtists.toLocaleString(),
      description: 'ศิลปินที่ลงทะเบียน',
      icon: Palette,
      href: '/admin/artists',
      color: 'text-purple-500',
    },
    {
      title: 'ผลงานทั้งหมด',
      value: stats.totalArtworks.toLocaleString(),
      description: `ขายแล้ว ${stats.soldArtworks} ชิ้น`,
      icon: Image,
      href: '/admin/artwork-verifications',
      color: 'text-green-500',
    },
    {
      title: 'ยอดขายรวม',
      value: `฿${stats.totalSales.toLocaleString()}`,
      description: 'รายได้ทั้งหมด',
      icon: TrendingUp,
      href: '/admin',
      color: 'text-primary',
    },
  ];

  const pendingCards = [
    {
      title: 'ผลงานรอตรวจ',
      value: stats.pendingArtworks,
      icon: Image,
      href: '/admin/artwork-verifications',
      color: 'bg-yellow-500',
    },
    {
      title: 'ยืนยันตัวตนรอ',
      value: stats.pendingVerifications,
      icon: ShieldCheck,
      href: '/admin/verifications',
      color: 'bg-orange-500',
    },
    {
      title: 'เติมเงินรอ',
      value: stats.pendingTopups,
      icon: CreditCard,
      href: '/admin/topup-requests',
      color: 'bg-red-500',
    },
    {
      title: 'รายงานรอดู',
      value: stats.pendingReports,
      icon: Flag,
      href: '/admin/reports',
      color: 'bg-purple-500',
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
              ภาพรวมและจัดการระบบทั้งหมด
            </p>
          </motion.div>

          {/* Feature Toggles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  ตั้งค่าฟีเจอร์
                </CardTitle>
                <CardDescription>เปิด/ปิดฟีเจอร์ต่างๆ ของระบบ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                      <Label htmlFor="community-toggle" className="font-medium cursor-pointer">
                        หน้าคอมมูนิตี้
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {settings.community_enabled ? 'เปิดใช้งานอยู่' : 'ปิดใช้งานอยู่'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="community-toggle"
                    checked={settings.community_enabled}
                    onCheckedChange={handleToggleCommunity}
                    disabled={togglingCommunity}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          {statsLoading ? (
            <div className="mt-10 flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => (
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
                          <stat.icon className={`h-5 w-5 ${stat.color}`} />
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

              {/* Pending Items */}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {pendingCards.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                  >
                    <Link to={item.href}>
                      <Card className={`transition-shadow hover:shadow-lg ${item.value > 0 ? 'border-yellow-500/50' : ''}`}>
                        <CardContent className="flex items-center gap-4 py-4">
                          <div className={`rounded-full p-2 ${item.color}`}>
                            <item.icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{item.title}</p>
                            <p className="text-xl font-bold">
                              {item.value > 0 ? (
                                <span className="text-yellow-600">{item.value} รายการ</span>
                              ) : (
                                <span className="text-green-600">ไม่มี</span>
                              )}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          )}

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
                    to="/admin/artwork-verifications"
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <Image className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">ยืนยันผลงานศิลปะ</p>
                      <p className="text-sm text-muted-foreground">ตรวจสอบและอนุมัติผลงานก่อนแสดงในตลาด</p>
                    </div>
                    {stats.pendingArtworks > 0 && (
                      <span className="rounded-full bg-yellow-500 px-2 py-1 text-xs text-white">
                        {stats.pendingArtworks}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/admin/identity-verifications"
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <UserCheck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">ยืนยันตัวตนศิลปิน</p>
                      <p className="text-sm text-muted-foreground">ตรวจสอบชื่อจริงและเบอร์โทร</p>
                    </div>
                  </Link>
                  <Link
                    to="/admin/topup-requests"
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">จัดการเติมเงิน</p>
                      <p className="text-sm text-muted-foreground">ตรวจสอบและอนุมัติคำขอเติมเงิน</p>
                    </div>
                    {stats.pendingTopups > 0 && (
                      <span className="rounded-full bg-yellow-500 px-2 py-1 text-xs text-white">
                        {stats.pendingTopups}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/admin/withdrawal-requests"
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <ArrowDownToLine className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">จัดการถอนเงิน</p>
                      <p className="text-sm text-muted-foreground">ตรวจสอบและอนุมัติคำขอถอนเงินศิลปิน</p>
                    </div>
                  </Link>
                  <Link
                    to="/admin/reports"
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <Flag className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">รายงานผู้ใช้</p>
                      <p className="text-sm text-muted-foreground">ดูและจัดการรายงานจากผู้ใช้</p>
                    </div>
                    {stats.pendingReports > 0 && (
                      <span className="rounded-full bg-purple-500 px-2 py-1 text-xs text-white">
                        {stats.pendingReports}
                      </span>
                    )}
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
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    การขายล่าสุด
                  </CardTitle>
                  <CardDescription>รายการซื้อขายล่าสุด</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      ยังไม่มีการขาย
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {recentOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                          <div>
                            <p className="font-medium truncate max-w-[200px]">
                              {order.artworks?.title || 'ไม่พบชื่อ'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.created_at), 'd MMM yyyy HH:mm', { locale: th })}
                            </p>
                          </div>
                          <span className="font-semibold text-primary">
                            ฿{Number(order.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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
