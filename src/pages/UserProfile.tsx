import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, UserCheck, Grid3X3, LayoutGrid, ExternalLink, MapPin } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
}

interface ArtistProfileData {
  id: string;
  artist_name: string;
  bio: string | null;
  avatar_url: string | null;
  specialty: string | null;
  is_verified: boolean;
  portfolio_url: string | null;
  tools_used: string[] | null;
}

interface Artwork {
  id: string;
  title: string;
  image_url: string;
  price: number;
  is_sold: boolean;
}

interface CommunityPost {
  id: string;
  title: string;
  image_url: string;
  likes_count: number;
  created_at: string;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfileData | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("portfolio");

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      setProfile(profileData);

      // Fetch artist profile if exists
      const { data: artistData } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      setArtistProfile(artistData);

      // If artist, fetch their artworks
      if (artistData) {
        const { data: artworksData } = await supabase
          .from('artworks')
          .select('id, title, image_url, price, is_sold')
          .eq('artist_id', artistData.id)
          .order('created_at', { ascending: false });
        
        setArtworks(artworksData || []);
      }

      // Fetch community posts
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('id, title, image_url, likes_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      setPosts(postsData || []);

      // Fetch followers count
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);
      
      setFollowersCount(followers || 0);

      // Fetch following count
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
      
      setFollowingCount(following || 0);

      // Check if current user is following
      if (user && user.id !== userId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        
        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "กรุณาเข้าสู่ระบบ",
        description: "เข้าสู่ระบบเพื่อติดตามผู้ใช้"
      });
      return;
    }

    if (!userId || user.id === userId) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId });
        
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const displayName = artistProfile?.artist_name || profile?.full_name || 'ผู้ใช้';
  const displayAvatar = artistProfile?.avatar_url || profile?.avatar_url;
  const displayBio = artistProfile?.bio || profile?.bio;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col items-center gap-4 mb-8">
              <Skeleton className="w-24 h-24 rounded-full" />
              <Skeleton className="w-48 h-6" />
              <Skeleton className="w-32 h-4" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">ไม่พบผู้ใช้</h1>
            <p className="text-muted-foreground">ผู้ใช้นี้อาจไม่มีอยู่หรือถูกลบไปแล้ว</p>
            <Link to="/community">
              <Button className="mt-4">กลับไปหน้า Community</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Profile Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center mb-8"
          >
            <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-lg">
              <AvatarImage src={displayAvatar || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl bg-primary/10">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {artistProfile?.is_verified && <VerificationBadge />}
            </div>

            {displayBio && (
              <p className="text-muted-foreground max-w-md mb-3">{displayBio}</p>
            )}

            {artistProfile?.specialty && (
              <Badge variant="secondary" className="mb-3">
                {artistProfile.specialty}
              </Badge>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <span className="font-bold">{followingCount}</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </div>
              <div className="text-center">
                <span className="font-bold">{followersCount}</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </div>
            </div>

            {/* Follow Button */}
            {user && user.id !== userId && (
              <Button
                onClick={handleFollow}
                variant={isFollowing ? "outline" : "default"}
                className="min-w-[120px]"
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
            )}

            {/* External Links */}
            {(artistProfile?.portfolio_url || profile?.website) && (
              <div className="flex items-center gap-2 mt-3">
                {artistProfile?.portfolio_url && (
                  <a 
                    href={artistProfile.portfolio_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Portfolio
                  </a>
                )}
                {profile?.website && (
                  <a 
                    href={profile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Website
                  </a>
                )}
              </div>
            )}
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-6">
              <TabsTrigger value="portfolio" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Portfolio
              </TabsTrigger>
              <TabsTrigger value="posts" className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                All Posts
              </TabsTrigger>
            </TabsList>

            {/* Portfolio Tab */}
            <TabsContent value="portfolio">
              <AnimatePresence mode="wait">
                {artworks.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1"
                  >
                    {artworks.map((artwork) => (
                      <Link key={artwork.id} to={`/artwork/${artwork.id}`}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="aspect-square relative group overflow-hidden bg-muted"
                        >
                          <img
                            src={artwork.image_url}
                            alt={artwork.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-white text-center p-2">
                              <p className="font-medium text-sm line-clamp-2">{artwork.title}</p>
                              <p className="text-xs mt-1">฿{artwork.price.toLocaleString()}</p>
                            </div>
                          </div>
                          {artwork.is_sold && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="destructive" className="text-xs">ขายแล้ว</Badge>
                            </div>
                          )}
                        </motion.div>
                      </Link>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">ยังไม่มีผลงานใน Portfolio</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* All Posts Tab */}
            <TabsContent value="posts">
              <AnimatePresence mode="wait">
                {posts.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1"
                  >
                    {posts.map((post) => (
                      <Link key={post.id} to={`/community?post=${post.id}`}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="aspect-square relative group overflow-hidden bg-muted"
                        >
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-white text-center p-2">
                              <p className="font-medium text-sm line-clamp-2">{post.title}</p>
                              <p className="text-xs mt-1">❤️ {post.likes_count || 0}</p>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <Grid3X3 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">ยังไม่มีโพสต์</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}