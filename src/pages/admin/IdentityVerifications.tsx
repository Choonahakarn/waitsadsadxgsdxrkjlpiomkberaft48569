import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Check, X, UserCheck, Phone, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface PendingIdentity {
  id: string;
  user_id: string;
  artist_name: string;
  real_name: string | null;
  phone_number: string | null;
  identity_verified: boolean | null;
  is_verified: boolean | null;
  verification_submitted_at: string | null;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

const AdminIdentityVerifications = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [pendingArtists, setPendingArtists] = useState<PendingIdentity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, loading, isAdmin, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch artist profiles that have real_name and phone_number but not identity_verified
    const { data: artistsData } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('identity_verified', false)
      .not('real_name', 'is', null)
      .not('phone_number', 'is', null)
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
      
      setPendingArtists(combined as PendingIdentity[]);
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

  const handleVerifyIdentity = async (artistId: string, approve: boolean) => {
    setProcessingId(artistId);
    
    const { error } = await supabase
      .from('artist_profiles')
      .update({ identity_verified: approve })
      .eq('id', artistId);

    if (error) {
      toast({
        variant: 'destructive',
        title: t('admin.identity.error', 'เกิดข้อผิดพลาด'),
        description: error.message,
      });
    } else {
      toast({
        title: approve 
          ? t('admin.identity.approved', 'อนุมัติตัวตนสำเร็จ') 
          : t('admin.identity.rejected', 'ปฏิเสธตัวตนสำเร็จ'),
        description: approve 
          ? t('admin.identity.approvedDesc', 'ตัวตนของศิลปินได้รับการยืนยันแล้ว') 
          : t('admin.identity.rejectedDesc', 'ตัวตนของศิลปินถูกปฏิเสธ'),
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
                  {t('admin.identity.title', 'ยืนยันตัวตนศิลปิน')}
                </h1>
                <p className="mt-1 text-muted-foreground">
                  {t('admin.identity.pending', 'รอการตรวจสอบ')} {pendingArtists.length} {t('admin.identity.people', 'คน')}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {t('admin.identity.refresh', 'รีเฟรช')}
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
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  {t('admin.identity.cardTitle', 'ศิลปินรอยืนยันตัวตน')}
                </CardTitle>
                <CardDescription>
                  {t('admin.identity.cardDesc', 'ตรวจสอบชื่อจริงและเบอร์โทรของศิลปิน')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : pendingArtists.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t('admin.identity.noArtists', 'ไม่มีศิลปินรอยืนยันตัวตน')}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.identity.artistName', 'ชื่อศิลปิน')}</TableHead>
                        <TableHead>{t('admin.identity.realName', 'ชื่อจริง')}</TableHead>
                        <TableHead>{t('admin.identity.phoneNumber', 'เบอร์โทร')}</TableHead>
                        <TableHead>{t('admin.identity.email', 'อีเมล')}</TableHead>
                        <TableHead>{t('admin.identity.status', 'สถานะ')}</TableHead>
                        <TableHead className="text-right">{t('admin.identity.actions', 'การดำเนินการ')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingArtists.map((artist) => (
                        <TableRow key={artist.id}>
                          <TableCell className="font-medium">
                            {artist.artist_name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">{artist.real_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{artist.phone_number}</span>
                            </div>
                          </TableCell>
                          <TableCell>{artist.profiles?.email || '-'}</TableCell>
                          <TableCell>
                            {artist.is_verified ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                {t('admin.identity.verified', 'ยืนยันศิลปินแล้ว')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {t('admin.identity.notVerified', 'รอยืนยันศิลปิน')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => handleVerifyIdentity(artist.id, true)}
                                disabled={processingId === artist.id}
                              >
                                <Check className="mr-1 h-4 w-4" />
                                {t('admin.identity.approve', 'อนุมัติ')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleVerifyIdentity(artist.id, false)}
                                disabled={processingId === artist.id}
                              >
                                <X className="mr-1 h-4 w-4" />
                                {t('admin.identity.reject', 'ปฏิเสธ')}
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

export default AdminIdentityVerifications;
