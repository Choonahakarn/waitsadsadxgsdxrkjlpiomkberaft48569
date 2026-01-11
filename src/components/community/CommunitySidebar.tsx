import { useState, useEffect } from "react";
import { MessageCircle, ChevronRight, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import OptimizedImage from "@/components/ui/OptimizedImage";

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
    avatar_url?: string | null;
  };
}

interface TagCount {
  tag: string;
  count: number;
}

interface CommunitySidebarProps {
  selectedTag?: string | null;
  selectedCategory?: string | null;
  onTagSelect?: (tag: string | null) => void;
  onCategorySelect?: (category: string | null) => void;
}

const categories = [
  { name: "ภาพวาดดิจิทัล" },
  { name: "ภาพวาดสีน้ำมัน" },
  { name: "ภาพวาดสีน้ำ" },
  { name: "ภาพประกอบ" },
  { name: "คาแรคเตอร์ดีไซน์" },
  { name: "แฟนอาร์ต" },
  { name: "งานปั้น 3D" },
];

export function CommunitySidebar({ 
  selectedTag, 
  selectedCategory, 
  onTagSelect, 
  onCategorySelect 
}: CommunitySidebarProps) {
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [trendingTags, setTrendingTags] = useState<TagCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<{ [key: string]: number }>({});
  const [showAllTags, setShowAllTags] = useState(false);

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
              .select('artist_name, is_verified, avatar_url')
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
              .select('artist_name, is_verified, avatar_url')
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
      // Fetch ALL posts to get all-time popular hashtags
      const { data } = await supabase
        .from('community_posts')
        .select('hashtags')
        .not('hashtags', 'is', null);

      if (data) {
        const tagCounts: { [key: string]: number } = {};
        
        data.forEach(post => {
          if (post.hashtags && Array.isArray(post.hashtags)) {
            post.hashtags.forEach((tag: string) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }
        });

        const sortedTags = Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

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

  // Helper function to normalize avatar URL
  const normalizeAvatarUrl = (avatarUrl: string | null | undefined, size: number = 64): string | undefined => {
    if (!avatarUrl) return undefined;
    
    // If it's already a full URL, add transform parameters for the specified size
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      // Check if it's a Cloudinary URL
      if (avatarUrl.includes('res.cloudinary.com')) {
        try {
          const urlObj = new URL(avatarUrl);
          const pathParts = urlObj.pathname.split('/');
          const uploadIndex = pathParts.indexOf('upload');
          
          if (uploadIndex !== -1 && uploadIndex < pathParts.length - 1) {
            const afterUpload = pathParts.slice(uploadIndex + 1).join('/');
            const cloudName = pathParts[1]; // After empty string and before 'image'
            const baseUrl = `${urlObj.protocol}//res.cloudinary.com/${cloudName}/image/upload`;
            const parts = afterUpload.split('/');
            const publicId = parts[0].includes('w_') && parts.length > 1 
              ? parts.slice(1).join('/') 
              : afterUpload;
            
            return `${baseUrl}/w_${size},h_${size},c_limit,f_auto,q_auto/${publicId}`;
          }
        } catch (e) {
          console.warn('Failed to parse Cloudinary URL:', e);
        }
      }
      
      // For other URLs (Supabase storage or other), use query parameters
      const url = new URL(avatarUrl);
      // Remove existing transform parameters first
      url.searchParams.delete('width');
      url.searchParams.delete('height');
      url.searchParams.delete('resize');
      url.searchParams.delete('quality');
      // Add size transform parameters
      url.searchParams.set('width', size.toString());
      url.searchParams.set('height', size.toString());
      url.searchParams.set('resize', 'cover');
      return url.toString();
    }
    
    // If it's a Supabase storage path, construct the public URL with transform
    // Format could be: avatars/user_id/filename.jpg or user_id/filename.jpg
    let storagePath = avatarUrl;
    if (avatarUrl.startsWith('avatars/')) {
      storagePath = avatarUrl.replace('avatars/', '');
    }
    
    // Get public URL from Supabase storage
    try {
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(storagePath);
      
      // Add transform parameters as query string
      const url = new URL(publicUrl);
      url.searchParams.set('width', size.toString());
      url.searchParams.set('height', size.toString());
      url.searchParams.set('resize', 'cover');
      
      return url.toString();
    } catch (error) {
      console.error('Error normalizing avatar URL:', error, avatarUrl);
      // Fallback: return original URL if normalization fails
      return avatarUrl;
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
          <h3 className="font-semibold">โพสต์ล่าสุด</h3>
        </div>
        <div className="space-y-3">
          {latestPosts.map((post) => (
            <div key={post.id} className="flex gap-3 group cursor-pointer">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage 
                  src={
                    // Priority: Use avatar_url from artist_profiles if available, otherwise use from profiles
                    post.artist_profile?.avatar_url 
                      ? normalizeAvatarUrl(post.artist_profile.avatar_url)
                      : normalizeAvatarUrl(post.user_profile?.avatar_url)
                  } 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
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
                <OptimizedImage
                  src={post.image_url}
                  alt=""
                  variant="thumbnail"
                  className="rounded"
                  containerClassName="w-10 h-10 shrink-0"
                  aspectRatio="square"
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
          <h3 className="font-semibold">ยอดนิยม</h3>
        </div>
        <div className="space-y-3">
          {popularPosts.map((post) => (
            <div key={post.id} className="flex gap-3 group cursor-pointer">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage 
                  src={
                    // Priority: Use avatar_url from artist_profiles if available, otherwise use from profiles
                    post.artist_profile?.avatar_url 
                      ? normalizeAvatarUrl(post.artist_profile.avatar_url)
                      : normalizeAvatarUrl(post.user_profile?.avatar_url)
                  } 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">แท็กยอดนิยม</h3>
          </div>
          {selectedTag && (
            <button
              onClick={() => onTagSelect?.(null)}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              ล้าง
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {trendingTags.slice(0, showAllTags ? 15 : 5).map((tag) => (
            <button
              key={tag.tag}
              onClick={() => onTagSelect?.(selectedTag === tag.tag ? null : tag.tag)}
              className={`w-full text-left py-1.5 transition-colors ${
                selectedTag === tag.tag 
                  ? 'text-primary' 
                  : 'text-foreground/80 hover:text-primary'
              }`}
            >
              <span className="text-sm">#{tag.tag}</span>
            </button>
          ))}
          {trendingTags.length === 0 && (
            <p className="text-sm text-muted-foreground py-1.5">ยังไม่มี Tags</p>
          )}
        </div>
        {trendingTags.length > 5 && (
          <button 
            onClick={() => setShowAllTags(!showAllTags)}
            className="text-primary text-sm mt-2 hover:underline transition-colors"
          >
            {showAllTags ? 'แสดงน้อยลง' : 'ดูเพิ่มเติม'}
          </button>
        )}
      </div>

      {/* Artwork Categories */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">หมวดหมู่ผลงาน</h3>
          </div>
          {selectedCategory && (
            <button
              onClick={() => onCategorySelect?.(null)}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              ล้าง
            </button>
          )}
        </div>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => onCategorySelect?.(selectedCategory === cat.name ? null : cat.name)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center group ${
                selectedCategory === cat.name 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
            >
              <span className={`text-sm ${selectedCategory !== cat.name ? 'group-hover:text-primary' : ''} transition-colors`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
