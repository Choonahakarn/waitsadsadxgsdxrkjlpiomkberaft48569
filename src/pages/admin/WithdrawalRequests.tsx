import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownToLine, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const WithdrawalRequests = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin, filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดรายการได้",
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
      // Deduct from user's wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", selectedRequest.user_id)
        .single();

      if (!wallet || wallet.balance < selectedRequest.amount) {
        toast({
          title: "ยอดเงินไม่เพียงพอ",
          description: "ผู้ใช้มียอดเงินไม่เพียงพอสำหรับการถอน",
          variant: "destructive",
        });
        return;
      }

      // Update wallet balance
      await supabase
        .from("wallets")
        .update({ balance: wallet.balance - selectedRequest.amount })
        .eq("id", wallet.id);

      // Create transaction record
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        type: "withdrawal",
        amount: -selectedRequest.amount,
        description: `ถอนเงินไปยัง ${selectedRequest.bank_name} ${selectedRequest.bank_account_number}`,
        reference_id: selectedRequest.id,
      });

      // Update request status
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      // Send notification
      await supabase.from("notifications").insert({
        user_id: selectedRequest.user_id,
        title: "การถอนเงินสำเร็จ ✅",
        message: `คำขอถอนเงิน ฿${selectedRequest.amount.toLocaleString()} ได้รับการอนุมัติแล้ว`,
        type: "success",
        reference_id: selectedRequest.id,
      });

      toast({
        title: "อนุมัติสำเร็จ",
        description: "การถอนเงินได้รับการอนุมัติแล้ว",
      });

      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
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
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          admin_notes: adminNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      // Send notification
      await supabase.from("notifications").insert({
        user_id: selectedRequest.user_id,
        title: "การถอนเงินถูกปฏิเสธ ❌",
        message: `คำขอถอนเงิน ฿${selectedRequest.amount.toLocaleString()} ไม่ได้รับการอนุมัติ${adminNotes ? ` - ${adminNotes}` : ""}`,
        type: "error",
        reference_id: selectedRequest.id,
      });

      toast({
        title: "ปฏิเสธคำขอ",
        description: "คำขอถอนเงินถูกปฏิเสธแล้ว",
      });

      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            รอดำเนินการ
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            อนุมัติแล้ว
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            ปฏิเสธ
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (authLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ArrowDownToLine className="h-8 w-8" />
              จัดการคำขอถอนเงิน
            </h1>
            {filter === "pending" && pendingCount > 0 && (
              <p className="text-muted-foreground mt-1">
                มี {pendingCount} คำขอรอดำเนินการ
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("pending")}
            >
              รอดำเนินการ
            </Button>
            <Button
              variant={filter === "approved" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("approved")}
            >
              อนุมัติแล้ว
            </Button>
            <Button
              variant={filter === "rejected" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("rejected")}
            >
              ปฏิเสธ
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              ทั้งหมด
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>รายการคำขอถอนเงิน</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ไม่มีคำขอ
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผู้ใช้</TableHead>
                    <TableHead>จำนวน</TableHead>
                    <TableHead>ธนาคาร</TableHead>
                    <TableHead>เลขบัญชี</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <p className="font-medium text-sm">
                          {req.bank_account_name}
                        </p>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        ฿{Number(req.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{req.bank_name}</TableCell>
                      <TableCell>
                        <div>
                          <p>{req.bank_account_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {req.bank_account_name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(req.created_at), "d MMM yy HH:mm", {
                          locale: th,
                        })}
                      </TableCell>
                      <TableCell>
                        {req.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(req);
                              setAdminNotes("");
                            }}
                          >
                            ตรวจสอบ
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ตรวจสอบคำขอถอนเงิน</DialogTitle>
              <DialogDescription>
                ตรวจสอบและอนุมัติหรือปฏิเสธคำขอ
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">จำนวนเงิน</span>
                    <span className="font-bold text-primary text-xl">
                      ฿{Number(selectedRequest.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ธนาคาร</span>
                    <span>{selectedRequest.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">เลขบัญชี</span>
                    <span>{selectedRequest.bank_account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ชื่อบัญชี</span>
                    <span>{selectedRequest.bank_account_name}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">หมายเหตุ Admin</label>
                  <Textarea
                    placeholder="เพิ่มหมายเหตุ (ถ้ามี)..."
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
      </div>
    </Layout>
  );
};

export default WithdrawalRequests;
