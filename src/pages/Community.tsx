import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Heart, MessageCircle, Image, Send, X, Loader2, UserPlus, UserCheck, Search, Sparkles, Clock, Users, Share2, Link2, Bookmark, MoreHorizontal, Repeat2, FolderPlus, Flag, Pencil, Trash2, Hash, SlidersHorizontal } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Layout } from "@/components/layout/Layout";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import { TagInput } from "@/components/ui/TagInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { supabase } from "@/integrations/supabase/client";
import { MentionInput, renderTextWithMentions, getMentionedUserIds } from "@/components/ui/MentionInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommunityPost {
  id: string;
  original_post_id?: string; // For reposts, this is the actual post ID
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  tools_used: string[];
  hashtags?: string[];
  category: string | null;
  likes_count: number;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    display_name: string | null;
  };
  artist_profile?: {
    artist_name: string;
    is_verified: boolean;
  } | null;
  is_liked?: boolean;
  is_following?: boolean;
  followers_count?: number;
  comments_count?: number;
  shares_count?: number;
  // For reposted content
  is_repost?: boolean;
  repost_user_id?: string;
  repost_caption?: string;
  repost_created_at?: string;
  repost_user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    display_name: string | null;
  };
  repost_artist_profile?: {
    artist_name: string;
    is_verified: boolean;
  } | null;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    display_name: string | null;
  };
  artist_profile?: {
    artist_name: string;
    is_verified: boolean;
  } | null;
  replies?: Comment[];
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

type FeedTab = 'discover' | 'following' | 'latest';

const ITEMS_PER_PAGE = 5;

export default function Community() {
  const { t } = useTranslation();
  const { user, isArtist, isBuyer } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isUserHidden } = useBlockedUsers();
  
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set());
  const [shareDialogPost, setShareDialogPost] = useState<CommunityPost | null>(null);
  const [shareCaption, setShareCaption] = useState("");
  const [sharingPost, setSharingPost] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [toolsUsed, setToolsUsed] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [addToPortfolio, setAddToPortfolio] = useState(false);
  const [artistProfile, setArtistProfile] = useState<{ id: string; artist_name: string } | null>(null);
  const [price, setPrice] = useState("");
  
  // Filters
  const [activeTab, setActiveTab] = useState<FeedTab>('discover');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Report state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingPost, setReportingPost] = useState<CommunityPost | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Edit/Delete state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editToolsUsed, setEditToolsUsed] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState<CommunityPost | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const reportReasons = [
    { value: "spam", label: "สแปมหรือโฆษณา" },
    { value: "harassment", label: "คุกคามหรือรังแก" },
    { value: "inappropriate_content", label: "เนื้อหาไม่เหมาะสม" },
    { value: "impersonation", label: "แอบอ้างตัวตน" },
    { value: "copyright", label: "ละเมิดลิขสิทธิ์" },
    { value: "scam", label: "หลอกลวง/ฉ้อโกง" },
    { value: "other", label: "อื่นๆ" }
  ];

  // Comment edit/delete state
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  
  // Reply state
  const [replyingToComment, setReplyingToComment] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  
  // State to track which comments have their replies expanded
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const lastWindowScrollYRef = useRef<number>(0);

  // Desktop: keep sidebar "scrolling along" with the page (like cara.app).
  // Page scroll stays normal, but the sidebar's internal content scrolls in parallel until it reaches the end.
  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;

    const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;
    lastWindowScrollYRef.current = window.scrollY;

    const onScroll = () => {
      if (!isDesktop()) {
        lastWindowScrollYRef.current = window.scrollY;
        return;
      }

      const target = document.activeElement as HTMLElement | null;
      // Don't interfere with dialogs/drawers
      if (target?.closest('[role="dialog"]')) {
        lastWindowScrollYRef.current = window.scrollY;
        return;
      }

      const currentY = window.scrollY;
      const delta = currentY - lastWindowScrollYRef.current;
      lastWindowScrollYRef.current = currentY;
      if (delta === 0) return;

      const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      const next = Math.min(maxScrollTop, Math.max(0, el.scrollTop + delta));
      el.scrollTop = next;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fetchFollowing = useCallback(async () => {
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
  }, [user]);

  const fetchSavedPosts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user.id);
      
      if (data) {
        setSavedPosts(new Set(data.map(s => s.post_id)));
      }
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    }
  }, [user]);

  const fetchRepostedPosts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('shared_posts')
        .select('post_id')
        .eq('user_id', user.id);
      
      if (data) {
        setRepostedPosts(new Set(data.map(s => s.post_id)));
      }
    } catch (error) {
      console.error('Error fetching reposted posts:', error);
    }
  }, [user]);

  const fetchPosts = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPosts([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = reset ? 0 : posts.length;
      
      // Fetch original posts
      let query = supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data: postsData, error } = await query;
      if (error) throw error;

      // Fetch shared posts (reposts)
      const { data: sharedPostsData } = await supabase
        .from('shared_posts')
        .select('*, community_posts(*)')
        .order('created_at', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      // Process original posts
      const originalPostsWithDetails = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, display_name')
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

          const { count: likesCount } = await supabase
            .from('community_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentsCount } = await supabase
            .from('community_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: followersCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', post.user_id);

          const { count: sharesCount } = await supabase
            .from('shared_posts')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            likes_count: likesCount || 0,
            user_profile: profile,
            artist_profile: artistProfile,
            is_liked: isLiked,
            is_following: followingUsers.has(post.user_id),
            followers_count: followersCount || 0,
            comments_count: commentsCount || 0,
            shares_count: sharesCount || 0,
            is_repost: false,
            repost_created_at: undefined as string | undefined
          } as CommunityPost;
        })
      );

      // Process shared posts (reposts)
      const repostsWithDetails = await Promise.all(
        (sharedPostsData || []).map(async (share) => {
          const originalPost = share.community_posts as any;
          if (!originalPost) return null;

          // Get reposter's profile
          const { data: reposterProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, display_name')
            .eq('id', share.user_id)
            .maybeSingle();

          const { data: reposterArtist } = await supabase
            .from('artist_profiles')
            .select('artist_name, is_verified')
            .eq('user_id', share.user_id)
            .maybeSingle();

          // Get original poster's profile
          const { data: originalProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, display_name')
            .eq('id', originalPost.user_id)
            .maybeSingle();

          const { data: originalArtist } = await supabase
            .from('artist_profiles')
            .select('artist_name, is_verified')
            .eq('user_id', originalPost.user_id)
            .maybeSingle();

          let isLiked = false;
          if (user) {
            const { data: like } = await supabase
              .from('community_likes')
              .select('id')
              .eq('post_id', originalPost.id)
              .eq('user_id', user.id)
              .maybeSingle();
            isLiked = !!like;
          }

          const { count: likesCount } = await supabase
            .from('community_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', originalPost.id);

          const { count: commentsCount } = await supabase
            .from('community_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', originalPost.id);

          const { count: sharesCount } = await supabase
            .from('shared_posts')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', originalPost.id);

          return {
            ...originalPost,
            id: `repost-${share.id}`, // Unique key for repost
            original_post_id: originalPost.id,
            likes_count: likesCount || 0,
            user_profile: originalProfile,
            artist_profile: originalArtist,
            is_liked: isLiked,
            is_following: followingUsers.has(originalPost.user_id),
            followers_count: 0,
            comments_count: commentsCount || 0,
            shares_count: sharesCount || 0,
            is_repost: true,
            repost_user_id: share.user_id,
            repost_caption: share.caption,
            repost_created_at: share.created_at,
            repost_user_profile: reposterProfile,
            repost_artist_profile: reposterArtist
          };
        })
      );

      // Filter out null reposts and combine with original posts
      const validReposts = repostsWithDetails.filter(r => r !== null) as CommunityPost[];
      
      // Merge and sort by created_at (use repost_created_at for reposts)
      const allPosts: CommunityPost[] = [...originalPostsWithDetails, ...validReposts].sort((a, b) => {
        const dateA = a.is_repost && a.repost_created_at ? new Date(a.repost_created_at) : new Date(a.created_at);
        const dateB = b.is_repost && b.repost_created_at ? new Date(b.repost_created_at) : new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      });

      // Limit to ITEMS_PER_PAGE
      const limitedPosts = allPosts.slice(0, ITEMS_PER_PAGE);

      if (reset) {
        setPosts(limitedPosts);
      } else {
        setPosts(prev => [...prev, ...limitedPosts]);
      }
      
      setHasMore(limitedPosts.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [posts.length, searchQuery, user, followingUsers]);

  // Fetch artist profile
  const fetchArtistProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('artist_profiles')
        .select('id, artist_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setArtistProfile(data);
      }
    } catch (error) {
      console.error('Error fetching artist profile:', error);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchFollowing();
    fetchSavedPosts();
    fetchRepostedPosts();
    fetchArtistProfile();
  }, [fetchFollowing, fetchSavedPosts, fetchRepostedPosts, fetchArtistProfile]);

  useEffect(() => {
    fetchPosts(true);
  }, [searchQuery, activeTab, selectedTag, selectedCategory]);

  // Handle opening post from query parameter (e.g., from notifications)
  useEffect(() => {
    const postIdFromUrl = searchParams.get('post');
    if (postIdFromUrl && posts.length > 0 && !loading) {
      // Try to find the post in loaded posts first
      const existingPost = posts.find(p => 
        p.id === postIdFromUrl || p.original_post_id === postIdFromUrl
      );
      
      if (existingPost) {
        handleOpenPost(existingPost);
        // Clear the query param after opening
        setSearchParams({}, { replace: true });
      } else {
        // Post not in current list, fetch it directly
        const fetchAndOpenPost = async () => {
          try {
            const { data: postData, error } = await supabase
              .from('community_posts')
              .select('*')
              .eq('id', postIdFromUrl)
              .maybeSingle();

            if (error || !postData) {
              toast({
                variant: "destructive",
                title: "ไม่พบโพสต์",
                description: "โพสต์นี้อาจถูกลบหรือไม่มีอยู่"
              });
              setSearchParams({}, { replace: true });
              return;
            }

            // Fetch additional data for the post
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url, display_name')
              .eq('id', postData.user_id)
              .maybeSingle();

            const { data: artistProfile } = await supabase
              .from('artist_profiles')
              .select('artist_name, is_verified')
              .eq('user_id', postData.user_id)
              .maybeSingle();

            let isLiked = false;
            if (user) {
              const { data: like } = await supabase
                .from('community_likes')
                .select('id')
                .eq('post_id', postData.id)
                .eq('user_id', user.id)
                .maybeSingle();
              isLiked = !!like;
            }

            const { count: likesCount } = await supabase
              .from('community_likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', postData.id);

            const { count: commentsCount } = await supabase
              .from('community_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', postData.id);

            const { count: sharesCount } = await supabase
              .from('shared_posts')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', postData.id);

            const fullPost: CommunityPost = {
              ...postData,
              likes_count: likesCount || 0,
              user_profile: profile,
              artist_profile: artistProfile,
              is_liked: isLiked,
              comments_count: commentsCount || 0,
              shares_count: sharesCount || 0,
              is_repost: false
            };

            handleOpenPost(fullPost);
            setSearchParams({}, { replace: true });
          } catch (error) {
            console.error('Error fetching post from notification:', error);
            setSearchParams({}, { replace: true });
          }
        };
        
        fetchAndOpenPost();
      }
    }
  }, [searchParams, posts, loading]);

  // Real-time subscription for comments
  useEffect(() => {
    const channel = supabase
      .channel('community-comments-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_comments'
        },
        (payload) => {
          const newComment = payload.new as { post_id: string };
          
          // Update comment count in posts
          setPosts(prevPosts => prevPosts.map(post => {
            const postActualId = post.original_post_id || post.id;
            if (postActualId === newComment.post_id) {
              return { ...post, comments_count: (post.comments_count || 0) + 1 };
            }
            return post;
          }));

          // Update selectedPost if viewing that post
          if (selectedPost) {
            const selectedActualId = selectedPost.original_post_id || selectedPost.id;
            if (selectedActualId === newComment.post_id) {
              setSelectedPost(prev => prev ? {
                ...prev,
                comments_count: (prev.comments_count || 0) + 1
              } : null);
              // Refresh comments list
              fetchComments(newComment.post_id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_comments'
        },
        (payload) => {
          const deletedComment = payload.old as { post_id: string };
          
          // Update comment count in posts
          setPosts(prevPosts => prevPosts.map(post => {
            const postActualId = post.original_post_id || post.id;
            if (postActualId === deletedComment.post_id) {
              return { ...post, comments_count: Math.max(0, (post.comments_count || 1) - 1) };
            }
            return post;
          }));

          // Update selectedPost if viewing that post
          if (selectedPost) {
            const selectedActualId = selectedPost.original_post_id || selectedPost.id;
            if (selectedActualId === deletedComment.post_id) {
              setSelectedPost(prev => prev ? {
                ...prev,
                comments_count: Math.max(0, (prev.comments_count || 1) - 1)
              } : null);
              // Refresh comments list
              fetchComments(deletedComment.post_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPost]);

  // Real-time subscription for likes - refetch actual count to avoid race conditions
  useEffect(() => {
    const refetchLikesCount = async (postId: string) => {
      const { count } = await supabase
        .from('community_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      
      const actualCount = count ?? 0;
      
      setPosts(prevPosts => prevPosts.map(post => {
        const postActualId = post.original_post_id || post.id;
        if (postActualId === postId) {
          return { ...post, likes_count: actualCount };
        }
        return post;
      }));

      if (selectedPost) {
        const selectedActualId = selectedPost.original_post_id || selectedPost.id;
        if (selectedActualId === postId) {
          setSelectedPost(prev => prev ? { ...prev, likes_count: actualCount } : null);
        }
      }
    };

    const channel = supabase
      .channel('community-likes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_likes'
        },
        (payload) => {
          const newLike = payload.new as { post_id: string; user_id: string };
          // Don't update if it's from the current user (already handled locally)
          if (user && newLike.user_id === user.id) return;
          refetchLikesCount(newLike.post_id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_likes'
        },
        (payload) => {
          const deletedLike = payload.old as { post_id: string; user_id: string };
          // Don't update if it's from the current user (already handled locally)
          if (user && deletedLike.user_id === user.id) return;
          refetchLikesCount(deletedLike.post_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedPost]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchPosts(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, loadingMore]);

  // Filter posts by tab, tag, category, and blocked/muted users
  const filteredPosts = posts.filter(post => {
    // Filter out posts from blocked/muted users
    if (isUserHidden(post.user_id)) return false;
    
    // For reposts, also check the reposter
    if (post.is_repost && post.repost_user_id && isUserHidden(post.repost_user_id)) return false;
    
    // Filter by tab
    if (activeTab === 'following') {
      if (!followingUsers.has(post.user_id)) return false;
    }
    
    // Filter by tag (check tools_used and category)
    if (selectedTag) {
      const hasTag = post.tools_used?.includes(selectedTag) || post.category === selectedTag;
      if (!hasTag) return false;
    }
    
    // Filter by category
    if (selectedCategory) {
      if (post.category !== selectedCategory) return false;
    }
    
    return true;
  });

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

    // If adding to portfolio, user needs artist profile
    if (addToPortfolio && !artistProfile) {
      toast({
        variant: "destructive",
        title: "ไม่สามารถเพิ่มใน Portfolio ได้",
        description: "คุณต้องมีบัญชีศิลปินเพื่อเพิ่มใน Portfolio"
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

      // Parse hashtags - extract tags from the hashtags field
      const parsedHashtags = hashtags
        ? hashtags.split(/[,\s]+/)
            .map(t => t.trim().replace(/^#/, ''))
            .filter(t => t.length > 0)
        : [];
      
      // Parse tools_used separately
      const parsedTools = toolsUsed 
        ? toolsUsed.split(',').map(t => t.trim()).filter(t => t.length > 0) 
        : [];

      const { error: postError } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          image_url: urlData.publicUrl,
          category: category || null,
          tools_used: parsedTools,
          hashtags: parsedHashtags
        });

      if (postError) throw postError;

      // Also add to portfolio (artworks table) if checkbox is checked
      if (addToPortfolio && artistProfile) {
        // Map community category to artworks category
        const artworkCategory = category ? 
          (category.includes('ดิจิทัล') || category.includes('3D') ? 'digital' : 'traditional') 
          : null;
        
        const { error: artworkError } = await supabase
          .from('artworks')
          .insert({
            artist_id: artistProfile.id,
            title,
            description: description || null,
            image_url: urlData.publicUrl,
            category: artworkCategory,
            tools_used: toolsUsed ? toolsUsed.split(',').map(t => t.trim()) : [],
            price: price ? parseFloat(price) : 0,
            is_verified: false,
            is_sold: false
          });

        if (artworkError) {
          console.error('Error adding to portfolio:', artworkError);
          toast({
            variant: "destructive",
            title: "เกิดข้อผิดพลาด",
            description: "โพสต์สำเร็จ แต่ไม่สามารถเพิ่มใน Portfolio ได้"
          });
        } else {
          toast({
            title: "โพสต์สำเร็จ! 🎉",
            description: "ผลงานของคุณถูกเผยแพร่และเพิ่มใน Portfolio แล้ว"
          });
        }
      } else {
        toast({
          title: "โพสต์สำเร็จ! 🎉",
          description: "ผลงานของคุณถูกเผยแพร่แล้ว"
        });
      }

      setTitle("");
      setDescription("");
      setCategory("");
      setToolsUsed("");
      setHashtags("");
      setImageFile(null);
      setImagePreview("");
      setAddToPortfolio(false);
      setPrice("");
      setIsCreateOpen(false);
      fetchPosts(true);
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

  const handleLike = async (postId: string, isLiked: boolean, e?: React.MouseEvent, originalPostId?: string) => {
    e?.stopPropagation();
    if (!user) {
      toast({
        variant: "destructive",
        title: "กรุณาเข้าสู่ระบบ",
        description: "เข้าสู่ระบบเพื่อกดถูกใจ"
      });
      return;
    }

    // Use originalPostId for database operations (for reposts)
    const actualPostId = originalPostId || postId;

    try {
      // Check if user already liked this post
      const { data: existingLike } = await supabase
        .from('community_likes')
        .select('id')
        .eq('post_id', actualPostId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        // Unlike - delete the like
        await supabase
          .from('community_likes')
          .delete()
          .eq('id', existingLike.id);

        setPosts(posts.map(post => {
          const postActualId = post.original_post_id || post.id;
          if (postActualId === actualPostId) {
            return {
              ...post,
              is_liked: false,
              likes_count: Math.max(0, post.likes_count - 1)
            };
          }
          return post;
        }));

        // Also update selectedPost if it's the same post
        if (selectedPost) {
          const selectedActualId = selectedPost.original_post_id || selectedPost.id;
          if (selectedActualId === actualPostId) {
            setSelectedPost({
              ...selectedPost,
              is_liked: false,
              likes_count: Math.max(0, selectedPost.likes_count - 1)
            });
          }
        }

        // Delete the like notification if it was created by current user within last 5 seconds
        const { data: postData } = await supabase
          .from('community_posts')
          .select('user_id')
          .eq('id', actualPostId)
          .maybeSingle();

        if (postData && postData.user_id !== user.id) {
          const fiveSecondsAgo = new Date(Date.now() - 5 * 1000).toISOString();
          
          // Delete notification with actor_id (new notifications)
          const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', postData.user_id)
            .eq('type', 'like')
            .eq('reference_id', actualPostId)
            .eq('actor_id', user.id)
            .gte('created_at', fiveSecondsAgo);
            
          if (error) {
            console.log('Could not delete notification:', error.message);
          }
        }
      } else {
        // Like - insert new like
        const { error } = await supabase
          .from('community_likes')
          .insert({ post_id: actualPostId, user_id: user.id });

        if (!error) {
          setPosts(posts.map(post => {
            const postActualId = post.original_post_id || post.id;
            if (postActualId === actualPostId) {
              return {
                ...post,
                is_liked: true,
                likes_count: post.likes_count + 1
              };
            }
            return post;
          }));

          // Also update selectedPost if it's the same post
          if (selectedPost) {
            const selectedActualId = selectedPost.original_post_id || selectedPost.id;
            if (selectedActualId === actualPostId) {
              setSelectedPost({
                ...selectedPost,
                is_liked: true,
                likes_count: selectedPost.likes_count + 1
              });
            }
          }

          // Get the post owner
          const { data: postData } = await supabase
            .from('community_posts')
            .select('user_id')
            .eq('id', actualPostId)
            .maybeSingle();

          if (postData && postData.user_id !== user.id) {
            // Check if liker is muted by post owner
            const { data: isMuted } = await supabase
              .from('user_mutes')
              .select('id')
              .eq('muter_id', postData.user_id)
              .eq('muted_id', user.id)
              .maybeSingle();

            if (!isMuted) {
              // Check cooldown - don't send if notification was sent within last hour
              const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
              const { data: recentNotification } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', postData.user_id)
                .eq('type', 'like')
                .eq('reference_id', actualPostId)
                .gte('created_at', oneHourAgo)
                .maybeSingle();

              // Only send notification if no recent notification exists
              if (!recentNotification) {
                // Get liker's name
                const { data: likerProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', user.id)
                  .maybeSingle();

                const { data: likerArtist } = await supabase
                  .from('artist_profiles')
                  .select('artist_name')
                  .eq('user_id', user.id)
                  .maybeSingle();

                const likerName = likerArtist?.artist_name || likerProfile?.full_name || 'ผู้ใช้';

                await supabase.from('notifications').insert({
                  user_id: postData.user_id,
                  title: 'มีคนถูกใจโพสต์ของคุณ ❤️',
                  message: `${likerName} ถูกใจโพสต์ของคุณ`,
                  type: 'like',
                  reference_id: actualPostId,
                  actor_id: user.id
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
              reference_id: user.id
            });
        }
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
            .select('full_name, avatar_url, display_name')
            .eq('id', comment.user_id)
            .maybeSingle();
          
          const { data: commentArtistProfile } = await supabase
            .from('artist_profiles')
            .select('artist_name, is_verified')
            .eq('user_id', comment.user_id)
            .maybeSingle();
          return { ...comment, user_profile: profile, artist_profile: commentArtistProfile };
        })
      );

      // Filter out comments from blocked/muted users
      const filteredComments = commentsWithProfiles.filter(
        comment => !isUserHidden(comment.user_id)
      );

      // Organize comments into parent and replies structure
      const parentComments: Comment[] = [];
      const repliesMap = new Map<string, Comment[]>();

      filteredComments.forEach(comment => {
        if (comment.parent_id) {
          const existing = repliesMap.get(comment.parent_id) || [];
          existing.push(comment);
          repliesMap.set(comment.parent_id, existing);
        } else {
          parentComments.push(comment);
        }
      });

      // Attach replies to parent comments
      const commentsWithReplies = parentComments.map(parent => ({
        ...parent,
        replies: repliesMap.get(parent.id) || []
      }));

      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleOpenPost = (post: CommunityPost) => {
    setSelectedPost(post);
    // Use original_post_id for reposts, otherwise use id
    const actualPostId = post.original_post_id || post.id;
    fetchComments(actualPostId);
  };

  const handleSubmitComment = async () => {
    if (!user || !selectedPost || !newComment.trim()) return;

    // Use original_post_id for reposts, otherwise use id
    const actualPostId = selectedPost.original_post_id || selectedPost.id;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: actualPostId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      // Send notifications to mentioned users
      const mentionedUserIds = await getMentionedUserIds(newComment);
      const { data: commenterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      
      const { data: commenterArtist } = await supabase
        .from('artist_profiles')
        .select('artist_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const commenterName = commenterArtist?.artist_name || commenterProfile?.full_name || 'ผู้ใช้';
      
      for (const mentionedUserId of mentionedUserIds) {
        if (mentionedUserId !== user.id) {
          await supabase.from('notifications').insert({
            user_id: mentionedUserId,
            title: 'คุณถูกแท็กในความคิดเห็น 💬',
            message: `${commenterName} แท็กคุณในความคิดเห็น: "${newComment.slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
            type: 'mention',
            reference_id: actualPostId
          });
        }
      }

      // Send notification to post owner (if not the commenter)
      if (selectedPost.user_id !== user.id) {
        // Check if commenter is muted by post owner
        const { data: isMuted } = await supabase
          .from('user_mutes')
          .select('id')
          .eq('muter_id', selectedPost.user_id)
          .eq('muted_id', user.id)
          .maybeSingle();

        if (!isMuted) {
          // Check cooldown - don't send if notification was sent within last 10 minutes
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          const { data: recentNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', selectedPost.user_id)
            .eq('type', 'comment')
            .eq('reference_id', actualPostId)
            .gte('created_at', tenMinutesAgo)
            .maybeSingle();

          // Only send notification if no recent notification exists
          if (!recentNotification) {
            await supabase.from('notifications').insert({
              user_id: selectedPost.user_id,
              title: 'มีคนแสดงความคิดเห็น 💬',
              message: `${commenterName} แสดงความคิดเห็นในโพสต์ของคุณ: "${newComment.slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
              type: 'comment',
              reference_id: actualPostId
            });
          }
        }
      }

      setNewComment("");
      fetchComments(actualPostId);
      
      setPosts(posts.map(post => {
        // Update both the repost and original post if they exist
        const postActualId = post.original_post_id || post.id;
        if (postActualId === actualPostId) {
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

  const handleSubmitReply = async (parentComment: Comment) => {
    if (!user || !selectedPost || !replyContent.trim()) return;

    const actualPostId = selectedPost.original_post_id || selectedPost.id;

    setSubmittingReply(true);
    try {
      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: actualPostId,
          user_id: user.id,
          content: replyContent.trim(),
          parent_id: parentComment.id
        });

      if (error) throw error;

      // Send notification to parent comment owner
      if (parentComment.user_id !== user.id) {
        const { data: replierProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        
        const { data: replierArtist } = await supabase
          .from('artist_profiles')
          .select('artist_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const replierName = replierArtist?.artist_name || replierProfile?.full_name || 'ผู้ใช้';

        // Check if replier is muted by comment owner
        const { data: isMuted } = await supabase
          .from('user_mutes')
          .select('id')
          .eq('muter_id', parentComment.user_id)
          .eq('muted_id', user.id)
          .maybeSingle();

        if (!isMuted) {
          await supabase.from('notifications').insert({
            user_id: parentComment.user_id,
            title: 'มีคนตอบกลับความคิดเห็นของคุณ 💬',
            message: `${replierName} ตอบกลับความคิดเห็นของคุณ: "${replyContent.slice(0, 50)}${replyContent.length > 50 ? '...' : ''}"`,
            type: 'comment',
            reference_id: actualPostId
          });
        }
      }

      // Send notifications to mentioned users
      const mentionedUserIds = await getMentionedUserIds(replyContent);
      const { data: replierProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      
      const { data: replierArtist } = await supabase
        .from('artist_profiles')
        .select('artist_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const replierName = replierArtist?.artist_name || replierProfile?.full_name || 'ผู้ใช้';
      
      for (const mentionedUserId of mentionedUserIds) {
        if (mentionedUserId !== user.id) {
          await supabase.from('notifications').insert({
            user_id: mentionedUserId,
            title: 'คุณถูกแท็กในความคิดเห็น 💬',
            message: `${replierName} แท็กคุณในความคิดเห็น: "${replyContent.slice(0, 50)}${replyContent.length > 50 ? '...' : ''}"`,
            type: 'mention',
            reference_id: actualPostId
          });
        }
      }

      setReplyContent("");
      setReplyingToComment(null);
      fetchComments(actualPostId);
      
      setPosts(posts.map(post => {
        const postActualId = post.original_post_id || post.id;
        if (postActualId === actualPostId) {
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
      setSubmittingReply(false);
    }
  };

  const handleSave = async (postId: string, originalPostId?: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "กรุณาเข้าสู่ระบบ",
        description: "เข้าสู่ระบบเพื่อบันทึก"
      });
      return;
    }
    
    // Use originalPostId for database operations (for reposts)
    const actualPostId = originalPostId || postId;
    const isSaved = savedPosts.has(actualPostId);
    
    try {
      if (isSaved) {
        // Unsave
        await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', actualPostId);
        
        setSavedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(actualPostId);
          return newSet;
        });
        toast({ title: "ยกเลิกการบันทึกแล้ว" });
      } else {
        // Save
        await supabase
          .from('saved_posts')
          .insert({ user_id: user.id, post_id: actualPostId });
        
        setSavedPosts(prev => new Set(prev).add(actualPostId));
        toast({ title: "บันทึกแล้ว ✓" });
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกได้"
      });
    }
  };

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

  const handleRepost = async () => {
    if (!user || !shareDialogPost) return;
    
    const postId = shareDialogPost.original_post_id || shareDialogPost.id;
    const alreadyReposted = repostedPosts.has(postId);
    
    setSharingPost(true);
    try {
      if (alreadyReposted) {
        // Remove repost
        await supabase
          .from('shared_posts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        setRepostedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });

        // Update shares count in UI
        setPosts(posts.map(post => {
          const actualId = post.original_post_id || post.id;
          if (actualId === postId) {
            return { ...post, shares_count: Math.max(0, (post.shares_count || 1) - 1) };
          }
          return post;
        }));

        toast({
          title: "ยกเลิก Repost แล้ว",
          description: "โพสต์ถูกลบออกจากโปรไฟล์ของคุณแล้ว"
        });
      } else {
        // Create new repost
        await supabase
          .from('shared_posts')
          .insert({
            user_id: user.id,
            post_id: postId,
            caption: shareCaption.trim() || null
          });

        setRepostedPosts(prev => new Set(prev).add(postId));

        // Notify original poster (with cooldown check)
        if (shareDialogPost.user_id !== user.id) {
          // Check if sharer is muted by post owner
          const { data: isMuted } = await supabase
            .from('user_mutes')
            .select('id')
            .eq('muter_id', shareDialogPost.user_id)
            .eq('muted_id', user.id)
            .maybeSingle();

          if (!isMuted) {
            // Check cooldown - don't send if notification was sent within last hour
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data: recentNotification } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', shareDialogPost.user_id)
              .eq('type', 'share')
              .eq('reference_id', postId)
              .gte('created_at', oneHourAgo)
              .maybeSingle();

            // Only send notification if no recent notification exists
            if (!recentNotification) {
              const { data: sharerProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .maybeSingle();
              
              const { data: sharerArtist } = await supabase
                .from('artist_profiles')
                .select('artist_name')
                .eq('user_id', user.id)
                .maybeSingle();
              
              const sharerName = sharerArtist?.artist_name || sharerProfile?.full_name || 'ผู้ใช้';
              
              await supabase.from('notifications').insert({
                user_id: shareDialogPost.user_id,
                title: 'โพสต์ของคุณถูกแชร์! 🔁',
                message: `${sharerName} แชร์ผลงาน "${shareDialogPost.title}" ของคุณ`,
                type: 'share',
                reference_id: postId
              });
            }
          }
        }

        // Update shares count in UI
        setPosts(posts.map(post => {
          const actualId = post.original_post_id || post.id;
          if (actualId === postId) {
            return { ...post, shares_count: (post.shares_count || 0) + 1 };
          }
          return post;
        }));

        toast({
          title: "แชร์โพสต์สำเร็จ! 🔁",
          description: "โพสต์ถูกแชร์ไปยังโปรไฟล์ของคุณแล้ว"
        });
      }

      setShareDialogPost(null);
      setShareCaption("");
      fetchPosts(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message
      });
    } finally {
      setSharingPost(false);
    }
  };

  // Handle edit post
  const openEditDialog = (post: CommunityPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditDescription(post.description || "");
    setEditCategory(post.category || "");
    setEditToolsUsed((post.tools_used || []).join(", "));
    setEditHashtags(""); // Start empty - user can add new tags
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!user || !editingPost) return;
    
    setSavingEdit(true);
    try {
      const toolsArray = editToolsUsed
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      // Parse edit hashtags
      const parsedEditHashtags = editHashtags
        ? editHashtags.split(/[,\s]+/)
            .map(t => t.trim().replace(/^#/, ''))
            .filter(t => t.length > 0)
        : [];

      const { error } = await supabase
        .from('community_posts')
        .update({
          title: editTitle,
          description: editDescription || null,
          category: editCategory || null,
          tools_used: toolsArray,
          hashtags: parsedEditHashtags,
        })
        .eq('id', editingPost.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setPosts(posts.map(p => 
        p.id === editingPost.id 
          ? { ...p, title: editTitle, description: editDescription, category: editCategory, tools_used: toolsArray, hashtags: parsedEditHashtags }
          : p
      ));

      // Update selected post if it's the same
      if (selectedPost && selectedPost.id === editingPost.id) {
        setSelectedPost({
          ...selectedPost,
          title: editTitle,
          description: editDescription,
          category: editCategory,
          tools_used: toolsArray,
          hashtags: parsedEditHashtags
        });
      }

      toast({
        title: "แก้ไขโพสต์สำเร็จ ✓",
        description: "โพสต์ของคุณถูกอัปเดตแล้ว"
      });

      setEditDialogOpen(false);
      setEditingPost(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle delete post
  const openDeleteDialog = (post: CommunityPost) => {
    setDeletingPost(post);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !deletingPost) return;
    
    setConfirmingDelete(true);
    try {
      // Delete related data first
      await supabase.from('community_comments').delete().eq('post_id', deletingPost.id);
      await supabase.from('community_likes').delete().eq('post_id', deletingPost.id);
      await supabase.from('saved_posts').delete().eq('post_id', deletingPost.id);
      await supabase.from('shared_posts').delete().eq('post_id', deletingPost.id);
      
      // Delete the post
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', deletingPost.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setPosts(posts.filter(p => p.id !== deletingPost.id && p.original_post_id !== deletingPost.id));

      // Close post detail if viewing the deleted post
      if (selectedPost && selectedPost.id === deletingPost.id) {
        setSelectedPost(null);
      }

      toast({
        title: "ลบโพสต์สำเร็จ",
        description: "โพสต์ของคุณถูกลบแล้ว"
      });

      setDeleteDialogOpen(false);
      setDeletingPost(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message
      });
    } finally {
      setConfirmingDelete(false);
    }
  };

  // Time ago formatter
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "เมื่อกี้";
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH');
  };

  // Get display name based on user type (artist uses artist_name, buyer uses display_name or full_name)
  const getDisplayName = (
    userProfile?: { full_name: string | null; display_name: string | null } | null,
    artistProfile?: { artist_name: string; is_verified: boolean } | null
  ) => {
    if (artistProfile?.artist_name) {
      return artistProfile.artist_name;
    }
    return userProfile?.display_name || userProfile?.full_name || "ผู้ใช้";
  };

  // Check if user is a buyer (has no artist profile)
  const isBuyerUser = (artistProfile?: { artist_name: string; is_verified: boolean } | null) => {
    return !artistProfile;
  };

  // Handle edit comment
  const handleEditComment = async () => {
    if (!user || !editingComment || !editCommentContent.trim()) return;
    
    setSavingCommentEdit(true);
    try {
      const { error } = await supabase
        .from('community_comments')
        .update({ content: editCommentContent.trim() })
        .eq('id', editingComment.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setComments(comments.map(c => 
        c.id === editingComment.id 
          ? { ...c, content: editCommentContent.trim() }
          : c
      ));

      toast({
        title: "แก้ไขความคิดเห็นสำเร็จ ✓"
      });

      setEditingComment(null);
      setEditCommentContent("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message
      });
    } finally {
      setSavingCommentEdit(false);
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    
    setDeletingCommentId(commentId);
    try {
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setComments(comments.filter(c => c.id !== commentId));

      // Update comments count in posts
      if (selectedPost) {
        setPosts(posts.map(p => 
          p.id === selectedPost.id 
            ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) }
            : p
        ));
        setSelectedPost({
          ...selectedPost,
          comments_count: Math.max(0, (selectedPost.comments_count || 0) - 1)
        });
      }

      toast({
        title: "ลบความคิดเห็นสำเร็จ"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message
      });
    } finally {
      setDeletingCommentId(null);
    }
  };

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
        {/* Sticky Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur sticky top-20 z-40">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="max-w-2xl mx-auto lg:mx-0 lg:max-w-none lg:pr-[340px]">
            {/* Search Bar */}
            <div className="py-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาผลงาน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-11 bg-muted/50 border-0 rounded-full"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-center gap-1 border-t border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
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
        </div>

        {/* Main Content with Sidebar */}
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex gap-6 items-stretch">
            {/* Feed Content */}
            <div ref={feedRef} className="flex-1 max-w-2xl">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ไม่พบผลงาน</h3>
              <p className="text-muted-foreground mb-4">
                {activeTab === 'following' 
                  ? 'ยังไม่มีโพสต์จากคนที่คุณติดตาม'
                  : searchQuery ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีโพสต์ในคอมมูนิตี้'}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  ล้างการค้นหา
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {filteredPosts.map((post, index) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card border border-border rounded-xl overflow-hidden"
                  >
                    {/* Repost Header */}
                    {post.is_repost && post.repost_user_id && (
                      <Link to={`/profile/${post.repost_user_id}`} className="px-4 pt-3 pb-2 flex items-center gap-2 text-muted-foreground text-sm border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <Repeat2 className="h-4 w-4" />
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={post.repost_user_profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getDisplayName(post.repost_user_profile, post.repost_artist_profile)[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">
                          {getDisplayName(post.repost_user_profile, post.repost_artist_profile)}
                        </span>
                        {isBuyerUser(post.repost_artist_profile) && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-sky-500 text-white border-0">
                            Buyer
                          </Badge>
                        )}
                        <span>รีโพสต์</span>
                        <span className="text-xs">• {formatTimeAgo(post.repost_created_at || post.created_at)}</span>
                      </Link>
                    )}

                    {/* Repost Caption */}
                    {post.is_repost && post.repost_caption && (
                      <div className="px-4 py-2 bg-muted/30">
                        <p className="text-sm">{post.repost_caption}</p>
                      </div>
                    )}

                    {/* Post Header */}
                    <div className="flex items-center justify-between p-4">
                      <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                          <AvatarImage src={post.user_profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {getDisplayName(post.user_profile, post.artist_profile)[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              {getDisplayName(post.user_profile, post.artist_profile)}
                            </span>
                            {post.artist_profile?.is_verified && (
                              <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">
                                ✓
                              </Badge>
                            )}
                            {isBuyerUser(post.artist_profile) && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-sky-500 text-white border-0">
                                Buyer
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(post.created_at)}
                          </span>
                        </div>
                      </Link>
                      
                      <div className="flex items-center gap-2">
                        {user && user.id !== post.user_id && (
                          <Button
                            variant={followingUsers.has(post.user_id) ? "secondary" : "default"}
                            size="sm"
                            className="h-8"
                            onClick={(e) => handleFollow(post.user_id, followingUsers.has(post.user_id), e)}
                          >
                            {followingUsers.has(post.user_id) ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5 mr-1" />
                                Following
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3.5 w-3.5 mr-1" />
                                Follow
                              </>
                            )}
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setShareDialogPost(post)}>
                              <Repeat2 className="h-4 w-4 mr-2" />
                              แชร์โพสต์ภายใน
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShare(post)}>
                              <Share2 className="h-4 w-4 mr-2" />
                              แชร์ลิงก์
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSave(post.id, post.original_post_id)}>
                              <Bookmark className="h-4 w-4 mr-2" />
                              {savedPosts.has(post.original_post_id || post.id) ? "ยกเลิกบันทึก" : "บันทึก"}
                            </DropdownMenuItem>
                            {/* Edit/Delete for own posts */}
                            {user && user.id === post.user_id && !post.is_repost && (
                              <>
                                <DropdownMenuItem onClick={() => openEditDialog(post)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  แก้ไขโพสต์
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(post)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  ลบโพสต์
                                </DropdownMenuItem>
                              </>
                            )}
                            {user && user.id !== post.user_id && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setReportingPost(post);
                                  setReportDialogOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Flag className="h-4 w-4 mr-2" />
                                รายงานโพสต์
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Image */}
                    <div 
                      className="relative aspect-square bg-muted cursor-pointer"
                      onClick={() => handleOpenPost(post)}
                    >
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-full object-cover"
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
                          onClick={() => handleLike(post.id, post.is_liked || false, undefined, post.original_post_id)}
                        >
                          <Heart 
                            className={`h-6 w-6 transition-colors ${
                              post.is_liked 
                                ? "fill-red-500 text-red-500" 
                                : "text-foreground"
                            }`} 
                          />
                        </Button>
                        <div className="flex items-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10"
                            onClick={() => handleOpenPost(post)}
                          >
                            <MessageCircle className="h-6 w-6" />
                          </Button>
                          {(post.comments_count || 0) > 0 && (
                            <span className="text-sm text-muted-foreground -ml-1">{post.comments_count}</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => user ? setShareDialogPost(post) : toast({ variant: "destructive", title: "กรุณาเข้าสู่ระบบ" })}
                          >
                            <Repeat2 className="h-6 w-6" />
                          </Button>
                          {(post.shares_count || 0) > 0 && (
                            <span className="text-sm text-muted-foreground -ml-1">{post.shares_count}</span>
                          )}
                        </div>
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
                        onClick={() => handleSave(post.id, post.original_post_id)}
                      >
                        <Bookmark 
                          className={`h-6 w-6 transition-colors ${
                            savedPosts.has(post.original_post_id || post.id) 
                              ? "fill-foreground"
                              : ""
                          }`} 
                        />
                      </Button>
                    </div>

                    {/* Likes & Reposts count */}
                    <div className="px-4 pb-2 flex items-center gap-4">
                      <span className="font-semibold text-sm">
                        {post.likes_count.toLocaleString()} ถูกใจ
                      </span>
                      {(post.shares_count || 0) > 0 && (
                        <span className="text-muted-foreground text-sm flex items-center gap-1">
                          <Repeat2 className="h-4 w-4" />
                          {post.shares_count} รีโพสต์
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-4 space-y-2">
                      {/* Title & Description */}
                      <div>
                        <span className="font-semibold mr-2">
                          {getDisplayName(post.user_profile, post.artist_profile)}
                        </span>
                        <span className="text-foreground">{post.title}</span>
                        {post.description && (
                          <p className="text-muted-foreground text-sm mt-1">
                            {renderTextWithMentions(post.description)}
                          </p>
                        )}
                      </div>

                      {/* Category, Tools & Tags */}
                      {(post.category || (post.tools_used && post.tools_used.length > 0) || (post.hashtags && post.hashtags.length > 0)) && (
                        <div className="flex flex-wrap gap-1">
                          {post.category && (
                            <Badge variant="secondary" className="text-xs">
                              {post.category}
                            </Badge>
                          )}
                          {post.tools_used?.slice(0, 3).map((tool, i) => (
                            <Badge key={`tool-${i}`} variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                              🛠 {tool}
                            </Badge>
                          ))}
                          {post.hashtags?.slice(0, 3).map((tag, i) => (
                            <Badge key={`tag-${i}`} variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* View comments */}
                      {(post.comments_count || 0) > 0 && (
                        <button 
                          className="text-muted-foreground text-sm"
                          onClick={() => handleOpenPost(post)}
                        >
                          ดูความคิดเห็นทั้งหมด {post.comments_count} รายการ
                        </button>
                      )}
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>

              {/* Load More Trigger */}
              <div ref={loadMoreRef} className="py-8 text-center">
                {loadingMore && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">กำลังโหลดเพิ่ม...</span>
                  </div>
                )}
                {!hasMore && posts.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    คุณดูโพสต์ทั้งหมดแล้ว ✨
                  </p>
                )}
              </div>
            </div>
          )}
            </div>

            {/* Sidebar (desktop): sticky + internal scroll (scrollbar hidden) */}
            <aside className="hidden lg:block w-80 shrink-0">
              <div
                ref={sidebarScrollRef}
                className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hidden pr-1"
              >
                <div className="space-y-4">
                  {/* Active Filters Display */}
                  {(selectedTag || selectedCategory) && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary">กำลังกรอง:</span>
                        <button
                          onClick={() => {
                            setSelectedTag(null);
                            setSelectedCategory(null);
                          }}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          ล้างทั้งหมด
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTag && (
                          <Badge variant="secondary" className="gap-1">
                            #{selectedTag}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedTag(null)} />
                          </Badge>
                        )}
                        {selectedCategory && (
                          <Badge variant="secondary" className="gap-1">
                            {selectedCategory}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory(null)} />
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <CommunitySidebar
                    selectedTag={selectedTag}
                    selectedCategory={selectedCategory}
                    onTagSelect={setSelectedTag}
                    onCategorySelect={setSelectedCategory}
                  />
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Mobile Sidebar Drawer */}
        <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-shadow z-40 lg:hidden bg-background border-2"
            >
              <SlidersHorizontal className="h-5 w-5" />
              {(selectedTag || selectedCategory) && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {(selectedTag ? 1 : 0) + (selectedCategory ? 1 : 0)}
                </span>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                ตัวกรองและหมวดหมู่
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto max-h-[70vh]">
              {/* Active Filters Display */}
              {(selectedTag || selectedCategory) && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-primary">กำลังกรอง:</span>
                    <button
                      onClick={() => {
                        setSelectedTag(null);
                        setSelectedCategory(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      ล้างทั้งหมด
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTag && (
                      <Badge variant="secondary" className="gap-1">
                        #{selectedTag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedTag(null)} />
                      </Badge>
                    )}
                    {selectedCategory && (
                      <Badge variant="secondary" className="gap-1">
                        {selectedCategory}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory(null)} />
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              <CommunitySidebar 
                selectedTag={selectedTag}
                selectedCategory={selectedCategory}
                onTagSelect={(tag) => {
                  setSelectedTag(tag);
                  setMobileDrawerOpen(false);
                  setTimeout(() => {
                    feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 150);
                }}
                onCategorySelect={(cat) => {
                  setSelectedCategory(cat);
                  setMobileDrawerOpen(false);
                  setTimeout(() => {
                    feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 150);
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Floating Create Button - Only for Artists */}
        {user && isArtist && (
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

        {/* Buyer warning - show create button that opens warning */}
        {user && isBuyer && !isArtist && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-shadow z-50"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-5 w-5" />
                  ไม่สามารถโพสต์ได้
                </DialogTitle>
              </DialogHeader>
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700 dark:text-orange-300">
                  <strong>การโพสต์ผลงานสำหรับศิลปินเท่านั้น</strong>
                  <p className="mt-2 text-sm">
                    คุณสามารถดู กดถูกใจ แสดงความคิดเห็น และแชร์ผลงานของศิลปินได้ 
                    แต่การโพสต์ผลงานใหม่จำกัดเฉพาะศิลปินที่ลงทะเบียนแล้วเท่านั้น
                  </p>
                  <p className="mt-2 text-sm">
                    หากคุณต้องการเป็นศิลปิน สามารถสมัครได้ที่หน้าการตั้งค่าบัญชี
                  </p>
                </AlertDescription>
              </Alert>
            </DialogContent>
          </Dialog>
        )}
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
                  <Label htmlFor="description">คำอธิบาย (พิมพ์ @ เพื่อแท็กผู้ใช้)</Label>
                  <MentionInput
                    value={description}
                    onChange={setDescription}
                    placeholder="เล่าเรื่องราวเบื้องหลังผลงาน... พิมพ์ @ เพื่อแท็กผู้ใช้"
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
                  <Label>Tags / แท็ก (#)</Label>
                  <TagInput
                    value={hashtags}
                    onChange={setHashtags}
                    placeholder="พิมพ์แล้วกด Enter หรือเลือกจากรายการ"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    เพิ่ม Tags เพื่อให้ค้นหาได้ง่ายขึ้น ไม่บังคับกรอก
                  </p>
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

                {/* Add to Portfolio checkbox */}
                {artistProfile && imageFile && (
                  <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="addToPortfolio"
                        checked={addToPortfolio}
                        onCheckedChange={(checked) => setAddToPortfolio(checked === true)}
                      />
                      <div className="flex items-center gap-2">
                        <FolderPlus className="h-4 w-4 text-primary" />
                        <Label htmlFor="addToPortfolio" className="text-sm font-medium cursor-pointer">
                          Add to Portfolio
                        </Label>
                      </div>
                    </div>
                    
                    {addToPortfolio && (
                      <div className="pl-6">
                        <Label htmlFor="price" className="text-sm text-muted-foreground">
                          ราคา (บาท) - กรอก 0 หากไม่ต้องการขาย
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                )}
                
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
                    <>
                      {addToPortfolio && <FolderPlus className="mr-2 h-4 w-4" />}
                      {addToPortfolio ? "โพสต์ & เพิ่มใน Portfolio" : "โพสต์ผลงาน"}
                    </>
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
                      <Link to={`/profile/${selectedPost.user_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
                      </Link>
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
                      <p className="text-muted-foreground mt-2 text-sm">
                        {renderTextWithMentions(selectedPost.description)}
                      </p>
                    )}
                    {(selectedPost.tools_used && selectedPost.tools_used.length > 0) || (selectedPost.hashtags && selectedPost.hashtags.length > 0) ? (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {selectedPost.tools_used?.map((tool) => (
                          <Badge key={`tool-${tool}`} variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                            🛠 {tool}
                          </Badge>
                        ))}
                        {selectedPost.hashtags?.map((tag) => (
                          <Badge key={`tag-${tag}`} variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-4">
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
                    
                    {/* Share Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/community?post=${selectedPost.id}`;
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
                        }}
                        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-[#1877F2]"
                        title="แชร์ไปยัง Facebook"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/community?post=${selectedPost.id}`;
                          const text = `${selectedPost.title} - ดูผลงานสร้างสรรค์`;
                          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
                        }}
                        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="แชร์ไปยัง X"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/community?post=${selectedPost.id}`;
                          const text = `${selectedPost.title} - ดูผลงานสร้างสรรค์`;
                          window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
                        }}
                        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-[#00B900]"
                        title="แชร์ไปยัง LINE"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          const url = `${window.location.origin}/community?post=${selectedPost.id}`;
                          await navigator.clipboard.writeText(url);
                          toast({
                            title: "คัดลอกลิงก์แล้ว!",
                            description: "ลิงก์โพสต์ถูกคัดลอกไปยังคลิปบอร์ด"
                          });
                        }}
                        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="คัดลอกลิงก์"
                      >
                        <Link2 className="h-5 w-5" />
                      </button>
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
                        <div key={comment.id} className="space-y-3">
                          {/* Parent Comment */}
                          <div className="group flex gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={comment.user_profile?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getDisplayName(comment.user_profile, comment.artist_profile)[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              {editingComment?.id === comment.id ? (
                                // Edit mode
                                <div className="space-y-2">
                                  <Textarea
                                    value={editCommentContent}
                                    onChange={(e) => setEditCommentContent(e.target.value)}
                                    className="min-h-[60px] text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={handleEditComment}
                                      disabled={!editCommentContent.trim() || savingCommentEdit}
                                    >
                                      {savingCommentEdit ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      ) : null}
                                      บันทึก
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingComment(null);
                                        setEditCommentContent("");
                                      }}
                                    >
                                      ยกเลิก
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                // Display mode
                                <>
                                  <p className="text-sm">
                                    <span className="font-semibold mr-1">
                                      {getDisplayName(comment.user_profile, comment.artist_profile)}
                                    </span>
                                    {comment.artist_profile?.is_verified && (
                                      <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0 mr-1">
                                        ✓
                                      </Badge>
                                    )}
                                    {isBuyerUser(comment.artist_profile) && (
                                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-sky-500 text-white border-0 mr-2">
                                        Buyer
                                      </Badge>
                                    )}
                                    {renderTextWithMentions(comment.content)}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {formatTimeAgo(comment.created_at)}
                                    </span>
                                    {/* Reply button */}
                                    {user && (
                                      <button
                                        onClick={() => {
                                          setReplyingToComment(comment);
                                          setReplyContent("");
                                        }}
                                        className="text-xs text-muted-foreground hover:text-foreground font-medium"
                                      >
                                        ตอบกลับ
                                      </button>
                                    )}
                                    {/* Edit button for own comments */}
                                    {user && user.id === comment.user_id && (
                                      <button
                                        onClick={() => {
                                          setEditingComment(comment);
                                          setEditCommentContent(comment.content);
                                        }}
                                        className="text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        แก้ไข
                                      </button>
                                    )}
                                    {/* Delete button for own comments OR post owner */}
                                    {user && (user.id === comment.user_id || user.id === selectedPost?.user_id) && (
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        disabled={deletingCommentId === comment.id}
                                        className="text-xs text-destructive hover:text-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        {deletingCommentId === comment.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin inline" />
                                        ) : (
                                          "ลบ"
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Nested Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <>
                              {/* Show expand button if replies not yet expanded */}
                              {!expandedReplies.has(comment.id) ? (
                                <button
                                  onClick={() => setExpandedReplies(prev => new Set([...prev, comment.id]))}
                                  className="ml-11 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  ดูการตอบกลับทั้ง {comment.replies.length} รายการ
                                </button>
                              ) : (
                                <div className="ml-11 space-y-3 border-l-2 border-muted pl-3">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className="group flex gap-2">
                                      <Avatar className="h-6 w-6 shrink-0">
                                        <AvatarImage src={reply.user_profile?.avatar_url || undefined} />
                                        <AvatarFallback className="text-[10px]">
                                          {getDisplayName(reply.user_profile, reply.artist_profile)[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        {editingComment?.id === reply.id ? (
                                          // Edit mode for reply
                                          <div className="space-y-2">
                                            <Textarea
                                              value={editCommentContent}
                                              onChange={(e) => setEditCommentContent(e.target.value)}
                                              className="min-h-[50px] text-sm"
                                              autoFocus
                                            />
                                            <div className="flex gap-2">
                                              <Button 
                                                size="sm" 
                                                onClick={handleEditComment}
                                                disabled={!editCommentContent.trim() || savingCommentEdit}
                                              >
                                                {savingCommentEdit ? (
                                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                ) : null}
                                                บันทึก
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant="ghost"
                                                onClick={() => {
                                                  setEditingComment(null);
                                                  setEditCommentContent("");
                                                }}
                                              >
                                                ยกเลิก
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          // Display mode for reply
                                          <>
                                            <p className="text-sm">
                                              <span className="font-semibold mr-1 text-xs">
                                                {getDisplayName(reply.user_profile, reply.artist_profile)}
                                              </span>
                                              {reply.artist_profile?.is_verified && (
                                                <Badge variant="secondary" className="h-3.5 px-1 text-[9px] bg-blue-500 text-white border-0 mr-1">
                                                  ✓
                                                </Badge>
                                              )}
                                              {isBuyerUser(reply.artist_profile) && (
                                                <Badge variant="secondary" className="h-3.5 px-1 text-[9px] bg-sky-500 text-white border-0 mr-1">
                                                  Buyer
                                                </Badge>
                                              )}
                                              {renderTextWithMentions(reply.content)}
                                            </p>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-muted-foreground">
                                                {formatTimeAgo(reply.created_at)}
                                              </span>
                                              {/* Reply button for nested reply - replies to parent comment */}
                                              {user && (
                                                <button
                                                  onClick={() => {
                                                    setReplyingToComment(comment);
                                                    setReplyContent(`@${getDisplayName(reply.user_profile, reply.artist_profile)} `);
                                                  }}
                                                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                                                >
                                                  ตอบกลับ
                                                </button>
                                              )}
                                              {/* Edit button for own replies */}
                                              {user && user.id === reply.user_id && (
                                                <button
                                                  onClick={() => {
                                                    setEditingComment(reply);
                                                    setEditCommentContent(reply.content);
                                                  }}
                                                  className="text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                  แก้ไข
                                                </button>
                                              )}
                                              {/* Delete button for own replies OR post owner */}
                                              {user && (user.id === reply.user_id || user.id === selectedPost?.user_id) && (
                                                <button
                                                  onClick={() => handleDeleteComment(reply.id)}
                                                  disabled={deletingCommentId === reply.id}
                                                  className="text-xs text-destructive hover:text-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                  {deletingCommentId === reply.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin inline" />
                                                  ) : (
                                                    "ลบ"
                                                  )}
                                                </button>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {/* Collapse button */}
                                  <button
                                    onClick={() => setExpandedReplies(prev => {
                                      const next = new Set(prev);
                                      next.delete(comment.id);
                                      return next;
                                    })}
                                    className="text-xs text-muted-foreground hover:text-foreground font-medium"
                                  >
                                    ซ่อนการตอบกลับ
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {/* Reply Input Box - Facebook style at bottom */}
                          {replyingToComment?.id === comment.id && user && (
                            <div className="ml-11 mt-2">
                              <div className="bg-muted/50 rounded-lg p-2 border border-border">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                  <span>ตอบกลับ</span>
                                  <span className="font-medium text-foreground">
                                    {getDisplayName(comment.user_profile, comment.artist_profile)}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setReplyingToComment(null);
                                      setReplyContent("");
                                    }}
                                    className="ml-auto text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="flex gap-2 items-center">
                                  <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarImage src={user?.user_metadata?.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px]">
                                      {(user?.user_metadata?.full_name || user?.email || "U")[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 relative">
                                    <input
                                      type="text"
                                      value={replyContent}
                                      onChange={(e) => setReplyContent(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && replyContent.trim() && !submittingReply) {
                                          e.preventDefault();
                                          handleSubmitReply(comment);
                                        }
                                      }}
                                      placeholder="เขียนการตอบกลับ..."
                                      className="w-full bg-background border border-border rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                      autoFocus
                                      disabled={submittingReply}
                                    />
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => handleSubmitReply(comment)}
                                    disabled={!replyContent.trim() || submittingReply}
                                  >
                                    {submittingReply ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Send className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  {user && (
                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <MentionInput
                            value={newComment}
                            onChange={setNewComment}
                            placeholder="เขียนความคิดเห็น... พิมพ์ @ เพื่อแท็กผู้ใช้"
                            rows={1}
                            className="min-h-[40px] resize-none"
                          />
                        </div>
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

        {/* Share/Repost Dialog */}
        <Dialog open={!!shareDialogPost} onOpenChange={(open) => !open && setShareDialogPost(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Repeat2 className="h-5 w-5" />
                {shareDialogPost && repostedPosts.has(shareDialogPost.original_post_id || shareDialogPost.id) 
                  ? 'ยกเลิก Repost' 
                  : 'แชร์โพสต์'}
              </DialogTitle>
            </DialogHeader>
            
            {shareDialogPost && (
              <div className="space-y-4">
                {/* Preview of original post */}
                <div className="border border-border rounded-lg p-3 flex gap-3">
                  <img
                    src={shareDialogPost.image_url}
                    alt={shareDialogPost.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={shareDialogPost.user_profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(shareDialogPost.artist_profile?.artist_name || shareDialogPost.user_profile?.full_name || "U")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {shareDialogPost.artist_profile?.artist_name || shareDialogPost.user_profile?.full_name || "ผู้ใช้"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold truncate">{shareDialogPost.title}</p>
                  </div>
                </div>

                {/* Caption input - only show for new reposts */}
                {!repostedPosts.has(shareDialogPost.original_post_id || shareDialogPost.id) && (
                  <div>
                    <Label htmlFor="shareCaption">เพิ่มข้อความ (ไม่บังคับ)</Label>
                    <Input
                      id="shareCaption"
                      value={shareCaption}
                      onChange={(e) => setShareCaption(e.target.value)}
                      placeholder="พูดอะไรเกี่ยวกับโพสต์นี้..."
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Info message for already reposted */}
                {repostedPosts.has(shareDialogPost.original_post_id || shareDialogPost.id) && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    คุณได้แชร์โพสต์นี้แล้ว กดปุ่มด้านล่างเพื่อยกเลิก
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShareDialogPost(null);
                      setShareCaption("");
                    }}
                  >
                    ปิด
                  </Button>
                  <Button
                    className="flex-1"
                    variant={repostedPosts.has(shareDialogPost.original_post_id || shareDialogPost.id) ? "destructive" : "default"}
                    onClick={handleRepost}
                    disabled={sharingPost}
                  >
                    {sharingPost ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังดำเนินการ...
                      </>
                    ) : repostedPosts.has(shareDialogPost.original_post_id || shareDialogPost.id) ? (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        ยกเลิก Repost
                      </>
                    ) : (
                      <>
                        <Repeat2 className="mr-2 h-4 w-4" />
                        แชร์โพสต์
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Report Post Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={(open) => {
          setReportDialogOpen(open);
          if (!open) {
            setReportingPost(null);
            setReportReason("");
            setReportDescription("");
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>รายงานโพสต์</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>เหตุผลในการรายงาน</Label>
                <div className="grid grid-cols-1 gap-2">
                  {reportReasons.map((reason) => (
                    <button
                      key={reason.value}
                      type="button"
                      onClick={() => setReportReason(reason.value)}
                      className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                        reportReason === reason.value 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="post-report-description">รายละเอียดเพิ่มเติม (ไม่บังคับ)</Label>
                <Textarea
                  id="post-report-description"
                  placeholder="อธิบายเพิ่มเติมว่าเกิดอะไรขึ้น..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setReportDialogOpen(false);
                    setReportingPost(null);
                    setReportReason("");
                    setReportDescription("");
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  disabled={!reportReason || submittingReport}
                  onClick={async () => {
                    if (!user || !reportingPost || !reportReason) return;
                    setSubmittingReport(true);
                    try {
                      await supabase
                        .from('user_reports')
                        .insert({ 
                          reporter_id: user.id, 
                          reported_id: reportingPost.user_id,
                          reason: `post_${reportReason}`,
                          description: `โพสต์: "${reportingPost.title}"\n${reportDescription.trim() || ""}`
                        });
                      toast({
                        title: "รายงานโพสต์",
                        description: "ขอบคุณสำหรับการรายงาน เราจะตรวจสอบโดยเร็ว"
                      });
                      setReportDialogOpen(false);
                      setReportingPost(null);
                      setReportReason("");
                      setReportDescription("");
                    } catch (error) {
                      toast({
                        variant: "destructive",
                        title: "เกิดข้อผิดพลาด",
                        description: "ไม่สามารถส่งรายงานได้"
                      });
                    } finally {
                      setSubmittingReport(false);
                    }
                  }}
                >
                  {submittingReport ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  ส่งรายงาน
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Post Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingPost(null);
            setEditTitle("");
            setEditDescription("");
            setEditCategory("");
            setEditToolsUsed("");
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>แก้ไขโพสต์</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-title">ชื่อผลงาน *</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="ชื่อผลงานของคุณ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">คำอธิบาย</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="อธิบายเกี่ยวกับผลงานของคุณ..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>หมวดหมู่</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tools">เครื่องมือที่ใช้</Label>
                <Input
                  id="edit-tools"
                  value={editToolsUsed}
                  onChange={(e) => setEditToolsUsed(e.target.value)}
                  placeholder="เช่น Photoshop, Procreate (คั่นด้วยเครื่องหมายจุลภาค)"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags / แท็ก (#)</Label>
                <TagInput
                  value={editHashtags}
                  onChange={setEditHashtags}
                  placeholder="พิมพ์แล้วกด Enter หรือเลือกจากรายการ"
                />
                <p className="text-xs text-muted-foreground">
                  เพิ่ม Tags เพื่อให้ค้นหาได้ง่ายขึ้น ไม่บังคับกรอก
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingPost(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  disabled={!editTitle.trim() || savingEdit}
                  onClick={handleSaveEdit}
                >
                  {savingEdit ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  บันทึกการแก้ไข
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Post Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeletingPost(null);
          }
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>ยืนยันการลบโพสต์</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-muted-foreground">
                คุณต้องการลบโพสต์ "{deletingPost?.title}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </p>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeletingPost(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmingDelete}
                  onClick={handleConfirmDelete}
                >
                  {confirmingDelete ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  ลบโพสต์
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
