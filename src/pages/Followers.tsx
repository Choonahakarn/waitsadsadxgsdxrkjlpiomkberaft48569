import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, UserCheck, UserMinus, Users, ArrowLeft, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  artist_name?: string;
  is_verified?: boolean;
  followers_count?: number;
  is_following?: boolean;
}

export default function Followers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("following");

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Fetch people I'm following
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];
      setFollowingSet(new Set(followingIds));

      // Fetch following profiles
      if (followingIds.length > 0) {
        const followingProfiles = await Promise.all(
          followingIds.map(async (userId) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', userId)
              .single();

            const { data: artistProfile } = await supabase
              .from('artist_profiles')
              .select('artist_name, is_verified')
              .eq('user_id', userId)
              .single();

            const { count } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', userId);

            return {
              id: profile?.id || userId,
              user_id: userId,
              full_name: profile?.full_name,
              avatar_url: profile?.avatar_url,
              artist_name: artistProfile?.artist_name,
              is_verified: artistProfile?.is_verified,
              followers_count: count || 0,
              is_following: true
            };
          })
        );
        setFollowing(followingProfiles);
      }

      // Fetch my followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);

      const followerIds = followersData?.map(f => f.follower_id) || [];

      if (followerIds.length > 0) {
        const followerProfiles = await Promise.all(
          followerIds.map(async (userId) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', userId)
              .single();

            const { data: artistProfile } = await supabase
              .from('artist_profiles')
              .select('artist_name, is_verified')
              .eq('user_id', userId)
              .single();

            const { count } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', userId);

            return {
              id: profile?.id || userId,
              user_id: userId,
              full_name: profile?.full_name,
              avatar_url: profile?.avatar_url,
              artist_name: artistProfile?.artist_name,
              is_verified: artistProfile?.is_verified,
              followers_count: count || 0,
              is_following: followingIds.includes(userId)
            };
          })
        );
        setFollowers(followerProfiles);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!user) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        setFollowingSet(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });

        // Remove from following list
        setFollowing(prev => prev.filter(p => p.user_id !== userId));

        // Update followers list
        setFollowers(prev => prev.map(p => 
          p.user_id === userId ? { ...p, is_following: false } : p
        ));

        toast({
          title: "เลิกติดตามแล้ว",
          description: "คุณได้เลิกติดตามผู้ใช้นี้"
        });
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId });

        setFollowingSet(prev => new Set(prev).add(userId));

        // Update followers list
        setFollowers(prev => prev.map(p => 
          p.user_id === userId ? { ...p, is_following: true } : p
        ));

        // Get profile for notification
        const { data: followerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const { data: artistProfile } = await supabase
          .from('artist_profiles')
          .select('artist_name')
          .eq('user_id', user.id)
          .single();

        const followerName = artistProfile?.artist_name || followerProfile?.full_name || 'ผู้ใช้';

        // Check if follower is muted by the user being followed
        const { data: isMuted } = await supabase
          .from('user_mutes')
          .select('id')
          .eq('muter_id', userId)
          .eq('muted_id', user.id)
          .maybeSingle();

        // Only send notification if not muted
        if (!isMuted) {
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              title: 'มีผู้ติดตามใหม่! 🎉',
              message: `${followerName} เริ่มติดตามคุณแล้ว`,
              type: 'follow',
              reference_id: user.id,
              actor_id: user.id
            });
        }

        toast({
          title: "ติดตามแล้ว! 🎉",
          description: "คุณจะเห็นผลงานใหม่ๆ จากผู้ใช้นี้"
        });

        // Refresh to update following list
        fetchData();
      }
    } catch (error) {
      console.error('Error following:', error);
    }
  };

  const handleRemoveFollower = async (userId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', user.id);

      setFollowers(prev => prev.filter(p => p.user_id !== userId));

      toast({
        title: "ลบผู้ติดตามแล้ว",
        description: "ผู้ใช้นี้จะไม่เห็นโพสต์ของคุณในฟีดติดตามอีกต่อไป"
      });
    } catch (error) {
      console.error('Error removing follower:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              ผู้ติดตาม
            </h1>
            <p className="text-sm text-muted-foreground">
              จัดการรายชื่อผู้ติดตามและคนที่คุณติดตาม
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="following" className="flex-1 gap-2">
              <Users className="h-4 w-4" />
              กำลังติดตาม
              <Badge variant="secondary" className="ml-1">
                {following.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="followers" className="flex-1 gap-2">
              <UserPlus className="h-4 w-4" />
              ผู้ติดตาม
              <Badge variant="secondary" className="ml-1">
                {followers.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="following" className="mt-6">
                {following.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">
                        คุณยังไม่ได้ติดตามใครเลย
                      </p>
                      <Button 
                        className="mt-4" 
                        onClick={() => navigate('/community')}
                      >
                        ค้นหาศิลปินในคอมมูนิตี้
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {following.map((profile, index) => (
                      <motion.div
                        key={profile.user_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card>
                          <CardContent className="flex items-center gap-4 p-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback>
                                {(profile.artist_name || profile.full_name || "U")[0]}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">
                                  {profile.artist_name || profile.full_name || "ผู้ใช้"}
                                </span>
                                {profile.is_verified && (
                                  <Badge variant="secondary" className="shrink-0 text-xs">
                                    ✓
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {profile.followers_count} ผู้ติดตาม
                              </p>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleFollow(profile.user_id, true)}
                            >
                              <UserMinus className="h-4 w-4" />
                              เลิกติดตาม
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="followers" className="mt-6">
                {followers.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">
                        ยังไม่มีผู้ติดตามคุณ
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        โพสต์ผลงานในคอมมูนิตี้เพื่อให้คนอื่นค้นพบคุณ!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {followers.map((profile, index) => (
                      <motion.div
                        key={profile.user_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card>
                          <CardContent className="flex items-center gap-4 p-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback>
                                {(profile.artist_name || profile.full_name || "U")[0]}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">
                                  {profile.artist_name || profile.full_name || "ผู้ใช้"}
                                </span>
                                {profile.is_verified && (
                                  <Badge variant="secondary" className="shrink-0 text-xs">
                                    ✓
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {profile.followers_count} ผู้ติดตาม
                              </p>
                            </div>

                            <div className="flex gap-2">
                              {followingSet.has(profile.user_id) ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleFollow(profile.user_id, true)}
                                >
                                  <UserCheck className="h-4 w-4" />
                                  ติดตามแล้ว
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleFollow(profile.user_id, false)}
                                >
                                  <UserPlus className="h-4 w-4" />
                                  ติดตามกลับ
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveFollower(profile.user_id)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
