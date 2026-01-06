import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, TrendingUp, Wallet, Image, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Order {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  artworks: {
    title: string;
    image_url: string;
  } | null;
}

interface Stats {
  totalEarnings: number;
  totalSold: number;
  totalArtworks: number;
  pendingArtworks: number;
}

const Earnings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isArtist } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEarnings: 0,
    totalSold: 0,
    totalArtworks: 0,
    pendingArtworks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isArtist)) {
      navigate("/auth");
    }
  }, [user, authLoading, isArtist, navigate]);

  useEffect(() => {
    if (user && isArtist) {
      fetchData();
    }
  }, [user, isArtist]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get artist profile
      const { data: artistProfile } = await supabase
        .from("artist_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!artistProfile) {
        setLoading(false);
        return;
      }

      // Fetch orders for this artist
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id, amount, status, created_at,
          artworks (title, image_url)
        `)
        .eq("artist_id", artistProfile.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch artworks stats
      const { data: artworksData } = await supabase
        .from("artworks")
        .select("id, is_sold, is_verified")
        .eq("artist_id", artistProfile.id);

      const totalEarnings = ordersData?.reduce((sum, o) => sum + Number(o.amount), 0) || 0;
      const totalSold = artworksData?.filter((a) => a.is_sold).length || 0;
      const totalArtworks = artworksData?.length || 0;
      const pendingArtworks = artworksData?.filter((a) => !a.is_verified && !a.is_sold).length || 0;

      setOrders(ordersData || []);
      setStats({
        totalEarnings,
        totalSold,
        totalArtworks,
        pendingArtworks,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isArtist) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            สรุปรายได้
          </h1>
          <p className="text-muted-foreground mt-1">
            ดูยอดขายและรายได้ทั้งหมดของคุณ
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">รายได้ทั้งหมด</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ฿{stats.totalEarnings.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ขายแล้ว</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSold} ชิ้น</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ผลงานทั้งหมด</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalArtworks} ชิ้น</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">รอตรวจสอบ</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingArtworks} ชิ้น
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>ประวัติการขาย</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ยังไม่มีประวัติการขาย
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผลงาน</TableHead>
                    <TableHead>ราคา</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {order.artworks?.image_url && (
                            <img
                              src={order.artworks.image_url}
                              alt={order.artworks.title}
                              className="h-10 w-10 rounded object-cover"
                            />
                          )}
                          <span className="font-medium">
                            {order.artworks?.title || "ไม่พบชื่อ"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        ฿{Number(order.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "completed" ? "default" : "secondary"
                          }
                        >
                          {order.status === "completed" ? "สำเร็จ" : order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.created_at), "d MMM yyyy HH:mm", {
                          locale: th,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Earnings;
