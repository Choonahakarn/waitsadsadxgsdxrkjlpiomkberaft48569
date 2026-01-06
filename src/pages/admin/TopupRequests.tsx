import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, CheckCircle, XCircle, Eye, CreditCard } from "lucide-react";

interface TopupRequest {
  id: string;
  user_id: string;
  amount: number;
  slip_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

const TopupRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TopupRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewSlip, setViewSlip] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch topup requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("topup_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch profiles for each request
      const userIds = [...new Set((requestsData || []).map(r => r.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const requestsWithProfiles = (requestsData || []).map(request => ({
        ...request,
        profiles: profilesMap.get(request.user_id) || undefined,
      }));

      setRequests(requestsWithProfiles);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดรายการเติมเงินได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;

    setProcessing(true);
    try {
      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", selectedRequest.user_id)
        .single();

      if (walletError) throw walletError;

      // Update wallet balance
      const newBalance = (wallet.balance || 0) + selectedRequest.amount;
      const { error: updateWalletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", wallet.id);

      if (updateWalletError) throw updateWalletError;

      // Create transaction record
      const { error: txError } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: wallet.id,
          type: "topup",
          amount: selectedRequest.amount,
          description: `เติมเงิน ฿${selectedRequest.amount.toLocaleString()}`,
          reference_id: selectedRequest.id,
        });

      if (txError) throw txError;

      // Update topup request status
      const { error: updateError } = await supabase
        .from("topup_requests")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      toast({
        title: "อนุมัติสำเร็จ",
        description: `เติมเงิน ฿${selectedRequest.amount.toLocaleString()} ให้ผู้ใช้แล้ว`,
      });

      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอนุมัติคำขอได้",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("topup_requests")
        .update({
          status: "rejected",
          admin_notes: adminNotes || "ไม่ผ่านการตรวจสอบ",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "ปฏิเสธคำขอแล้ว",
        description: "คำขอเติมเงินถูกปฏิเสธ",
      });

      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถปฏิเสธคำขอได้",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
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

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              จัดการคำขอเติมเงิน
            </h1>
            {pendingCount > 0 && (
              <p className="text-muted-foreground mt-1">
                มี {pendingCount} รายการรอตรวจสอบ
              </p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>รายการเติมเงินทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">กำลังโหลด...</p>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ยังไม่มีรายการเติมเงิน
              </p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div 
                    key={request.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      request.status === "pending" ? "border-primary/50 bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <img 
                        src={request.slip_url} 
                        alt="สลิป" 
                        className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setViewSlip(request.slip_url)}
                      />
                      <div>
                        <p className="font-semibold text-lg">฿{request.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.profiles?.full_name || request.profiles?.email || "ไม่ทราบผู้ใช้"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleString("th-TH")}
                        </p>
                        {request.admin_notes && (
                          <p className="text-sm mt-1 text-muted-foreground">
                            หมายเหตุ: {request.admin_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(request.status)}
                      {request.status === "pending" && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedRequest(request);
                            setAdminNotes("");
                          }}
                        >
                          ตรวจสอบ
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>ตรวจสอบคำขอเติมเงิน</DialogTitle>
              <DialogDescription>
                ตรวจสอบสลิปและอนุมัติหรือปฏิเสธคำขอ
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <img 
                    src={selectedRequest.slip_url} 
                    alt="สลิป" 
                    className="w-48 h-auto rounded border cursor-pointer"
                    onClick={() => setViewSlip(selectedRequest.slip_url)}
                  />
                  <div className="space-y-2">
                    <p><strong>จำนวนเงิน:</strong> ฿{selectedRequest.amount.toLocaleString()}</p>
                    <p><strong>ผู้ใช้:</strong> {selectedRequest.profiles?.full_name || selectedRequest.profiles?.email}</p>
                    <p><strong>วันที่:</strong> {new Date(selectedRequest.created_at).toLocaleString("th-TH")}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">หมายเหตุ (ถ้ามี)</label>
                  <Textarea
                    placeholder="เพิ่มหมายเหตุสำหรับผู้ใช้..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={processing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                ปฏิเสธ
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                อนุมัติ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Slip Dialog */}
        <Dialog open={!!viewSlip} onOpenChange={() => setViewSlip(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>สลิปโอนเงิน</DialogTitle>
            </DialogHeader>
            {viewSlip && (
              <img 
                src={viewSlip} 
                alt="สลิป" 
                className="w-full h-auto rounded"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default TopupRequests;
