import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, RefreshCw, Eye, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string | null;
  description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reporter_profile?: {
    full_name: string | null;
    email: string;
  };
  reported_profile?: {
    full_name: string | null;
    email: string;
  };
}

const reasonLabels: Record<string, string> = {
  spam: "สแปมหรือโฆษณา",
  harassment: "คุกคามหรือรังแก",
  inappropriate_content: "เนื้อหาไม่เหมาะสม",
  impersonation: "แอบอ้างตัวตน",
  copyright: "ละเมิดลิขสิทธิ์",
  scam: "หลอกลวง/ฉ้อโกง",
  other: "อื่นๆ",
  user_report: "รายงานผู้ใช้"
};

const AdminReports = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, loading, isAdmin, navigate]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for reporters and reported users
      const reportsWithProfiles = await Promise.all(
        (data || []).map(async (report) => {
          const [reporterRes, reportedRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', report.reporter_id)
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', report.reported_id)
              .maybeSingle()
          ]);

          return {
            ...report,
            reporter_profile: reporterRes.data,
            reported_profile: reportedRes.data
          };
        })
      );

      setReports(reportsWithProfiles);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchReports();
    }
  }, [isAdmin]);

  const handleUpdateStatus = async (status: 'reviewed' | 'dismissed' | 'action_taken') => {
    if (!selectedReport || !user) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('user_reports')
        .update({
          status,
          admin_notes: adminNotes.trim() || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: `รายงานถูกอัปเดตเป็น "${getStatusLabel(status)}" แล้ว`
      });

      setSelectedReport(null);
      setAdminNotes("");
      fetchReports();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> รอดำเนินการ</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Eye className="w-3 h-3 mr-1" /> ตรวจสอบแล้ว</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30"><XCircle className="w-3 h-3 mr-1" /> ปิดรายงาน</Badge>;
      case 'action_taken':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> ดำเนินการแล้ว</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'รอดำเนินการ';
      case 'reviewed': return 'ตรวจสอบแล้ว';
      case 'dismissed': return 'ปิดรายงาน';
      case 'action_taken': return 'ดำเนินการแล้ว';
      default: return status;
    }
  };

  const filteredReports = reports.filter(report => {
    if (filterStatus === 'all') return true;
    return report.status === filterStatus;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  if (loading || !isAdmin) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                  จัดการรายงานผู้ใช้
                </h1>
                <p className="mt-1 text-muted-foreground">
                  รายงานทั้งหมด {reports.length} รายการ
                  {pendingCount > 0 && (
                    <span className="ml-2 text-yellow-600">({pendingCount} รอดำเนินการ)</span>
                  )}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchReports} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </motion.div>

          {/* Filter Tabs */}
          <div className="mt-6 flex gap-2 flex-wrap">
            {['all', 'pending', 'reviewed', 'action_taken', 'dismissed'].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all' ? 'ทั้งหมด' : getStatusLabel(status)}
                {status === 'pending' && pendingCount > 0 && (
                  <span className="ml-1 rounded-full bg-yellow-500 px-1.5 text-xs text-white">
                    {pendingCount}
                  </span>
                )}
              </Button>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>รายการรายงาน</CardTitle>
                <CardDescription>ดูและจัดการรายงานจากผู้ใช้</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : filteredReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    ไม่มีรายงานในหมวดนี้
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>วันที่</TableHead>
                          <TableHead>ผู้รายงาน</TableHead>
                          <TableHead>ผู้ถูกรายงาน</TableHead>
                          <TableHead>เหตุผล</TableHead>
                          <TableHead>สถานะ</TableHead>
                          <TableHead className="text-right">การดำเนินการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(report.created_at), 'd MMM yyyy HH:mm', { locale: th })}
                            </TableCell>
                            <TableCell>
                              <Link 
                                to={`/profile/${report.reporter_id}`}
                                className="hover:underline text-primary"
                              >
                                {report.reporter_profile?.full_name || report.reporter_profile?.email || 'ไม่ทราบ'}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link 
                                to={`/profile/${report.reported_id}`}
                                className="hover:underline text-primary"
                              >
                                {report.reported_profile?.full_name || report.reported_profile?.email || 'ไม่ทราบ'}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                <p className="font-medium text-sm">
                                  {reasonLabels[report.reason || ''] || report.reason || '-'}
                                </p>
                                {report.description && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {report.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(report.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setAdminNotes(report.admin_notes || "");
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                ดูรายละเอียด
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              รายละเอียดรายงาน
            </DialogTitle>
            <DialogDescription>
              รายงานเมื่อ {selectedReport && format(new Date(selectedReport.created_at), 'd MMMM yyyy HH:mm น.', { locale: th })}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">ผู้รายงาน</Label>
                  <Link 
                    to={`/profile/${selectedReport.reporter_id}`}
                    className="block font-medium hover:underline text-primary"
                  >
                    {selectedReport.reporter_profile?.full_name || selectedReport.reporter_profile?.email}
                  </Link>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">ผู้ถูกรายงาน</Label>
                  <Link 
                    to={`/profile/${selectedReport.reported_id}`}
                    className="block font-medium hover:underline text-primary"
                  >
                    {selectedReport.reported_profile?.full_name || selectedReport.reported_profile?.email}
                  </Link>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">เหตุผลในการรายงาน</Label>
                <p className="font-medium">
                  {reasonLabels[selectedReport.reason || ''] || selectedReport.reason || '-'}
                </p>
              </div>

              {selectedReport.description && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">รายละเอียดเพิ่มเติม</Label>
                  <p className="p-3 bg-muted rounded-lg text-sm">
                    {selectedReport.description}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">สถานะปัจจุบัน</Label>
                <div>{getStatusBadge(selectedReport.status)}</div>
              </div>

              {selectedReport.reviewed_at && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  ตรวจสอบเมื่อ: {format(new Date(selectedReport.reviewed_at), 'd MMM yyyy HH:mm', { locale: th })}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Label htmlFor="admin-notes">บันทึก Admin</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="เขียนบันทึกการดำเนินการ..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('reviewed')}
                  disabled={updating}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  ตรวจสอบแล้ว
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleUpdateStatus('action_taken')}
                  disabled={updating}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  ดำเนินการแล้ว
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleUpdateStatus('dismissed')}
                  disabled={updating}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  ปิดรายงาน
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminReports;
