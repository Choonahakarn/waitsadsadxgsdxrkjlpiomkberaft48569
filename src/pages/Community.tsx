import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Plus, Heart, MessageCircle, Image, Send, X, Loader2, UserPlus, UserCheck, Users, Globe, Search } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CommunityPost {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  tools_used: string[];
  category: string | null;
  likes_count: number;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  artist_profile?: {
    artist_name: string;
    is_verified: boolean;
  };
  is_liked?: boolean;
  is_following?: boolean;
  followers_count?: number;
  comments_count?: number;
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

const categories = [
  "ภาพวาดดิจิทัล",
  "ภาพวาดสีน้ำมัน",
  "ภาพวาดสีน้ำ",
  "ภาพวาดดินสอ",
  "ภาพประกอบ",
  "คาแรคเตอร์ดีไซน์",
  "แฟนอาร์ต",
  "ภาพถ่าย",
  "งานปั้น 3D",
  "อื่นๆ"
];

export default function Community() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [toolsUsed, setToolsUsed] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchPosts();
    if (user) {
      fetchFollowing();
    }
  }, [user]);

  const fetchFollowing = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      if (data) {
        setFollowingUsers(new Set(data.map(f => f.following_id)));
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles and likes
      const postsWithDetails = await Promise.all(
        (postsData || []).map(async (post) => {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', post.user_id)
            .single();

          // Get artist profile if exists
          const { data: artistProfile } = await supabase
            .from('artist_profiles')
            .select('artist_name, is_verified')
            .eq('user_id', post.user_id)
            .single();

          // Check if current user liked
          let isLiked = false;
          if (user) {
            const { data: like } = await supabase
              .from('community_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .single();
            isLiked = !!like;
          }

          // Get comments count
          const { count: commentsCount } = await supabase
            .from('community_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Get followers count for this user
          const { count: followersCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', post.user_id);

          return {
            ...post,
            user_profile: profile,
            artist_profile: artistProfile,
            is_liked: isLiked,
            is_following: followingUsers.has(post.user_id),
            followers_count: followersCount || 0,
            comments_count: commentsCount || 0
          };
        })
      );

      setPosts(postsWithDetails);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPost = async () => {
    if (!user || !title || !imageFile) {
      toast({
        variant: "destructive",
        title: "ข้อมูลไม่ครบ",
        description: "กรุณากรอกชื่อผลงานและอัปโหลดรูปภาพ"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Upload image
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('artworks')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artworks')
        .getPublicUrl(fileName);

      // Create post
      const { error: postError } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          image_url: urlData.publicUrl,
          category: category || null,
          tools_used: toolsUsed ? toolsUsed.split(',').map(t => t.trim()) : []
        });

      if (postError) throw postError;

      toast({
        title: "โพสต์สำเร็จ! 🎉",
        description: "ผลงานของคุณถูกเผยแพร่แล้ว"
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setToolsUsed("");
      setImageFile(null);
      setImagePreview("");
      setIsCreateOpen(false);
      fetchPosts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

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
        await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('community_likes')
          .insert({ post_id: postId, user_id: user.id });
      }

      // Update local state
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked: !isLiked,
            likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "กรุณาเข้าสู่ระบบ",
        description: "เข้าสู่ระบบเพื่อติดตามศิลปิน"
      });
      return;
    }

    if (user.id === userId) {
      return; // Can't follow yourself
    }

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId });
        
        setFollowingUsers(prev => new Set(prev).add(userId));

        // Get follower's profile name for notification
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

        // Send notification to followed user
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'มีผู้ติดตามใหม่! 🎉',
            message: `${followerName} เริ่มติดตามคุณแล้ว`,
            type: 'follow',
            reference_id: user.id
          });
      }

      // Update local posts state
      setPosts(posts.map(post => {
        if (post.user_id === userId) {
          return {
            ...post,
            is_following: !isFollowing,
            followers_count: isFollowing 
              ? (post.followers_count || 1) - 1 
              : (post.followers_count || 0) + 1
          };
        }
        return post;
      }));

      toast({
        title: isFollowing ? "เลิกติดตามแล้ว" : "ติดตามแล้ว! 🎉",
        description: isFollowing ? "คุณได้เลิกติดตามศิลปินนี้" : "คุณจะเห็นผลงานใหม่ๆ จากศิลปินนี้"
      });
    } catch (error) {
      console.error('Error following:', error);
    }
  };

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
            .single();
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

  const handleOpenComments = (post: CommunityPost) => {
    setSelectedPost(post);
    fetchComments(post.id);
  };

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
      
      // Update comments count
      setPosts(posts.map(post => {
        if (post.id === selectedPost.id) {
          return { ...post, comments_count: (post.comments_count || 0) + 1 };
        }
        return post;
      }));
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

  // Realtime subscription for comments
  useEffect(() => {
    if (!selectedPost) return;

    const channel = supabase
      .channel('community-comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_comments',
          filter: `post_id=eq.${selectedPost.id}`
        },
        () => {
          fetchComments(selectedPost.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPost]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              🎨 คอมมูนิตี้
            </h1>
            <p className="mt-2 text-muted-foreground">
              แบ่งปันผลงานศิลปะ พูดคุย และแลกเปลี่ยนความคิดเห็นกับศิลปินคนอื่นๆ
            </p>
          </div>
          
          {user && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  โพสต์ผลงาน
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>โพสต์ผลงานใหม่</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">ชื่อผลงาน *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="ตั้งชื่อผลงานของคุณ"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">คำอธิบาย</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="เล่าเรื่องราวเบื้องหลังผลงาน..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">หมวดหมู่</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกหมวดหมู่" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="tools">เครื่องมือที่ใช้</Label>
                    <Input
                      id="tools"
                      value={toolsUsed}
                      onChange={(e) => setToolsUsed(e.target.value)}
                      placeholder="เช่น Procreate, Photoshop, สีน้ำ (คั่นด้วย ,)"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="image">รูปภาพ *</Label>
                    <div className="mt-2">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-48 w-full rounded-lg object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute right-2 top-2"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary">
                          <Image className="h-8 w-8 text-muted-foreground" />
                          <span className="mt-2 text-sm text-muted-foreground">
                            คลิกเพื่ออัปโหลดรูปภาพ
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleSubmitPost}
                    disabled={submitting || !title || !imageFile}
                    className="w-full"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังโพสต์...
                      </>
                    ) : (
                      "โพสต์ผลงาน"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหาผลงานหรือศิลปิน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Feed Filter Tabs */}
        {user && (
          <Tabs value={feedFilter} onValueChange={(v) => setFeedFilter(v as 'all' | 'following')} className="mb-6">
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                <Globe className="h-4 w-4" />
                ทั้งหมด
              </TabsTrigger>
              <TabsTrigger value="following" className="gap-2">
                <Users className="h-4 w-4" />
                กำลังติดตาม
                {followingUsers.size > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                    {followingUsers.size}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Posts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (() => {
          // Apply all filters
          let filteredPosts = posts;
          
          // Filter by feed type
          if (feedFilter === 'following') {
            filteredPosts = filteredPosts.filter(post => followingUsers.has(post.user_id));
          }
          
          // Filter by search query
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filteredPosts = filteredPosts.filter(post => 
              post.title.toLowerCase().includes(query) ||
              post.description?.toLowerCase().includes(query) ||
              post.artist_profile?.artist_name?.toLowerCase().includes(query) ||
              post.user_profile?.full_name?.toLowerCase().includes(query) ||
              post.tools_used?.some(tool => tool.toLowerCase().includes(query)) ||
              post.category?.toLowerCase().includes(query)
            );
          }
          
          // Filter by category
          if (selectedCategory !== 'all') {
            filteredPosts = filteredPosts.filter(post => post.category === selectedCategory);
          }
          
          return filteredPosts.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {searchQuery || selectedCategory !== 'all'
                  ? 'ไม่พบผลงานที่ตรงกับการค้นหา'
                  : feedFilter === 'following' 
                    ? 'ยังไม่มีโพสต์จากคนที่คุณติดตาม' 
                    : 'ยังไม่มีโพสต์ในคอมมูนิตี้'}
              </p>
              {(searchQuery || selectedCategory !== 'all') ? (
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  ล้างตัวกรอง
                </Button>
              ) : feedFilter === 'following' ? (
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => setFeedFilter('all')}
                >
                  ดูโพสต์ทั้งหมด
                </Button>
              ) : user && (
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  เป็นคนแรกที่โพสต์!
                </Button>
              )}
            </div>
          ) : (
            <>
              {(searchQuery || selectedCategory !== 'all') && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    พบ {filteredPosts.length} ผลงาน
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                  >
                    <X className="mr-1 h-3 w-3" />
                    ล้างตัวกรอง
                  </Button>
                </div>
              )}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                  <CardHeader className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.user_profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(post.artist_profile?.artist_name || post.user_profile?.full_name || "U")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-foreground">
                            {post.artist_profile?.artist_name || post.user_profile?.full_name || "ผู้ใช้"}
                          </span>
                          {post.artist_profile?.is_verified && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              ✓
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {new Date(post.created_at).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                          <span>•</span>
                          <span>{post.followers_count || 0} ผู้ติดตาม</span>
                        </div>
                      </div>
                      {user && user.id !== post.user_id && (
                        <Button
                          variant={followingUsers.has(post.user_id) ? "secondary" : "outline"}
                          size="sm"
                          className="shrink-0 gap-1"
                          onClick={() => handleFollow(post.user_id, followingUsers.has(post.user_id))}
                        >
                          {followingUsers.has(post.user_id) ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">ติดตามแล้ว</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">ติดตาม</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="aspect-square w-full object-cover"
                    />
                  </CardContent>
                  
                  <CardFooter className="flex-col items-start gap-2 p-3">
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post.id, post.is_liked || false)}
                          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Heart
                            className={`h-5 w-5 ${post.is_liked ? 'fill-destructive text-destructive' : ''}`}
                          />
                          <span className="text-sm">{post.likes_count}</span>
                        </button>
                        <button
                          onClick={() => handleOpenComments(post)}
                          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                        >
                          <MessageCircle className="h-5 w-5" />
                          <span className="text-sm">{post.comments_count || 0}</span>
                        </button>
                      </div>
                      {post.category && (
                        <Badge variant="outline" className="text-xs">
                          {post.category}
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-foreground">{post.title}</h3>
                      {post.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {post.description}
                        </p>
                      )}
                    </div>
                    
                    {post.tools_used && post.tools_used.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.tools_used.slice(0, 3).map((tool) => (
                          <Badge key={tool} variant="secondary" className="text-xs">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
              </div>
            </>
          );
        })()}

        {/* Comments Dialog */}
        <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
          <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>ความคิดเห็น - {selectedPost?.title}</DialogTitle>
            </DialogHeader>
            
            <div className="flex max-h-[60vh] flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-2">
                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">
                    ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user_profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(comment.user_profile?.full_name || "U")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 rounded-lg bg-muted p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {comment.user_profile?.full_name || "ผู้ใช้"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {user && (
                <div className="mt-4 flex gap-2 border-t pt-4">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="เขียนความคิดเห็น..."
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
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
