import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Heart, MessageCircle, Image, Send, X, Loader2, UserPlus, UserCheck, Search, Sparkles, Clock, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

const popularTags = ["#DigitalArt", "#Illustration", "#CharacterDesign", "#FanArt", "#Watercolor", "#Sketch"];

type FeedTab = 'discover' | 'following' | 'latest';

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
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [toolsUsed, setToolsUsed] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  
  // Filters
  const [activeTab, setActiveTab] = useState<FeedTab>('discover');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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

      const postsWithDetails = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', post.user_id)
            .maybeSingle();

          const { data: artistProfile } = await supabase
            .from('artist_profiles')
            .select('artist_name, is_verified')
            .eq('user_id', post.user_id)
            .maybeSingle();

          let isLiked = false;
          if (user) {
            const { data: like } = await supabase
              .from('community_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();
            isLiked = !!like;
          }

          const { count: commentsCount } = await supabase
            .from('community_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

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
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('artworks')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artworks')
        .getPublicUrl(fileName);

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

  const handleLike = async (postId: string, isLiked: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleFollow = async (userId: string, isFollowing: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || user.id === userId) return;

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

        const { data: followerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        const { data: artistProfile } = await supabase
          .from('artist_profiles')
          .select('artist_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const followerName = artistProfile?.artist_name || followerProfile?.full_name || 'ผู้ใช้';

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

  const handleOpenPost = (post: CommunityPost) => {
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

  // Filter posts
  const filteredPosts = useMemo(() => {
    let result = posts;
    
    if (activeTab === 'following') {
      result = result.filter(post => followingUsers.has(post.user_id));
    } else if (activeTab === 'latest') {
      result = [...result].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.description?.toLowerCase().includes(query) ||
        post.artist_profile?.artist_name?.toLowerCase().includes(query) ||
        post.user_profile?.full_name?.toLowerCase().includes(query) ||
        post.tools_used?.some(tool => tool.toLowerCase().includes(query))
      );
    }
    
    if (selectedTag) {
      result = result.filter(post => 
        post.category?.toLowerCase().includes(selectedTag.replace('#', '').toLowerCase()) ||
        post.tools_used?.some(tool => tool.toLowerCase().includes(selectedTag.replace('#', '').toLowerCase()))
      );
    }
    
    return result;
  }, [posts, activeTab, searchQuery, selectedTag, followingUsers]);

  // Realtime comments
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

  const tabs = [
    { id: 'discover' as FeedTab, label: 'Discover', icon: Sparkles },
    { id: 'following' as FeedTab, label: 'Following', icon: Users },
    { id: 'latest' as FeedTab, label: 'Latest', icon: Clock },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Header Section */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-20 z-40">
          <div className="container mx-auto px-4">
            {/* Search Bar */}
            <div className="py-4">
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาผลงาน ศิลปิน หรือแท็ก..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-background/50 border-muted text-base rounded-full"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedTag === tag
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-center gap-1 border-t border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ไม่พบผลงาน</h3>
              <p className="text-muted-foreground mb-6">
                {activeTab === 'following' 
                  ? 'ยังไม่มีโพสต์จากคนที่คุณติดตาม ลองติดตามศิลปินคนอื่นดู!'
                  : 'ลองค้นหาด้วยคำอื่น หรือเลือกแท็กอื่น'}
              </p>
              {(searchQuery || selectedTag) && (
                <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedTag(null); }}>
                  ล้างตัวกรอง
                </Button>
              )}
            </div>
          ) : (
            /* Masonry Grid */
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
              {filteredPosts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="break-inside-avoid"
                >
                  <div
                    className="group cursor-pointer overflow-hidden rounded-xl bg-card border border-border"
                    onMouseEnter={() => setHoveredPost(post.id)}
                    onMouseLeave={() => setHoveredPost(null)}
                    onClick={() => handleOpenPost(post)}
                  >
                    {/* Image Container */}
                    <div className="relative overflow-hidden">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Hover Overlay - Only on image */}
                      <AnimatePresence>
                        {hoveredPost === post.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center"
                          >
                            <div className="flex gap-4">
                              <button
                                onClick={(e) => handleLike(post.id, post.is_liked || false, e)}
                                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors ${
                                  post.is_liked 
                                    ? 'bg-red-500/90 text-white' 
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                              >
                                <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                                {post.likes_count}
                              </button>
                              <div className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium bg-white/20 text-white backdrop-blur-sm">
                                <MessageCircle className="h-4 w-4" />
                                {post.comments_count || 0}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Content - Always visible */}
                    <div className="p-3 space-y-2">
                      {/* Title */}
                      <h3 className="font-semibold text-foreground line-clamp-2">
                        {post.title}
                      </h3>
                      
                      {/* Description */}
                      {post.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.description}
                        </p>
                      )}
                      
                      {/* Category & Tools */}
                      {(post.category || (post.tools_used && post.tools_used.length > 0)) && (
                        <div className="flex flex-wrap gap-1">
                          {post.category && (
                            <Badge variant="secondary" className="text-xs">
                              {post.category}
                            </Badge>
                          )}
                          {post.tools_used?.slice(0, 2).map((tool, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Author */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={post.user_profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(post.artist_profile?.artist_name || post.user_profile?.full_name || "U")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                            {post.artist_profile?.artist_name || post.user_profile?.full_name || "ผู้ใช้"}
                          </span>
                          {post.artist_profile?.is_verified && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                        {user && user.id !== post.user_id && (
                          <button
                            onClick={(e) => handleFollow(post.user_id, followingUsers.has(post.user_id), e)}
                            className={`rounded-full p-1.5 transition-colors ${
                              followingUsers.has(post.user_id)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {followingUsers.has(post.user_id) ? (
                              <UserCheck className="h-3.5 w-3.5" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Create Button */}
        {user && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-shadow z-50"
              >
                <Plus className="h-6 w-6" />
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
                          className="w-full rounded-lg object-cover max-h-64"
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
                      <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary transition-colors">
                        <Image className="h-10 w-10 text-muted-foreground" />
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
                  size="lg"
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

        {/* Post Detail Dialog */}
        <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
            {selectedPost && (
              <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                {/* Image */}
                <div className="md:w-3/5 bg-black flex items-center justify-center">
                  <img
                    src={selectedPost.image_url}
                    alt={selectedPost.title}
                    className="max-h-[50vh] md:max-h-[90vh] w-full object-contain"
                  />
                </div>
                
                {/* Details */}
                <div className="md:w-2/5 flex flex-col max-h-[40vh] md:max-h-[90vh]">
                  {/* Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedPost.user_profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(selectedPost.artist_profile?.artist_name || selectedPost.user_profile?.full_name || "U")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {selectedPost.artist_profile?.artist_name || selectedPost.user_profile?.full_name || "ผู้ใช้"}
                          </span>
                          {selectedPost.artist_profile?.is_verified && (
                            <Badge variant="secondary" className="text-xs">✓</Badge>
                          )}
                        </div>
                      </div>
                      {user && user.id !== selectedPost.user_id && (
                        <Button
                          variant={followingUsers.has(selectedPost.user_id) ? "secondary" : "default"}
                          size="sm"
                          onClick={(e) => handleFollow(selectedPost.user_id, followingUsers.has(selectedPost.user_id), e)}
                        >
                          {followingUsers.has(selectedPost.user_id) ? 'Following' : 'Follow'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="p-4 border-b border-border">
                    <h2 className="font-bold text-lg">{selectedPost.title}</h2>
                    {selectedPost.description && (
                      <p className="text-muted-foreground mt-2 text-sm">{selectedPost.description}</p>
                    )}
                    {selectedPost.tools_used && selectedPost.tools_used.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {selectedPost.tools_used.map((tool) => (
                          <Badge key={tool} variant="outline" className="text-xs">{tool}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-b border-border flex items-center gap-4">
                    <button
                      onClick={(e) => handleLike(selectedPost.id, selectedPost.is_liked || false, e)}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Heart className={`h-6 w-6 ${selectedPost.is_liked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span className="font-medium">{selectedPost.likes_count}</span>
                    </button>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-6 w-6" />
                      <span className="font-medium">{selectedPost.comments_count || 0}</span>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {commentsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        ยังไม่มีความคิดเห็น
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={comment.user_profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(comment.user_profile?.full_name || "U")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm">
                              <span className="font-semibold mr-2">
                                {comment.user_profile?.full_name || "ผู้ใช้"}
                              </span>
                              {comment.content}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString('th-TH')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  {user && (
                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2">
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
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
