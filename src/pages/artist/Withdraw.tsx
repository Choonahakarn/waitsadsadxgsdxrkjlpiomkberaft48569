import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Wallet, ArrowDownToLine, Building2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const BANKS = [
  "ธนาคารกรุงเทพ",
  "ธนาคารกสิกรไทย",
  "ธนาคารกรุงไทย",
  "ธนาคารไทยพาณิชย์",
  "ธนาคารกรุงศรีอยุธยา",
  "ธนาคารทหารไทยธนชาต",
  "ธนาคารออมสิน",
  "ธนาคารเกียรตินาคินภัทร",
  "ธนาคารซีไอเอ็มบีไทย",
  "ธนาคารยูโอบี",
];

interface WithdrawalRequest {
  id: string;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface BankInfo {
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
}

const Withdraw = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isArtist } = useAuth();
  const { toast } = useToast();

  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    bank_name: null,
    bank_account_number: null,
    bank_account_name: null,
  });
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

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
      // Get wallet balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      setBalance(wallet?.balance || 0);

      // Get artist bank info
      const { data: artist } = await supabase
        .from("artist_profiles")
        .select("bank_name, bank_account_number, bank_account_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (artist) {
        setBankInfo(artist);
        setBankName(artist.bank_name || "");
        setAccountNumber(artist.bank_account_number || "");
        setAccountName(artist.bank_account_name || "");
      }

      // Get withdrawal requests
      const { data: requestsData } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setRequests(requestsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveBankInfo = async () => {
    if (!user || !bankName || !accountNumber || !accountName) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบ",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("artist_profiles")
        .update({
          bank_name: bankName,
          bank_account_number: accountNumber,
          bank_account_name: accountName,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setBankInfo({
        bank_name: bankName,
        bank_account_number: accountNumber,
        bank_account_name: accountName,
      });

      toast({
        title: "บันทึกข้อมูลธนาคารสำเร็จ",
      });
    } catch (error) {
      console.error("Error saving bank info:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleWithdraw = async () => {
    if (!user || !bankInfo.bank_name) {
      toast({
        title: "กรุณาบันทึกข้อมูลธนาคารก่อน",
        variant: "destructive",
      });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({
        title: "กรุณาระบุจำนวนเงินที่ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > balance) {
      toast({
        title: "ยอดเงินไม่เพียงพอ",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount < 100) {
      toast({
        title: "ถอนขั้นต่ำ ฿100",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user.id,
        amount: withdrawAmount,
        bank_name: bankInfo.bank_name,
        bank_account_number: bankInfo.bank_account_number,
        bank_account_name: bankInfo.bank_account_name,
      });

      if (error) throw error;

      toast({
        title: "ส่งคำขอถอนเงินสำเร็จ",
        description: "รอ Admin ตรวจสอบและอนุมัติ",
      });

      setAmount("");
      fetchData();
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">รอดำเนินการ</Badge>;
      case "approved":
        return <Badge className="bg-green-500">อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="destructive">ปฏิเสธ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
            <ArrowDownToLine className="h-8 w-8 text-primary" />
            ถอนเงิน
          </h1>
          <p className="text-muted-foreground mt-1">
            ถอนเงินจากกระเป๋าเงินไปยังบัญชีธนาคาร
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Balance & Withdraw Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  ยอดเงินคงเหลือ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">
                  ฿{balance.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  ข้อมูลบัญชีธนาคาร
                </CardTitle>
                <CardDescription>
                  กรอกข้อมูลบัญชีที่ต้องการรับเงิน
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ธนาคาร</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกธนาคาร" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>เลขบัญชี</Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="xxx-x-xxxxx-x"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ชื่อบัญชี</Label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="ชื่อ-นามสกุล"
                  />
                </div>
                <Button onClick={saveBankInfo} variant="outline" className="w-full">
                  บันทึกข้อมูลธนาคาร
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ถอนเงิน</CardTitle>
                <CardDescription>ถอนขั้นต่ำ ฿100</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {bankInfo.bank_name ? (
                  <>
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <p className="font-medium">{bankInfo.bank_name}</p>
                      <p>{bankInfo.bank_account_number}</p>
                      <p>{bankInfo.bank_account_name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>จำนวนเงิน (บาท)</Label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        min={100}
                        max={balance}
                      />
                    </div>
                    <Button
                      onClick={handleWithdraw}
                      disabled={submitting || !amount}
                      className="w-full"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ArrowDownToLine className="h-4 w-4 mr-2" />
                      )}
                      ส่งคำขอถอนเงิน
                    </Button>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    กรุณาบันทึกข้อมูลธนาคารก่อนถอนเงิน
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Withdrawal History */}
          <Card>
            <CardHeader>
              <CardTitle>ประวัติการถอน</CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  ยังไม่มีประวัติการถอน
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>จำนวน</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>วันที่</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-semibold">
                          ฿{Number(req.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(req.created_at), "d MMM yy", {
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
      </div>
    </Layout>
  );
};

export default Withdraw;
