import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ExternalLink } from "lucide-react";

interface Order {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  artworks?: {
    id: string;
    title: string;
    image_url: string;
  };
  artist_profiles?: {
    artist_name: string;
  };
}

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          artworks (id, title, image_url),
          artist_profiles (artist_name)
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">กรุณาเข้าสู่ระบบ</h2>
              <p className="text-muted-foreground">คุณต้องเข้าสู่ระบบเพื่อดูประวัติการสั่งซื้อ</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
            <ShoppingBag className="h-8 w-8" />
            ประวัติการสั่งซื้อ
          </h1>

          <Card>
            <CardHeader>
              <CardTitle>ผลงานที่ซื้อแล้ว</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8">กำลังโหลด...</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">ยังไม่มีประวัติการสั่งซื้อ</p>
                  <Link to="/marketplace" className="text-primary hover:underline">
                    ไปดูผลงานในตลาด
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div 
                      key={order.id} 
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      {order.artworks && (
                        <img 
                          src={order.artworks.image_url} 
                          alt={order.artworks.title} 
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <Link 
                          to={`/artwork/${order.artworks?.id}`}
                          className="font-semibold hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {order.artworks?.title || "ผลงานถูกลบ"}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          โดย {order.artist_profiles?.artist_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString("th-TH")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">฿{order.amount.toLocaleString()}</p>
                        <Badge 
                          variant={order.status === "completed" ? "default" : "secondary"}
                          className="mt-1"
                        >
                          {order.status === "completed" ? "สำเร็จ" : order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default MyOrders;
