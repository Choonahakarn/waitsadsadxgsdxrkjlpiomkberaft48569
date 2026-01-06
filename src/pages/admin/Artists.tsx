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
import { ArrowLeft, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface ArtistProfile {
  id: string;
  user_id: string;
  artist_name: string;
  specialty: string | null;
  tools_used: string[] | null;
  is_verified: boolean;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

const AdminArtists = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      .order('created_at', { ascending: false });

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
      
      setArtists(combined as ArtistProfile[]);
    } else {
      setArtists([]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

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
                  จัดการศิลปิน
                </h1>
                <p className="mt-1 text-muted-foreground">
                  ศิลปินทั้งหมด {artists.length} คน
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
                <CardTitle>รายชื่อศิลปิน</CardTitle>
                <CardDescription>ดูโปรไฟล์ศิลปินทั้งหมด</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : artists.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    ยังไม่มีศิลปินในระบบ
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อศิลปิน</TableHead>
                        <TableHead>อีเมล</TableHead>
                        <TableHead>ความเชี่ยวชาญ</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>วันที่สมัคร</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {artists.map((artist) => (
                        <TableRow key={artist.id}>
                          <TableCell className="font-medium">
                            {artist.artist_name}
                          </TableCell>
                          <TableCell>{artist.profiles?.email || '-'}</TableCell>
                          <TableCell>{artist.specialty || '-'}</TableCell>
                          <TableCell>
                            {artist.is_verified ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                ยืนยันแล้ว
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="mr-1 h-3 w-3" />
                                ยังไม่ยืนยัน
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(artist.created_at).toLocaleDateString('th-TH')}
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

export default AdminArtists;
