import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Ban, VolumeX, UserX, Loader2, RefreshCw } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
  artist_profile?: {
    artist_name: string;
  };
}

interface MutedUser {
  id: string;
  muted_id: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
  artist_profile?: {
    artist_name: string;
  };
}

export default function PrivacySettings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("blocked");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchBlockedUsers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithProfiles = await Promise.all(
        (data || []).map(async (block) => {
          const [profileRes, artistRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, avatar_url, email')
              .eq('id', block.blocked_id)
              .maybeSingle(),
            supabase
              .from('artist_profiles')
              .select('artist_name')
              .eq('user_id', block.blocked_id)
              .maybeSingle()
          ]);

          return {
            ...block,
            profile: profileRes.data,
            artist_profile: artistRes.data
          };
        })
      );

      setBlockedUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  };

  const fetchMutedUsers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_mutes')
        .select('*')
        .eq('muter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithProfiles = await Promise.all(
        (data || []).map(async (mute) => {
          const [profileRes, artistRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, avatar_url, email')
              .eq('id', mute.muted_id)
              .maybeSingle(),
            supabase
              .from('artist_profiles')
              .select('artist_name')
              .eq('user_id', mute.muted_id)
              .maybeSingle()
          ]);

          return {
            ...mute,
            profile: profileRes.data,
            artist_profile: artistRes.data
          };
        })
      );

      setMutedUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching muted users:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchBlockedUsers(), fetchMutedUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleUnblock = async (blockedId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(b => b.blocked_id !== blockedId));
      toast({
        title: "ยกเลิกบล็อกแล้ว",
        description: "ผู้ใช้นี้ถูกยกเลิกบล็อกแล้ว"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกบล็อกได้"
      });
    }
  };

  const handleUnmute = async (mutedId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_mutes')
        .delete()
        .eq('muter_id', user.id)
        .eq('muted_id', mutedId);

      if (error) throw error;

      setMutedUsers(prev => prev.filter(m => m.muted_id !== mutedId));
      toast({
        title: "ยกเลิกปิดเสียงแล้ว",
        description: "ผู้ใช้นี้ถูกยกเลิกปิดเสียงแล้ว"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกปิดเสียงได้"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-serif text-2xl font-bold md:text-3xl">
                  ตั้งค่าความเป็นส่วนตัว
                </h1>
                <p className="text-muted-foreground mt-1">
                  จัดการผู้ใช้ที่ถูกบล็อกและปิดเสียง
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="blocked" className="flex items-center gap-2">
                  <Ban className="h-4 w-4" />
                  บล็อก ({blockedUsers.length})
                </TabsTrigger>
                <TabsTrigger value="muted" className="flex items-center gap-2">
                  <VolumeX className="h-4 w-4" />
                  ปิดเสียง ({mutedUsers.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="blocked">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ban className="h-5 w-5 text-destructive" />
                      ผู้ใช้ที่ถูกบล็อก
                    </CardTitle>
                    <CardDescription>
                      ผู้ใช้เหล่านี้จะไม่สามารถเห็นโพสต์ของคุณ และคุณจะไม่เห็นโพสต์ของพวกเขา
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : blockedUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">ยังไม่มีผู้ใช้ที่ถูกบล็อก</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {blockedUsers.map((blocked) => (
                          <div
                            key={blocked.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <Link
                              to={`/profile/${blocked.blocked_id}`}
                              className="flex items-center gap-3 hover:opacity-80"
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={blocked.profile?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {(blocked.artist_profile?.artist_name || blocked.profile?.full_name || "U")[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {blocked.artist_profile?.artist_name || blocked.profile?.full_name || blocked.profile?.email || "ผู้ใช้"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  บล็อกเมื่อ {formatDate(blocked.created_at)}
                                </p>
                              </div>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnblock(blocked.blocked_id)}
                            >
                              ยกเลิกบล็อก
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="muted">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <VolumeX className="h-5 w-5 text-orange-500" />
                      ผู้ใช้ที่ถูกปิดเสียง
                    </CardTitle>
                    <CardDescription>
                      คุณจะไม่เห็นโพสต์และความคิดเห็นจากผู้ใช้เหล่านี้ในฟีดของคุณ
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : mutedUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <VolumeX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">ยังไม่มีผู้ใช้ที่ถูกปิดเสียง</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mutedUsers.map((muted) => (
                          <div
                            key={muted.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <Link
                              to={`/profile/${muted.muted_id}`}
                              className="flex items-center gap-3 hover:opacity-80"
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={muted.profile?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {(muted.artist_profile?.artist_name || muted.profile?.full_name || "U")[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {muted.artist_profile?.artist_name || muted.profile?.full_name || muted.profile?.email || "ผู้ใช้"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ปิดเสียงเมื่อ {formatDate(muted.created_at)}
                                </p>
                              </div>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnmute(muted.muted_id)}
                            >
                              ยกเลิกปิดเสียง
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
