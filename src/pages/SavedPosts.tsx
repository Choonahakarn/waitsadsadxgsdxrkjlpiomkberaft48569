import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, Heart, MessageCircle, Loader2, Trash2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SavedPost {
  id: string;
  post_id: string;
  created_at: string;
  post?: {
    id: string;
    title: string;
    description: string | null;
    image_url: string;
    category: string | null;
    likes_count: number;
    created_at: string;
    user_id: string;
  };
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  artist_profile?: {
    artist_name: string;
    is_verified: boolean;
  };
  comments_count?: number;
}

export default function SavedPosts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSavedPosts();
    }
  }, [user]);

  const fetchSavedPosts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: savedData, error } = await supabase
        .from('saved_posts')
        .select(`
          id,
          post_id,
          created_at,
          community_posts (
            id,
            title,
            description,
            image_url,
            category,
            likes_count,
            created_at,
            user_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // ✅ OPTIMIZED: Batch fetch all related data
      const posts = (savedData || []).map((s: any) => s.community_posts).filter(Boolean);
      const userIds = [...new Set(posts.map((p: any) => p.user_id))];
      const postIds = posts.map((p: any) => p.id);

      // Batch fetch profiles and artist profiles
      const [profilesResult, artistProfilesResult, commentsCountsResult] = await Promise.all([
        userIds.length > 0 ? supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds) : Promise.resolve({ data: [] }),
        
        userIds.length > 0 ? supabase
          .from('artist_profiles')
          .select('user_id, artist_name, is_verified')
          .in('user_id', userIds) : Promise.resolve({ data: [] }),
        
        postIds.length > 0 ? supabase
          .from('community_comments')
          .select('post_id')
          .in('post_id', postIds)
          .then(({ data }) => {
            const counts: Record<string, number> = {};
            (data || []).forEach(comment => {
              counts[comment.post_id] = (counts[comment.post_id] || 0) + 1;
            });
            return counts;
          }) : Promise.resolve({})
      ]);

      // Create lookup maps
      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p]));
      const artistProfilesMap = new Map((artistProfilesResult.data || []).map(a => [a.user_id, a]));

      // Map data in memory (fast)
      const postsWithDetails = (savedData || []).map((saved: any) => {
        const post = saved.community_posts;
        if (!post) return null;

        return {
          ...saved,
          post,
          user_profile: profilesMap.get(post.user_id),
          artist_profile: artistProfilesMap.get(post.user_id) || null,
          comments_count: commentsCountsResult[post.id] || 0
        };
      });

      setSavedPosts(postsWithDetails.filter(Boolean) as SavedPost[]);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (savedId: string) => {
    try {
      await supabase
        .from('saved_posts')
        .delete()
        .eq('id', savedId);
      
      setSavedPosts(prev => prev.filter(s => s.id !== savedId));
      toast({ title: "ยกเลิกการบันทึกแล้ว" });
    } catch (error) {
      console.error('Error unsaving:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return "วันนี้";
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH');
  };

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
          <Bookmark className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">กรุณาเข้าสู่ระบบ</h2>
          <p className="text-muted-foreground mb-6">
            เข้าสู่ระบบเพื่อดูโพสต์ที่บันทึกไว้
          </p>
          <Button asChild>
            <Link to="/auth">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">โพสต์ที่บันทึกไว้</h1>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
              <Bookmark className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">ยังไม่มีโพสต์ที่บันทึก</h3>
            <p className="text-muted-foreground mb-6">
              เริ่มบันทึกโพสต์ที่คุณชอบเพื่อดูในภายหลัง
            </p>
            <Button asChild>
              <Link to="/community">สำรวจคอมมูนิตี้</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedPosts.map((saved, index) => (
              <motion.article
                key={saved.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="flex">
                  {/* Image */}
                  <Link to={`/community?post=${saved.post?.id}`} className="shrink-0">
                    <img
                      src={saved.post?.image_url}
                      alt={saved.post?.title}
                      className="w-32 h-32 object-cover"
                    />
                  </Link>

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      {/* Author */}
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={saved.user_profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {(saved.artist_profile?.artist_name || saved.user_profile?.full_name || "U")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {saved.artist_profile?.artist_name || saved.user_profile?.full_name || "ผู้ใช้"}
                        </span>
                        {saved.artist_profile?.is_verified && (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">
                            ✓
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <Link to={`/community?post=${saved.post?.id}`}>
                        <h3 className="font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors">
                          {saved.post?.title}
                        </h3>
                      </Link>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {saved.post?.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {saved.comments_count || 0}
                        </span>
                        {saved.post?.category && (
                          <Badge variant="outline" className="text-xs">
                            {saved.post.category}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        บันทึกเมื่อ {formatTimeAgo(saved.created_at)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleUnsave(saved.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        ลบ
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
