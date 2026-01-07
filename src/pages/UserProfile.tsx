import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, UserCheck, Grid3X3, LayoutGrid, ExternalLink, Settings, Heart, MessageCircle, Bookmark, Share2, Repeat2, X, Send, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  description: string | null;
  image_url: string;
  likes_count: number;
  created_at: string;
  category: string | null;
  tools_used: string[] | null;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'เมื่อสักครู่';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
  return date.toLocaleDateString('th-TH');
};

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfileData | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("portfolio");
  
  // Comment dialog state
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Saved posts state
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  // Fetch saved posts for current user
  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user.id);
      
      if (data) {
        setSavedPosts(new Set(data.map(s => s.post_id)));
      }
    };
    fetchSavedPosts();
  }, [user]);

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

      // Fetch community posts with additional data
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('id, title, description, image_url, likes_count, created_at, category, tools_used')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // Fetch comments count and likes status for each post
      const postsWithDetails = await Promise.all(
        (postsData || []).map(async (post) => {
          const { count: commentsCount } = await supabase
            .from('community_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: likesCount } = await supabase
            .from('community_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          let isLiked = false;
          if (user) {
            const { data: likeData } = await supabase
              .from('community_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();
            isLiked = !!likeData;
          }

          return {
            ...post,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            is_liked: isLiked
          };
        })
      );
      
      setPosts(postsWithDetails);

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

  // Like handler
  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "กรุณาเข้าสู่ระบบ",
        description: "เข้าสู่ระบบเพื่อกดถูกใจ"
      });
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, is_liked: false, likes_count: Math.max(0, post.likes_count - 1) }
            : post
        ));
      } else {
        // Like
        await supabase
          .from('community_likes')
          .insert({ post_id: postId, user_id: user.id });

        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, is_liked: true, likes_count: post.likes_count + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  // Save handler
  const handleSave = async (postId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "กรุณาเข้าสู่ระบบ",
        description: "เข้าสู่ระบบเพื่อบันทึก"
      });
      return;
    }

    const isSaved = savedPosts.has(postId);

    try {
      if (isSaved) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        setSavedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        toast({ title: "ยกเลิกการบันทึกแล้ว" });
      } else {
        await supabase
          .from('saved_posts')
          .insert({ user_id: user.id, post_id: postId });

        setSavedPosts(prev => new Set(prev).add(postId));
        toast({ title: "บันทึกแล้ว ✓" });
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  // Share handler
  const handleShare = async (post: CommunityPost) => {
    const url = `${window.location.origin}/community?post=${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: `ดูผลงาน "${post.title}"`,
          url: url
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: "คัดลอกลิงก์แล้ว!",
        description: "ลิงก์โพสต์ถูกคัดลอกไปยังคลิปบอร์ด"
      });
    }
  };

  // Fetch comments
  const fetchComments = async (postId: string) => {
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', comment.user_id)
            .maybeSingle();
          return { ...comment, user_profile: profile };
        })
      );

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Open post dialog
  const handleOpenPost = (post: CommunityPost) => {
    setSelectedPost(post);
    fetchComments(post.id);
  };

  // Submit comment
  const handleSubmitComment = async () => {
    if (!user || !selectedPost || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: selectedPost.id,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      fetchComments(selectedPost.id);

      setPosts(posts.map(post =>
        post.id === selectedPost.id
          ? { ...post, comments_count: (post.comments_count || 0) + 1 }
          : post
      ));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message
      });
    } finally {
      setSubmittingComment(false);
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

            {/* Edit Profile Button (for own profile) */}
            {user && user.id === userId && (
              <Link to="/artist/edit-profile">
                <Button variant="outline" className="min-w-[120px]">
                  <Settings className="w-4 h-4 mr-2" />
                  แก้ไขโปรไฟล์
                </Button>
              </Link>
            )}

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

            {/* All Posts Tab - Feed Style */}
            <TabsContent value="posts">
              <AnimatePresence mode="wait">
                {posts.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-2xl mx-auto space-y-6"
                  >
                    {posts.map((post, index) => (
                      <motion.article
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-card border border-border rounded-xl overflow-hidden"
                      >
                        {/* Post Header */}
                        <div className="flex items-center gap-3 p-4">
                          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                            <AvatarImage src={displayAvatar || undefined} />
                            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{displayName}</span>
                              {artistProfile?.is_verified && (
                                <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">✓</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(post.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="px-4 pb-2">
                          <p className="text-foreground">{post.title}</p>
                          {post.description && (
                            <p className="text-muted-foreground text-sm mt-1">{post.description}</p>
                          )}
                        </div>

                        {/* Post Image */}
                        <div className="relative bg-muted">
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-full object-contain max-h-[600px]"
                            loading="lazy"
                          />
                        </div>

                        {/* Actions */}
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10"
                              onClick={() => handleLike(post.id, post.is_liked || false)}
                            >
                              <Heart 
                                className={`h-6 w-6 transition-colors ${
                                  post.is_liked 
                                    ? "fill-red-500 text-red-500" 
                                    : "text-foreground"
                                }`} 
                              />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10"
                              onClick={() => handleOpenPost(post)}
                            >
                              <MessageCircle className="h-6 w-6" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10"
                              onClick={() => navigate('/community')}
                            >
                              <Repeat2 className="h-6 w-6" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10"
                              onClick={() => handleShare(post)}
                            >
                              <Share2 className="h-6 w-6" />
                            </Button>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => handleSave(post.id)}
                          >
                            <Bookmark 
                              className={`h-6 w-6 transition-colors ${
                                savedPosts.has(post.id) ? "fill-foreground" : ""
                              }`} 
                            />
                          </Button>
                        </div>

                        {/* Likes count */}
                        <div className="px-4 pb-2">
                          <span className="font-semibold text-sm">
                            {post.likes_count.toLocaleString()} ถูกใจ
                          </span>
                        </div>

                        {/* View comments */}
                        {(post.comments_count || 0) > 0 && (
                          <div className="px-4 pb-2">
                            <button 
                              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                              onClick={() => handleOpenPost(post)}
                            >
                              ดูความคิดเห็นทั้งหมด {post.comments_count} รายการ
                            </button>
                          </div>
                        )}

                        {/* Tools/Tags */}
                        {post.tools_used && post.tools_used.length > 0 && (
                          <div className="px-4 pb-3 flex flex-wrap gap-1">
                            {post.tools_used.map((tool) => (
                              <Badge key={tool} variant="secondary" className="text-xs">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </motion.article>
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

      {/* Comment Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>ความคิดเห็น</DialogTitle>
          </DialogHeader>
          
          {selectedPost && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Post preview */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={displayAvatar || undefined} />
                    <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-semibold text-sm">{displayName}</span>
                    <p className="text-sm text-muted-foreground line-clamp-1">{selectedPost.title}</p>
                  </div>
                </div>
              </div>

              {/* Comments list */}
              <ScrollArea className="flex-1 p-4">
                {commentsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={comment.user_profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {(comment.user_profile?.full_name || "U")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-muted rounded-xl px-3 py-2">
                            <span className="font-semibold text-sm">
                              {comment.user_profile?.full_name || "ผู้ใช้"}
                            </span>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground ml-3">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    ยังไม่มีความคิดเห็น
                  </div>
                )}
              </ScrollArea>

              {/* Comment input */}
              {user ? (
                <div className="p-4 border-t flex gap-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder="เขียนความคิดเห็น..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[40px] max-h-[100px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || submittingComment}
                    >
                      {submittingComment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t text-center">
                  <Link to="/auth">
                    <Button variant="outline">เข้าสู่ระบบเพื่อแสดงความคิดเห็น</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}