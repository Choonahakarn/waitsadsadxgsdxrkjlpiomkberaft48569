import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingArtist {
  id: string;
  user_id: string;
  artist_name: string;
  specialty: string | null;
  verification_submitted_at: string | null;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

const AdminVerifications = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  const [pendingArtists, setPendingArtists] = useState<PendingArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, loading, isAdmin, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch artist profiles and profiles separately to avoid relation issues
    const { data: artistsData } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('is_verified', false)
      .order('verification_submitted_at', { ascending: true });

    if (artistsData && artistsData.length > 0) {
      const userIds = artistsData.map(a => a.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
      
      const combined = artistsData.map(artist => ({
        ...artist,
        profiles: profilesMap.get(artist.user_id) || null,
      }));
      
      setPendingArtists(combined as PendingArtist[]);
    } else {
      setPendingArtists([]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const handleVerify = async (artistId: string, approve: boolean) => {
    setProcessingId(artistId);
    
    const { error } = await supabase
      .from('artist_profiles')
      .update({ is_verified: approve })
      .eq('id', artistId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
      });
    } else {
      toast({
        title: approve ? 'อนุมัติสำเร็จ' : 'ปฏิเสธสำเร็จ',
        description: approve ? 'ศิลปินได้รับการยืนยันแล้ว' : 'ศิลปินถูกปฏิเสธ',
      });
      fetchData();
    }
    
    setProcessingId(null);
  };

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
                  การยืนยันตัวตน
                </h1>
                <p className="mt-1 text-muted-foreground">
                  รอการตรวจสอบ {pendingArtists.length} คน
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle>ศิลปินรอการยืนยัน</CardTitle>
                <CardDescription>ตรวจสอบและอนุมัติศิลปินใหม่</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : pendingArtists.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    ไม่มีศิลปินรอการยืนยัน
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อศิลปิน</TableHead>
                        <TableHead>อีเมล</TableHead>
                        <TableHead>ความเชี่ยวชาญ</TableHead>
                        <TableHead>วันที่ส่ง</TableHead>
                        <TableHead className="text-right">การดำเนินการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingArtists.map((artist) => (
                        <TableRow key={artist.id}>
                          <TableCell className="font-medium">
                            {artist.artist_name}
                          </TableCell>
                          <TableCell>{artist.profiles?.email || '-'}</TableCell>
                          <TableCell>{artist.specialty || '-'}</TableCell>
                          <TableCell>
                            {artist.verification_submitted_at
                              ? new Date(artist.verification_submitted_at).toLocaleDateString('th-TH')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => handleVerify(artist.id, true)}
                                disabled={processingId === artist.id}
                              >
                                <Check className="mr-1 h-4 w-4" />
                                อนุมัติ
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleVerify(artist.id, false)}
                                disabled={processingId === artist.id}
                              >
                                <X className="mr-1 h-4 w-4" />
                                ปฏิเสธ
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default AdminVerifications;
