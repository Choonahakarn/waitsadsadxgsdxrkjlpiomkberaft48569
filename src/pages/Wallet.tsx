import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Wallet as WalletIcon, Upload, History, CreditCard, Clock, CheckCircle, XCircle } from "lucide-react";

interface WalletData {
  id: string;
  balance: number;
}

interface TopupRequest {
  id: string;
  amount: number;
  slip_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

const Wallet = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [topupAmount, setTopupAmount] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch or create wallet
      let { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (walletError && walletError.code === "PGRST116") {
        // Wallet doesn't exist, create one
        const { data: newWallet, error: createError } = await supabase
          .from("wallets")
          .insert({ user_id: user.id, balance: 0 })
          .select()
          .single();
        
        if (createError) throw createError;
        walletData = newWallet;
      } else if (walletError) {
        throw walletError;
      }

      setWallet(walletData);

      // Fetch topup requests
      const { data: requests, error: requestsError } = await supabase
        .from("topup_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;
      setTopupRequests(requests || []);

      // Fetch transactions
      if (walletData) {
        const { data: txns, error: txnsError } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", walletData.id)
          .order("created_at", { ascending: false });

        if (txnsError) throw txnsError;
        setTransactions(txns || []);
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลกระเป๋าเงินได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!user || !slipFile || !topupAmount) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณากรอกจำนวนเงินและอัพโหลดสลิป",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "จำนวนเงินไม่ถูกต้อง",
        description: "กรุณากรอกจำนวนเงินที่ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload slip
      const fileExt = slipFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("payment-slips")
        .upload(fileName, slipFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("payment-slips")
        .getPublicUrl(fileName);

      // Create topup request
      const { error: insertError } = await supabase
        .from("topup_requests")
        .insert({
          user_id: user.id,
          amount,
          slip_url: urlData.publicUrl,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast({
        title: "ส่งคำขอเติมเงินสำเร็จ",
        description: "รอ Admin ตรวจสอบและอนุมัติ",
      });

      setTopupAmount("");
      setSlipFile(null);
      fetchWalletData();
    } catch (error) {
      console.error("Error creating topup request:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งคำขอเติมเงินได้",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> รอตรวจสอบ</Badge>;
      case "approved":
        return <Badge className="flex items-center gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> ปฏิเสธ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "topup":
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case "purchase":
        return <WalletIcon className="h-4 w-4 text-red-500" />;
      case "refund":
        return <History className="h-4 w-4 text-blue-500" />;
      default:
        return <WalletIcon className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <WalletIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">กรุณาเข้าสู่ระบบ</h2>
              <p className="text-muted-foreground">คุณต้องเข้าสู่ระบบเพื่อใช้งานกระเป๋าเงิน</p>
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
          {/* Balance Card */}
          <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="py-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ยอดเงินคงเหลือ</p>
                  <h1 className="text-4xl font-bold">
                    ฿{wallet?.balance?.toLocaleString() || "0"}
                  </h1>
                </div>
                <WalletIcon className="h-16 w-16 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="topup">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="topup">เติมเงิน</TabsTrigger>
              <TabsTrigger value="requests">รายการเติมเงิน</TabsTrigger>
              <TabsTrigger value="history">ประวัติธุรกรรม</TabsTrigger>
            </TabsList>

            <TabsContent value="topup" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    เติมเงินเข้ากระเป๋า
                  </CardTitle>
                  <CardDescription>
                    โอนเงินเข้าบัญชีธนาคารด้านล่าง แล้วอัพโหลดสลิปเพื่อยืนยัน
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bank Info */}
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">ข้อมูลบัญชีธนาคาร</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">ธนาคาร:</span> กสิกรไทย</p>
                      <p><span className="text-muted-foreground">เลขบัญชี:</span> XXX-X-XXXXX-X</p>
                      <p><span className="text-muted-foreground">ชื่อบัญชี:</span> บริษัท ตัวอย่าง จำกัด</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="slip">อัพโหลดสลิปโอนเงิน</Label>
                      <Input
                        id="slip"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                      />
                      {slipFile && (
                        <p className="text-sm text-muted-foreground mt-1">
                          ไฟล์ที่เลือก: {slipFile.name}
                        </p>
                      )}
                    </div>

                    <Button 
                      onClick={handleTopup} 
                      disabled={uploading || !topupAmount || !slipFile}
                      className="w-full"
                    >
                      {uploading ? "กำลังส่ง..." : "ส่งคำขอเติมเงิน"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>รายการเติมเงิน</CardTitle>
                </CardHeader>
                <CardContent>
                  {topupRequests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      ยังไม่มีรายการเติมเงิน
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {topupRequests.map((request) => (
                        <div 
                          key={request.id} 
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <img 
                              src={request.slip_url} 
                              alt="สลิป" 
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div>
                              <p className="font-semibold">฿{request.amount.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(request.created_at).toLocaleDateString("th-TH")}
                              </p>
                              {request.admin_notes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  หมายเหตุ: {request.admin_notes}
                                </p>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>ประวัติธุรกรรม</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      ยังไม่มีประวัติธุรกรรม
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map((tx) => (
                        <div 
                          key={tx.id} 
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(tx.type)}
                            <div>
                              <p className="font-medium">
                                {tx.type === "topup" && "เติมเงิน"}
                                {tx.type === "purchase" && "ซื้อผลงาน"}
                                {tx.type === "refund" && "คืนเงิน"}
                              </p>
                              {tx.description && (
                                <p className="text-sm text-muted-foreground">{tx.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.created_at).toLocaleString("th-TH")}
                              </p>
                            </div>
                          </div>
                          <span className={`font-semibold ${tx.type === "purchase" ? "text-red-500" : "text-green-500"}`}>
                            {tx.type === "purchase" ? "-" : "+"}฿{Math.abs(tx.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Wallet;
