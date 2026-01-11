import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, UserCheck, Grid3X3, LayoutGrid, ExternalLink, Settings, Heart, MessageCircle, Bookmark, Share2, Repeat2, X, Send, Loader2, MoreHorizontal, VolumeX, Flag, Ban, Star } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { ProfileTagFilter } from "@/components/profile/ProfileTagFilter";
import { supabase } from "@/integrations/supabase/client";
import OptimizedImage from "@/components/ui/OptimizedImage";
import MasonryGrid, { MasonryItem } from "@/components/ui/MasonryGrid";

interface UserProfileData {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  cover_url: string | null;
  cover_position_y: number | null;
  avatar_position_x: number | null;
  avatar_position_y: number | null;
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
  cover_url: string | null;
  cover_position_y: number | null;
  avatar_position_x: number | null;
  avatar_position_y: number | null;
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
  hashtags?: string[] | null;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  user_id?: string;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  artist_profile?: {
    artist_name: string;
    is_verified: boolean;
  };
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
  const { user, isArtist } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isUserHidden } = useBlockedUsers();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfileData | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [profileArtworks, setProfileArtworks] = useState<Array<{ id: string; image_url: string; title: string }>>([]);
  const [loadingProfileArtworks, setLoadingProfileArtworks] = useState(false);
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
  
  // Liked posts tab state
  const [likedPosts, setLikedPosts] = useState<CommunityPost[]>([]);
  const [likedPostsLoading, setLikedPostsLoading] = useState(false);
  
  // Saved posts tab state
  const [savedPostsList, setSavedPostsList] = useState<CommunityPost[]>([]);
  const [savedPostsLoading, setSavedPostsLoading] = useState(false);
  
  // Repost state
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set());
  const [repostDialogPost, setRepostDialogPost] = useState<CommunityPost | null>(null);
  const [repostCaption, setRepostCaption] = useState("");
  const [reposting, setReposting] = useState(false);

  // Block/Mute state
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Tag filter state
  const [selectedPostsTag, setSelectedPostsTag] = useState<string | null>(null);
  const [selectedSavedTag, setSelectedSavedTag] = useState<string | null>(null);

  const reportReasons = [
    { value: "spam", label: "สแปมหรือโฆษณา" },
    { value: "harassment", label: "คุกคามหรือรังแก" },
    { value: "inappropriate_content", label: "เนื้อหาไม่เหมาะสม" },
    { value: "impersonation", label: "แอบอ้างตัวตน" },
    { value: "copyright", label: "ละเมิดลิขสิทธิ์" },
    { value: "scam", label: "หลอกลวง/ฉ้อโกง" },
    { value: "other", label: "อื่นๆ" }
  ];

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

  // Fetch reposted posts for current user
  useEffect(() => {
    const fetchRepostedPosts = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('shared_posts')
        .select('post_id')
        .eq('user_id', user.id);
      
      if (data) {
        setRepostedPosts(new Set(data.map(s => s.post_id)));
      }
    };
    fetchRepostedPosts();
  }, [user]);

  // Fetch block/mute status
  useEffect(() => {
    const fetchBlockMuteStatus = async () => {
      if (!user || !userId || user.id === userId) return;
      
      const [blockResult, muteResult] = await Promise.all([
        supabase
          .from('user_blocks')
          .select('id')
          .eq('blocker_id', user.id)
          .eq('blocked_id', userId)
          .maybeSingle(),
        supabase
          .from('user_mutes')
          .select('id')
          .eq('muter_id', user.id)
          .eq('muted_id', userId)
          .maybeSingle()
      ]);
      
      setIsBlocked(!!blockResult.data);
      setIsMuted(!!muteResult.data);
    };
    fetchBlockMuteStatus();
  }, [user, userId]);

  // Check if viewing own profile
  const isOwner = user?.id === userId;

  // Fetch liked posts when tab changes to likes
  useEffect(() => {
    if (activeTab === 'likes' && userId) {
      fetchLikedPosts();
    }
    // Only fetch saved posts for own profile (RLS restricts access)
    if (activeTab === 'saved' && userId && isOwner) {
      fetchSavedPostsList();
    }
  }, [activeTab, userId, isOwner]);

  const fetchLikedPosts = async () => {
    if (!userId) return;
    setLikedPostsLoading(true);

    try {
      // Get all likes by this user
      const { data: likesData } = await supabase
        .from('community_likes')
        .select('post_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!likesData || likesData.length === 0) {
        setLikedPosts([]);
        return;
      }

      // Get the post details for each liked post
      const postIds = likesData.map(l => l.post_id);
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('*')
        .in('id', postIds);

      if (!postsData) {
        setLikedPosts([]);
        return;
      }

      // Fetch additional details for each post
      const postsWithDetails = await Promise.all(
        postsData.map(async (post) => {
          // Get user profile
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', post.user_id)
            .maybeSingle();

          // Get artist profile
          const { data: artistData } = await supabase
            .from('artist_profiles')
            .select('artist_name, is_verified')
            .eq('user_id', post.user_id)
            .maybeSingle();

          // Get comments count
          const { count: commentsCount } = await supabase
            .from('community_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Get likes count
          const { count: likesCount } = await supabase
            .from('community_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            user_profile: userProfile,
            artist_profile: artistData,
            comments_count: commentsCount || 0,
            likes_count: likesCount || 0,
            is_liked: true // User has liked this post
          };
        })
      );

      // Sort by like time (most recent first)
      const sortedPosts = postsWithDetails.sort((a, b) => {
        const aLike = likesData.find(l => l.post_id === a.id);
        const bLike = likesData.find(l => l.post_id === b.id);
        return new Date(bLike?.created_at || 0).getTime() - new Date(aLike?.created_at || 0).getTime();
      });

      setLikedPosts(sortedPosts);
    } catch (error) {
      console.error('Error fetching liked posts:', error);
    } finally {
      setLikedPostsLoading(false);
    }
  };

  const fetchSavedPostsList = async () => {
    if (!userId) return;
    setSavedPostsLoading(true);

    try {
      // Get all saved posts by this user
      const { data: savedData } = await supabase
        .from('saved_posts')
        .select('post_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!savedData || savedData.length === 0) {
        setSavedPostsList([]);
        return;
      }

      // Get the post details for each saved post
      const postIds = savedData.map(s => s.post_id);
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('*')
        .in('id', postIds);

      if (!postsData) {
        setSavedPostsList([]);
        return;
      }

      // Fetch additional details for each post
      const postsWithDetails = await Promise.all(
        postsData.map(async (post) => {
          // Get user profile
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', post.user_id)
            .maybeSingle();

          // Get artist profile
          const { data: artistData } = await supabase
            .from('artist_profiles')
            .select('artist_name, is_verified')
            .eq('user_id', post.user_id)
            .maybeSingle();

          // Get comments count
          const { count: commentsCount } = await supabase
            .from('community_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Get likes count
          const { count: likesCount } = await supabase
            .from('community_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Check if current user liked this post
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
            user_profile: userProfile,
            artist_profile: artistData,
            comments_count: commentsCount || 0,
            likes_count: likesCount || 0,
            is_liked: isLiked,
            is_saved: true
          };
        })
      );

      // Sort by save time (most recent first)
      const sortedPosts = postsWithDetails.sort((a, b) => {
        const aSave = savedData.find(s => s.post_id === a.id);
        const bSave = savedData.find(s => s.post_id === b.id);
        return new Date(bSave?.created_at || 0).getTime() - new Date(aSave?.created_at || 0).getTime();
      });

      setSavedPostsList(sortedPosts);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setSavedPostsLoading(false);
    }
  };

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
        const { data: artworksData, error: artworksError } = await supabase
          .from('artworks')
          .select('id, title, image_url, price, is_sold')
          .eq('artist_id', artistData.id)
          .order('created_at', { ascending: false });
        
        if (artworksError) {
          console.error('Error fetching artworks:', artworksError);
        } else {
          console.log('Fetched artworks:', artworksData?.length || 0, 'for artist_id:', artistData.id);
        }
        
        setArtworks(artworksData || []);
        // Also set profile artworks for comment dialog (limit to 6)
        const profileArtworksData = (artworksData || []).slice(0, 6).map(aw => ({
          id: aw.id,
          image_url: aw.image_url,
          title: aw.title
        }));
        console.log('Setting profile artworks:', profileArtworksData.length);
        setProfileArtworks(profileArtworksData);
      } else {
        console.log('No artist profile found for user:', userId);
        setProfileArtworks([]);
      }

      // Fetch community posts with additional data
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('id, title, description, image_url, likes_count, created_at, category, tools_used, hashtags')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // ✅ OPTIMIZED: Batch fetch all counts and likes status
      const postIds = (postsData || []).map(p => p.id);
      
      const [likesCountsResult, commentsCountsResult, userLikesResult] = await Promise.all([
        // Likes counts
        postIds.length > 0 ? supabase
          .from('community_likes')
          .select('post_id')
          .in('post_id', postIds)
          .then(({ data }) => {
            const counts: Record<string, number> = {};
            (data || []).forEach(like => {
              counts[like.post_id] = (counts[like.post_id] || 0) + 1;
            });
            return counts;
          }) : Promise.resolve({}),
        
        // Comments counts
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
          }) : Promise.resolve({}),
        
        // User's likes (if logged in)
        user && postIds.length > 0 ? supabase
          .from('community_likes')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', user.id)
          .then(({ data }) => new Set((data || []).map(l => l.post_id))) : Promise.resolve(new Set<string>())
      ]);

      // Map data in memory (fast)
      const postsWithDetails = (postsData || []).map((post) => ({
        ...post,
        likes_count: likesCountsResult[post.id] || 0,
        comments_count: commentsCountsResult[post.id] || 0,
        is_liked: userLikesResult.has(post.id)
      }));
      
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

  // Like handler for liked tab (updates likedPosts state)
  const handleLikeInLikedTab = async (postId: string, isLiked: boolean) => {
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

        // Remove from liked posts list or update state
        setLikedPosts(likedPosts.map(post => 
          post.id === postId 
            ? { ...post, is_liked: false, likes_count: Math.max(0, post.likes_count - 1) }
            : post
        ));
      } else {
        // Like
        await supabase
          .from('community_likes')
          .insert({ post_id: postId, user_id: user.id });

        setLikedPosts(likedPosts.map(post => 
          post.id === postId 
            ? { ...post, is_liked: true, likes_count: post.likes_count + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };
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

  // Like handler for saved tab
  const handleLikeInSavedTab = async (postId: string, isLiked: boolean) => {
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

        setSavedPostsList(savedPostsList.map(post => 
          post.id === postId 
            ? { ...post, is_liked: false, likes_count: Math.max(0, post.likes_count - 1) }
            : post
        ));
      } else {
        await supabase
          .from('community_likes')
          .insert({ post_id: postId, user_id: user.id });

        setSavedPostsList(savedPostsList.map(post => 
          post.id === postId 
            ? { ...post, is_liked: true, likes_count: post.likes_count + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  // Save handler for saved tab (removes from list when unsaved)
  const handleSaveInSavedTab = async (postId: string) => {
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
        // Remove from saved posts list
        setSavedPostsList(savedPostsList.filter(post => post.id !== postId));
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

  // Repost handler
  const handleRepost = async () => {
    if (!user || !repostDialogPost) return;
    
    const postId = repostDialogPost.id;
    const alreadyReposted = repostedPosts.has(postId);
    
    setReposting(true);
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
            caption: repostCaption.trim() || null
          });

        setRepostedPosts(prev => new Set(prev).add(postId));

        // Notify original poster
        if (userId && userId !== user.id) {
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
            user_id: userId,
            title: 'โพสต์ของคุณถูกแชร์! 🔁',
            message: `${sharerName} แชร์ผลงาน "${repostDialogPost.title}" ของคุณ`,
            type: 'share',
            reference_id: postId
          });
        }

        toast({
          title: "แชร์โพสต์สำเร็จ! 🔁",
          description: "โพสต์ถูกแชร์ไปยังโปรไฟล์ของคุณแล้ว"
        });
      }

      setRepostDialogPost(null);
      setRepostCaption("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message
      });
    } finally {
      setReposting(false);
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

      // Filter out comments from blocked/muted users
      const filteredComments = commentsWithProfiles.filter(
        comment => !isUserHidden(comment.user_id)
      );

      setComments(filteredComments);
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

  // Filter posts by tag (only use hashtags field, not tools_used or description)
  const filteredPosts = useMemo(() => {
    if (!selectedPostsTag) return posts;
    return posts.filter(post => {
      return post.hashtags?.includes(selectedPostsTag);
    });
  }, [posts, selectedPostsTag]);

  // Filter saved posts by tag (only use hashtags field)
  const filteredSavedPosts = useMemo(() => {
    if (!selectedSavedTag) return savedPostsList;
    return savedPostsList.filter(post => {
      return post.hashtags?.includes(selectedSavedTag);
    });
  }, [savedPostsList, selectedSavedTag]);

  const displayName = artistProfile?.artist_name || profile?.display_name || profile?.full_name || 'ผู้ใช้';
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

  const displayCover = artistProfile?.cover_url || profile?.cover_url;
  const displayCoverPositionY = artistProfile?.cover_position_y ?? profile?.cover_position_y ?? 50;
  const displayAvatarPositionX = artistProfile?.avatar_position_x ?? profile?.avatar_position_x ?? 50;
  const displayAvatarPositionY = artistProfile?.avatar_position_y ?? profile?.avatar_position_y ?? 50;

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Cover Image - Taller */}
        <div className="relative w-full h-64 md:h-80 lg:h-96 bg-gradient-to-b from-muted to-background overflow-hidden">
          {displayCover ? (
            <OptimizedImage
              src={displayCover}
              alt="Cover"
              variant="fullscreen"
              className="w-full h-full"
              containerClassName="w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-muted to-background" />
          )}
        </div>

        {/* Profile Section with background */}
        <div className="bg-background border-b">
          <div className="max-w-6xl mx-auto px-4 md:px-8">
            {/* Profile Header - Horizontal Layout like Pixiv */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative pb-6"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                {/* Large Avatar - Only this overlaps the cover */}
                <div className="w-32 h-32 md:w-40 md:h-40 shadow-xl rounded-full overflow-hidden bg-muted flex-shrink-0 -mt-16 md:-mt-24">
                  {displayAvatar ? (
                    <OptimizedImage
                      src={displayAvatar}
                      alt={displayName}
                      variant="thumbnail"
                      className="w-full h-full"
                      aspectRatio="square"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-primary/10 font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Profile Info - On solid background, no overlap */}
                <div className="flex-1 pt-2 md:pt-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left side - Name and stats */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl md:text-2xl font-bold">{displayName}</h1>
                        {artistProfile?.is_verified && <VerificationBadge />}
                      </div>
                      
                      {/* Stats inline */}
                      <div className="flex items-center gap-3 text-sm">
                        <Link 
                          to={`/followers/${userId}?tab=following`}
                          className="hover:text-primary transition-colors"
                        >
                          <span className="font-semibold">{followingCount}</span>
                          <span className="text-muted-foreground ml-1">Following</span>
                        </Link>
                        <Link 
                          to={`/followers/${userId}?tab=followers`}
                          className="hover:text-primary transition-colors"
                        >
                          <span className="font-semibold">{followersCount}</span>
                          <span className="text-muted-foreground ml-1">Followers</span>
                        </Link>
                      </div>

                      {displayBio && (
                        <p className="text-muted-foreground max-w-md text-sm pt-2">{displayBio}</p>
                      )}

                      {artistProfile?.specialty && (
                        <Badge variant="secondary" className="w-fit mt-2">
                          {artistProfile.specialty}
                        </Badge>
                      )}
                    </div>

                    {/* Right side - Action buttons */}
                    <div className="flex items-center gap-2">
                      {user && user.id === userId ? (
                        <Link to={isArtist ? "/artist/edit-profile" : "/settings/edit-profile"}>
                          <Button variant="outline" className="rounded-full px-5">
                            <Settings className="w-4 h-4 mr-2" />
                            แก้ไขโปรไฟล์
                          </Button>
                        </Link>
                      ) : user && user.id !== userId ? (
                        <Button
                          onClick={handleFollow}
                          variant={isFollowing ? "outline" : "default"}
                          className="rounded-full px-6"
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
                      ) : null}
                      
                      {/* Share Profile Button */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={() => {
                          const url = window.location.href;
                          if (navigator.share) {
                            navigator.share({
                              title: `${displayName} - Profile`,
                              url: url
                            });
                          } else {
                            navigator.clipboard.writeText(url);
                            toast({
                              title: "คัดลอกลิงก์แล้ว",
                              description: "ลิงก์โปรไฟล์ถูกคัดลอกไปยังคลิปบอร์ด"
                            });
                          }
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>

                      {/* More Options Menu - Only for other users */}
                      {user && user.id !== userId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => {
                                toast({
                                  title: "แนะนำผู้ใช้",
                                  description: `เพิ่ม ${displayName} ในรายการแนะนำแล้ว`
                                });
                              }}
                            >
                              <Star className="w-4 h-4 mr-2" />
                              แนะนำผู้ใช้นี้
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={async () => {
                                if (!user || !userId) return;
                                try {
                                  if (isMuted) {
                                    await supabase
                                      .from('user_mutes')
                                      .delete()
                                      .eq('muter_id', user.id)
                                      .eq('muted_id', userId);
                                    setIsMuted(false);
                                    toast({
                                      title: "ยกเลิกปิดเสียง",
                                      description: `ยกเลิกปิดเสียง ${displayName} แล้ว`
                                    });
                                  } else {
                                    await supabase
                                      .from('user_mutes')
                                      .insert({ muter_id: user.id, muted_id: userId });
                                    setIsMuted(true);
                                    toast({
                                      title: "ปิดเสียง",
                                      description: `ปิดเสียงการแจ้งเตือนจาก ${displayName} แล้ว`
                                    });
                                  }
                                } catch (error) {
                                  toast({
                                    variant: "destructive",
                                    title: "เกิดข้อผิดพลาด",
                                    description: "ไม่สามารถดำเนินการได้"
                                  });
                                }
                              }}
                            >
                              <VolumeX className="w-4 h-4 mr-2" />
                              {isMuted ? "ยกเลิกปิดเสียง" : "ปิดเสียง"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={async () => {
                                if (!user || !userId) return;
                                try {
                                  if (isBlocked) {
                                    await supabase
                                      .from('user_blocks')
                                      .delete()
                                      .eq('blocker_id', user.id)
                                      .eq('blocked_id', userId);
                                    setIsBlocked(false);
                                    toast({
                                      title: "ยกเลิกบล็อก",
                                      description: `ยกเลิกบล็อก ${displayName} แล้ว`
                                    });
                                  } else {
                                    await supabase
                                      .from('user_blocks')
                                      .insert({ blocker_id: user.id, blocked_id: userId });
                                    setIsBlocked(true);
                                    toast({
                                      title: "บล็อกผู้ใช้",
                                      description: `บล็อก ${displayName} แล้ว`
                                    });
                                  }
                                } catch (error) {
                                  toast({
                                    variant: "destructive",
                                    title: "เกิดข้อผิดพลาด",
                                    description: "ไม่สามารถดำเนินการได้"
                                  });
                                }
                              }}
                              className={isBlocked ? "" : "text-destructive focus:text-destructive"}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              {isBlocked ? "ยกเลิกบล็อก" : "บล็อก"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setReportDialogOpen(true)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Flag className="w-4 h-4 mr-2" />
                              รายงาน
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Report Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>รายงานผู้ใช้</DialogTitle>
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
                <Label htmlFor="report-description">รายละเอียดเพิ่มเติม (ไม่บังคับ)</Label>
                <Textarea
                  id="report-description"
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
                    if (!user || !userId || !reportReason) return;
                    setSubmittingReport(true);
                    try {
                      await supabase
                        .from('user_reports')
                        .insert({ 
                          reporter_id: user.id, 
                          reported_id: userId,
                          reason: reportReason,
                          description: reportDescription.trim() || null
                        });
                      toast({
                        title: "รายงานผู้ใช้",
                        description: "ขอบคุณสำหรับการรายงาน เราจะตรวจสอบโดยเร็ว"
                      });
                      setReportDialogOpen(false);
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

        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4">
          {/* Tabs - Clean underline style */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full max-w-xl mx-auto flex justify-center gap-8 h-auto bg-transparent border-b border-border pb-0">
              <TabsTrigger 
                value="portfolio" 
                className="relative px-1 py-3 bg-transparent text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-colors"
              >
                Portfolio
              </TabsTrigger>
              <TabsTrigger 
                value="posts" 
                className="relative px-1 py-3 bg-transparent text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-colors"
              >
                All posts
              </TabsTrigger>
              <TabsTrigger 
                value="likes" 
                className="relative px-1 py-3 bg-transparent text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-colors"
              >
                Likes
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger 
                  value="saved" 
                  className="relative px-1 py-3 bg-transparent text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-colors"
                >
                  Saved
                </TabsTrigger>
              )}
            </TabsList>

            {/* Portfolio Tab - Masonry Grid (Pinterest/Cara style) */}
            <TabsContent value="portfolio">
              <AnimatePresence mode="wait">
                {artworks.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    <MasonryGrid
                      items={artworks.map((artwork): MasonryItem => ({
                        id: artwork.id,
                        imageUrl: artwork.image_url,
                        alt: artwork.title,
                        // Let MasonryGrid calculate aspect ratio from image dimensions
                        // or use default if not available
                      }))}
                      onItemClick={(item) => {
                        navigate(`/artwork/${item.id}`);
                      }}
                      renderOverlay={(item) => {
                        const artwork = artworks.find(a => a.id === item.id);
                        if (!artwork) return null;
                        return (
                          <div className="w-full">
                            <p className="font-medium text-sm text-white line-clamp-2 mb-1">
                              {artwork.title}
                            </p>
                            <p className="text-xs text-white/90">
                              ฿{artwork.price.toLocaleString()}
                              {artwork.is_sold && (
                                <span className="ml-2 px-1.5 py-0.5 bg-red-500/80 rounded text-[10px]">
                                  ขายแล้ว
                                </span>
                              )}
                            </p>
                          </div>
                        );
                      }}
                      columnWidth={{ desktop: 260, tablet: 240 }}
                      gap={16}
                      minAspectRatio={1} // 1:1 square minimum
                      maxAspectRatio={0.8} // 4:5 portrait maximum (like Cara/Pixiv)
                    />
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
              {/* Tag Filter */}
              {userId && posts.length > 0 && (
                <div className="max-w-2xl mx-auto mt-4">
                  <ProfileTagFilter
                    userId={userId}
                    posts={posts}
                    selectedTag={selectedPostsTag}
                    onTagSelect={setSelectedPostsTag}
                  />
                </div>
              )}
              
              <AnimatePresence mode="wait">
                {filteredPosts.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-2xl mx-auto space-y-6"
                  >
                    {filteredPosts.map((post, index) => (
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
                          <OptimizedImage
                            src={post.image_url}
                            alt={post.title}
                            variant="feed"
                            className="w-full max-h-[600px]"
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
                              onClick={() => user ? setRepostDialogPost(post) : toast({ variant: "destructive", title: "กรุณาเข้าสู่ระบบ" })}
                            >
                              <Repeat2 
                                className={`h-6 w-6 transition-colors ${
                                  repostedPosts.has(post.id) ? "text-green-500" : ""
                                }`} 
                              />
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

                        {/* Tools & Tags */}
                        {((post.tools_used && post.tools_used.length > 0) || (post.hashtags && post.hashtags.length > 0)) && (
                          <div className="px-4 pb-3 flex flex-wrap gap-1">
                            {post.tools_used?.map((tool) => (
                              <Badge key={`tool-${tool}`} variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                🛠 {tool}
                              </Badge>
                            ))}
                            {post.hashtags?.map((tag) => (
                              <span
                                key={`tag-${tag}`}
                                className="text-sm text-blue-500 dark:text-blue-400"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.article>
                    ))}
                  </motion.div>
                ) : posts.length > 0 && filteredPosts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <Grid3X3 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">ไม่มีโพสต์ที่ตรงกับ tag นี้</p>
                    <Button
                      variant="link"
                      onClick={() => setSelectedPostsTag(null)}
                      className="mt-2"
                    >
                      ดูโพสต์ทั้งหมด
                    </Button>
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

            {/* Likes Tab */}
            <TabsContent value="likes">
              <AnimatePresence mode="wait">
                {likedPostsLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center py-16"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </motion.div>
                ) : likedPosts.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-2xl mx-auto space-y-6"
                  >
                    {likedPosts.map((post, index) => {
                      const postDisplayName = post.artist_profile?.artist_name || post.user_profile?.full_name || 'ผู้ใช้';
                      const postDisplayAvatar = post.user_profile?.avatar_url;
                      
                      return (
                        <motion.article
                          key={post.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-card border border-border rounded-xl overflow-hidden"
                        >
                          {/* Post Header */}
                          <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                              <AvatarImage src={postDisplayAvatar || undefined} />
                              <AvatarFallback>{postDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">{postDisplayName}</span>
                                {post.artist_profile?.is_verified && (
                                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">✓</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(post.created_at)}
                              </span>
                            </div>
                          </Link>

                          {/* Post Content */}
                          <div className="px-4 pb-2">
                            <p className="text-foreground">{post.title}</p>
                            {post.description && (
                              <p className="text-muted-foreground text-sm mt-1">{post.description}</p>
                            )}
                          </div>

                          {/* Post Image */}
                          <div className="relative bg-muted">
                            <OptimizedImage
                              src={post.image_url}
                              alt={post.title}
                              variant="feed"
                              className="w-full max-h-[600px]"
                            />
                          </div>

                          {/* Actions */}
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => handleLikeInLikedTab(post.id, post.is_liked || false)}
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
                                onClick={() => user ? setRepostDialogPost(post) : toast({ variant: "destructive", title: "กรุณาเข้าสู่ระบบ" })}
                              >
                                <Repeat2 
                                  className={`h-6 w-6 transition-colors ${
                                    repostedPosts.has(post.id) ? "text-green-500" : ""
                                  }`} 
                                />
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

                          {/* Tools & Tags */}
                          {((post.tools_used && post.tools_used.length > 0) || (post.hashtags && post.hashtags.length > 0)) && (
                            <div className="px-4 pb-3 flex flex-wrap gap-1">
                              {post.tools_used?.map((tool) => (
                                <Badge key={`tool-${tool}`} variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                  🛠 {tool}
                                </Badge>
                              ))}
                              {post.hashtags?.map((tag) => (
                                <span
                                  key={`tag-${tag}`}
                                  className="text-sm text-blue-500 dark:text-blue-400"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </motion.article>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <Heart className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">ยังไม่มีโพสต์ที่ถูกใจ</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* Saved Tab - Only visible for profile owner */}
            {isOwner && (
            <TabsContent value="saved">
              {/* Tag Filter for Saved */}
              {userId && savedPostsList.length > 0 && (
                <div className="max-w-2xl mx-auto mt-4">
                  <ProfileTagFilter
                    userId={userId}
                    posts={savedPostsList}
                    selectedTag={selectedSavedTag}
                    onTagSelect={setSelectedSavedTag}
                  />
                </div>
              )}
              
              <AnimatePresence mode="wait">
                {savedPostsLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center py-16"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </motion.div>
                ) : filteredSavedPosts.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-2xl mx-auto space-y-6"
                  >
                    {filteredSavedPosts.map((post, index) => {
                      const postDisplayName = post.artist_profile?.artist_name || post.user_profile?.full_name || 'ผู้ใช้';
                      const postDisplayAvatar = post.user_profile?.avatar_url;
                      
                      return (
                        <motion.article
                          key={post.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-card border border-border rounded-xl overflow-hidden"
                        >
                          {/* Post Header */}
                          <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                              <AvatarImage src={postDisplayAvatar || undefined} />
                              <AvatarFallback>{postDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">{postDisplayName}</span>
                                {post.artist_profile?.is_verified && (
                                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">✓</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(post.created_at)}
                              </span>
                            </div>
                          </Link>

                          {/* Post Content */}
                          <div className="px-4 pb-2">
                            <p className="text-foreground">{post.title}</p>
                            {post.description && (
                              <p className="text-muted-foreground text-sm mt-1">{post.description}</p>
                            )}
                          </div>

                          {/* Post Image */}
                          <div className="relative bg-muted">
                            <OptimizedImage
                              src={post.image_url}
                              alt={post.title}
                              variant="feed"
                              className="w-full max-h-[600px]"
                            />
                          </div>

                          {/* Actions */}
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => handleLikeInSavedTab(post.id, post.is_liked || false)}
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
                                onClick={() => user ? setRepostDialogPost(post) : toast({ variant: "destructive", title: "กรุณาเข้าสู่ระบบ" })}
                              >
                                <Repeat2 
                                  className={`h-6 w-6 transition-colors ${
                                    repostedPosts.has(post.id) ? "text-green-500" : ""
                                  }`} 
                                />
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
                              onClick={() => handleSaveInSavedTab(post.id)}
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

                          {/* Tools & Tags */}
                          {((post.tools_used && post.tools_used.length > 0) || (post.hashtags && post.hashtags.length > 0)) && (
                            <div className="px-4 pb-3 flex flex-wrap gap-1">
                              {post.tools_used?.map((tool) => (
                                <Badge key={`tool-${tool}`} variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                  🛠 {tool}
                                </Badge>
                              ))}
                              {post.hashtags?.map((tag) => (
                                <span
                                  key={`tag-${tag}`}
                                  className="text-sm text-blue-500 dark:text-blue-400"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </motion.article>
                      );
                    })}
                  </motion.div>
                ) : savedPostsList.length > 0 && filteredSavedPosts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <Bookmark className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">ไม่มีโพสต์ที่ตรงกับ tag นี้</p>
                    <Button
                      variant="link"
                      onClick={() => setSelectedSavedTag(null)}
                      className="mt-2"
                    >
                      ดูโพสต์ทั้งหมด
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <Bookmark className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">ยังไม่มีโพสต์ที่บันทึกไว้</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
            )}
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

              {/* Portfolio Gallery - Show profile owner's artworks */}
              {artistProfile && profileArtworks.length > 0 && (
                <div className="p-4 border-b">
                  <h3 className="text-sm font-semibold mb-3">Portfolio</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {profileArtworks.map((artwork) => (
                      <Link
                        key={artwork.id}
                        to={`/artwork/${artwork.id}`}
                        onClick={() => setSelectedPost(null)}
                        className="relative aspect-square overflow-hidden rounded-lg bg-muted hover:opacity-80 transition-opacity group"
                      >
                        <img
                          src={artwork.image_url}
                          alt={artwork.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            console.error('Error loading artwork image:', artwork.image_url);
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {/* Debug info - remove after testing */}
              {process.env.NODE_ENV === 'development' && (
                <div className="p-2 text-xs text-muted-foreground border-b">
                  Debug: artistProfile={artistProfile ? 'exists' : 'null'}, 
                  profileArtworks={profileArtworks.length} items
                </div>
              )}

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

      {/* Repost Dialog */}
      <Dialog open={!!repostDialogPost} onOpenChange={(open) => !open && setRepostDialogPost(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat2 className="h-5 w-5" />
              {repostDialogPost && repostedPosts.has(repostDialogPost.id) 
                ? 'ยกเลิก Repost' 
                : 'แชร์โพสต์'}
            </DialogTitle>
          </DialogHeader>
          
          {repostDialogPost && (
            <div className="space-y-4">
              {/* Preview of original post */}
              <div className="border border-border rounded-lg p-3 flex gap-3">
                <OptimizedImage
                  src={repostDialogPost.image_url}
                  alt={repostDialogPost.title}
                  variant="thumbnail"
                  className="rounded"
                  containerClassName="w-16 h-16"
                  aspectRatio="square"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={displayAvatar || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {displayName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">
                      {displayName}
                    </span>
                  </div>
                  <p className="text-sm font-semibold truncate">{repostDialogPost.title}</p>
                </div>
              </div>

              {/* Caption input - only show for new reposts */}
              {!repostedPosts.has(repostDialogPost.id) && (
                <div>
                  <Label htmlFor="repostCaption">เพิ่มข้อความ (ไม่บังคับ)</Label>
                  <Input
                    id="repostCaption"
                    value={repostCaption}
                    onChange={(e) => setRepostCaption(e.target.value)}
                    placeholder="พูดอะไรเกี่ยวกับโพสต์นี้..."
                    className="mt-1"
                  />
                </div>
              )}

              {/* Info message for already reposted */}
              {repostedPosts.has(repostDialogPost.id) && (
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
                    setRepostDialogPost(null);
                    setRepostCaption("");
                  }}
                >
                  ปิด
                </Button>
                <Button
                  className="flex-1"
                  variant={repostedPosts.has(repostDialogPost.id) ? "destructive" : "default"}
                  onClick={handleRepost}
                  disabled={reposting}
                >
                  {reposting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : repostedPosts.has(repostDialogPost.id) ? (
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
    </Layout>
  );
}