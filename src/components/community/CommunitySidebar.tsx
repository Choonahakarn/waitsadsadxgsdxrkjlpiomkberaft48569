import { useState, useEffect } from "react";
import { MessageCircle, TrendingUp, Hash, Palette, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Post {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  likes_count: number;
  comments_count: number;
  user_id: string;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  artist_profile?: {
    artist_name: string;
    is_verified: boolean;
  };
}

interface TagCount {
  tag: string;
  count: number;
}

const categories = [
  { name: "ภาพวาดดิจิทัล", icon: "🎨", count: 0 },
  { name: "ภาพวาดสีน้ำมัน", icon: "🖼️", count: 0 },
  { name: "ภาพวาดสีน้ำ", icon: "💧", count: 0 },
  { name: "ภาพประกอบ", icon: "✏️", count: 0 },
  { name: "คาแรคเตอร์ดีไซน์", icon: "👤", count: 0 },
  { name: "แฟนอาร์ต", icon: "⭐", count: 0 },
  { name: "งานปั้น 3D", icon: "🎮", count: 0 },
];

export function CommunitySidebar() {
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [trendingTags, setTrendingTags] = useState<TagCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchLatestPosts();
    fetchPopularPosts();
    fetchTrendingTags();
    fetchCategoryCounts();
  }, []);

  const fetchLatestPosts = async () => {
    try {
      const { data } = await supabase
        .from('community_posts')
        .select('id, title, description, image_url, likes_count, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        const postsWithProfiles = await Promise.all(
          data.map(async (post) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', post.user_id)
              .maybeSingle();

            const { data: artist } = await supabase
              .from('artist_profiles')
              .select('artist_name, is_verified')
              .eq('user_id', post.user_id)
              .maybeSingle();

            const { count } = await supabase
              .from('community_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id);

            return {
              ...post,
              user_profile: profile,
              artist_profile: artist,
              comments_count: count || 0
            };
          })
        );
        setLatestPosts(postsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching latest posts:', error);
    }
  };

  const fetchPopularPosts = async () => {
    try {
      const { data } = await supabase
        .from('community_posts')
        .select('id, title, description, image_url, likes_count, user_id, created_at')
        .order('likes_count', { ascending: false })
        .limit(5);

      if (data) {
        const postsWithProfiles = await Promise.all(
          data.map(async (post) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', post.user_id)
              .maybeSingle();

            const { data: artist } = await supabase
              .from('artist_profiles')
              .select('artist_name, is_verified')
              .eq('user_id', post.user_id)
              .maybeSingle();

            const { count } = await supabase
              .from('community_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id);

            return {
              ...post,
              user_profile: profile,
              artist_profile: artist,
              comments_count: count || 0
            };
          })
        );
        setPopularPosts(postsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching popular posts:', error);
    }
  };

  const fetchTrendingTags = async () => {
    try {
      const { data } = await supabase
        .from('community_posts')
        .select('tools_used, category')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        const tagCounts: { [key: string]: number } = {};
        
        data.forEach(post => {
          if (post.category) {
            tagCounts[post.category] = (tagCounts[post.category] || 0) + 1;
          }
          if (post.tools_used) {
            post.tools_used.forEach((tool: string) => {
              tagCounts[tool] = (tagCounts[tool] || 0) + 1;
            });
          }
        });

        const sortedTags = Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        setTrendingTags(sortedTags);
      }
    } catch (error) {
      console.error('Error fetching trending tags:', error);
    }
  };

  const fetchCategoryCounts = async () => {
    try {
      const counts: { [key: string]: number } = {};
      
      await Promise.all(
        categories.map(async (cat) => {
          const { count } = await supabase
            .from('community_posts')
            .select('*', { count: 'exact', head: true })
            .eq('category', cat.name);
          counts[cat.name] = count || 0;
        })
      );
      
      setCategoryCounts(counts);
    } catch (error) {
      console.error('Error fetching category counts:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "เมื่อกี้";
    if (diffMins < 60) return `${diffMins}น.`;
    if (diffHours < 24) return `${diffHours}ชม.`;
    if (diffDays < 7) return `${diffDays}ว.`;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Latest Discussions */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">โพสต์ล่าสุด</h3>
        </div>
        <div className="space-y-3">
          {latestPosts.map((post) => (
            <div key={post.id} className="flex gap-3 group cursor-pointer">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={post.user_profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {(post.artist_profile?.artist_name || post.user_profile?.full_name || "U")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {post.artist_profile?.artist_name || post.user_profile?.full_name || "ผู้ใช้"}
                  </span>
                  <span className="text-xs text-muted-foreground">• {formatTimeAgo(post.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                  {post.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <MessageCircle className="h-3 w-3" />
                  <span>{post.comments_count}</span>
                </div>
              </div>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt=""
                  className="w-10 h-10 rounded object-cover shrink-0"
                />
              )}
            </div>
          ))}
        </div>
        <button className="text-primary text-sm mt-3 hover:underline flex items-center gap-1">
          ดูเพิ่มเติม <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Popular Posts */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold">ยอดนิยม</h3>
        </div>
        <div className="space-y-3">
          {popularPosts.map((post) => (
            <div key={post.id} className="flex gap-3 group cursor-pointer">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={post.user_profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {(post.artist_profile?.artist_name || post.user_profile?.full_name || "U")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {post.artist_profile?.artist_name || post.user_profile?.full_name || "ผู้ใช้"}
                  </span>
                  {post.artist_profile?.is_verified && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">
                      ✓
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                  {post.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <MessageCircle className="h-3 w-3" />
                  <span>{post.comments_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="text-primary text-sm mt-3 hover:underline flex items-center gap-1">
          ดูเพิ่มเติม <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Trending Tags */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="h-5 w-5 text-green-500" />
          <h3 className="font-semibold">แท็กยอดนิยม</h3>
        </div>
        <div className="space-y-2">
          {trendingTags.map((tag, index) => (
            <button
              key={tag.tag}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between group"
            >
              <span className="text-sm group-hover:text-primary transition-colors">
                #{tag.tag}
              </span>
              <span className="text-xs text-muted-foreground">
                {tag.count} โพสต์
              </span>
            </button>
          ))}
        </div>
        <button className="text-primary text-sm mt-3 hover:underline flex items-center gap-1">
          ดูเพิ่มเติม <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Artwork Categories */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold">หมวดหมู่ผลงาน</h3>
        </div>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.name}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <span>{cat.icon}</span>
                <span className="text-sm group-hover:text-primary transition-colors">
                  {cat.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {categoryCounts[cat.name] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
