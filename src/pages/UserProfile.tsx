import { useState, useEffect, useMemo, useRef } from "react";
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
import JustifiedGrid, { JustifiedItem } from "@/components/ui/JustifiedGrid";
import { PostDetailDialog } from "@/components/community/PostDetailDialog";

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
  image_blur_url?: string | null;
  image_small_url?: string | null;
  image_medium_url?: string | null;
  image_large_url?: string | null;
  likes_count: number;
  created_at: string;
  category: string | null;
  tools_used: string[] | null;
  hashtags?: string[] | null;
  comments_count?: number;
  shares_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  user_id?: string;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    display_id?: string | null;
    display_name?: string | null;
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
    display_name: string | null;
  };
  artist_profile?: {
    artist_name: string;
    is_verified: boolean;
    avatar_url?: string | null;
  } | null;
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

// Helper function to normalize avatar URL and ensure high quality
const normalizeAvatarUrl = (avatarUrl: string | null | undefined, size: number = 64): string | undefined => {
  if (!avatarUrl) return undefined;
  
  // If it's already a full URL, add transform parameters for the specified size
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    // Check if it's a Cloudinary URL
    if (avatarUrl.includes('res.cloudinary.com')) {
      // Cloudinary URL format: https://res.cloudinary.com/{cloud}/image/upload/{transform}/{public_id}
      // Extract the public_id by finding the base URL and reconstructing
      try {
        const urlObj = new URL(avatarUrl);
        const pathParts = urlObj.pathname.split('/');
        const uploadIndex = pathParts.indexOf('upload');
        
        if (uploadIndex !== -1 && uploadIndex < pathParts.length - 1) {
          // Get everything after 'upload' as the transform + public_id
          const afterUpload = pathParts.slice(uploadIndex + 1).join('/');
          // Extract public_id - it's usually the last segment or everything after transforms
          // Transform parameters are comma-separated, public_id is after the last /
          // For simplicity, assume public_id starts after first / (which might be transform)
          // Better: find the base URL and reconstruct
          // Reconstruct base URL with cloud name: https://res.cloudinary.com/{cloud}/image/upload
          // Cloud name is in the path: /{cloud}/image/upload/...
          const cloudName = pathParts[1]; // After empty string and before 'image'
          const baseUrl = `${urlObj.protocol}//res.cloudinary.com/${cloudName}/image/upload`;
          // If there's already a transform, extract just the public_id
          // Transform format: w_50,h_50,c_limit,f_auto,q_10 (no slashes in transform)
          // Public_id comes after transform, separated by /
          const parts = afterUpload.split('/');
          // If first part looks like transform (contains w_, h_, c_, etc.), use rest as public_id
          const publicId = parts[0].includes('w_') && parts.length > 1 
            ? parts.slice(1).join('/') 
            : afterUpload; // If no transform detected, use everything as public_id
          
          // Cloudinary transform: w_{width},h_{height},c_limit (limit size without upscaling), f_auto (format), q_auto (quality)
          return `${baseUrl}/w_${size},h_${size},c_limit,f_auto,q_auto/${publicId}`;
        }
      } catch (e) {
        // If URL parsing fails, fall through to query parameter method
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

// Helper function to normalize cover URL and ensure high quality
const normalizeCoverUrl = (coverUrl: string | null | undefined): string | undefined => {
  if (!coverUrl) return undefined;
  
  // If it's already a full URL, ensure it's high quality by removing any transform parameters
  if (coverUrl.startsWith('http://') || coverUrl.startsWith('https://')) {
    // Remove any Supabase transform parameters (like ?width=, ?height=, ?resize=, ?quality=, ?t=, etc.)
    const url = new URL(coverUrl);
    // Remove transform-related query parameters
    url.searchParams.delete('width');
    url.searchParams.delete('height');
    url.searchParams.delete('resize');
    url.searchParams.delete('quality');
    url.searchParams.delete('t'); // Remove timestamp cache buster if present
    // Return clean URL for full resolution
    return url.toString();
  }
  
  // If it's a Supabase storage path, construct the public URL
  // Format could be: avatars/user_id/filename.jpg or user_id/filename.jpg
  // (Cover images are stored in the same 'avatars' bucket)
  let storagePath = coverUrl;
  if (coverUrl.startsWith('avatars/')) {
    storagePath = coverUrl.replace('avatars/', '');
  }
  
  // Get public URL from Supabase storage (full resolution, no transforms)
  try {
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);
    
    // Ensure no transform parameters are added
    return publicUrl;
  } catch (error) {
    console.error('Error normalizing cover URL:', error, coverUrl);
    // Fallback: return original URL if normalization fails
    return coverUrl;
  }
};

// Get display name based on user type (artist uses artist_name, buyer uses display_name or full_name)
const getDisplayName = (
  userProfile?: { full_name: string | null; display_name: string | null } | null,
  artistProfile?: { artist_name: string; is_verified: boolean } | null
) => {
  // ถ้าเป็นศิลปิน ให้แสดงเฉพาะชื่อศิลปินเท่านั้น ไม่แสดงชื่อผู้ซื้อ
  if (artistProfile?.artist_name) {
    return artistProfile.artist_name;
  }
  // ถ้าไม่ใช่ศิลปิน ให้แสดงชื่อผู้ใช้
  return userProfile?.display_name || userProfile?.full_name || "ผู้ใช้";
};

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user, isArtist, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isUserHidden } = useBlockedUsers();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfileData | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [profileArtworks, setProfileArtworks] = useState<Array<{ id: string; image_url: string; title: string }>>([]);
  const [artworkToPostMap, setArtworkToPostMap] = useState<Map<string, string>>(new Map()); // Map artwork.id -> post.id
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

  // PostDetailDialog state
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [replyingToComment, setReplyingToComment] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [shareDialogPost, setShareDialogPost] = useState<CommunityPost | null>(null);

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
      console.log('Fetching user data for userId:', userId);
      fetchUserData();
    }
  }, [userId, user?.id]); // Also refetch when user changes

  // Listen for portfolio updates (when user posts with "Add to Portfolio")
  useEffect(() => {
    const handlePortfolioUpdate = (event: CustomEvent) => {
      // Only refresh if this is the current user's profile
      if (user && userId === user.id && event.detail?.userId === user.id) {
        console.log('Portfolio updated, refreshing data...');
        fetchUserData();
      }
    };

    window.addEventListener('portfolioUpdated', handlePortfolioUpdate as EventListener);
    
    return () => {
      window.removeEventListener('portfolioUpdated', handlePortfolioUpdate as EventListener);
    };
  }, [user, userId]);

  // Listen for follow status changes from other pages (Community, etc.)
  useEffect(() => {
    if (!user || !userId || user.id === userId) return;
    
    const handleFollowStatusChange = (event: CustomEvent) => {
      if (event.detail?.userId === userId) {
        console.log('Follow status changed externally, refreshing...');
        // Refresh follow status from database
        supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (!error) {
              setIsFollowing(!!data);
              console.log('Follow status refreshed:', !!data);
            }
          });
      }
    };

    window.addEventListener('followStatusChanged', handleFollowStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('followStatusChanged', handleFollowStatusChange as EventListener);
    };
  }, [userId, user]);

  // Listen for post deletion events
  useEffect(() => {
    const handlePostDeleted = (event: CustomEvent) => {
      const { postId, userId: deletedPostUserId } = event.detail || {};
      if (!postId) return;
      
      // Refresh if this is the current user's profile or if viewing the profile of the user whose post was deleted
      if (userId === deletedPostUserId || (user && userId === user.id)) {
        console.log('Post deleted, refreshing user data...', { postId, deletedPostUserId, currentUserId: userId });
        fetchUserData();
      }
    };

    window.addEventListener('postDeleted', handlePostDeleted as EventListener);
    
    return () => {
      window.removeEventListener('postDeleted', handlePostDeleted as EventListener);
    };
  }, [userId, user]);

  // Double tap to like component
  const DoubleTapImage = ({ post, onOpenPost, onLike }: { post: CommunityPost; onOpenPost: () => void; onLike: () => void }) => {
    const [showHeart, setShowHeart] = useState(false);
    const lastTapRef = useRef(0);
    const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleDoubleTap = () => {
      if (!post.is_liked) {
        onLike();
      }
      
      // Show heart animation
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 600);
    };

    const handleClick = (e: React.MouseEvent) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapRef.current;

      if (tapLength < 300 && tapLength > 0) {
        // Double click detected
        e.preventDefault();
        e.stopPropagation();
        
        // Clear single tap timeout
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }
        
        handleDoubleTap();
      } else {
        // Single click - open post after delay
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
        }
        tapTimeoutRef.current = setTimeout(() => {
          onOpenPost();
        }, 300);
      }

      lastTapRef.current = currentTime;
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapRef.current;

      if (tapLength < 300 && tapLength > 0) {
        // Double tap detected
        e.preventDefault();
        e.stopPropagation();
        
        // Clear single tap timeout
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }
        
        handleDoubleTap();
      } else {
        // Single tap - open post after delay
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
        }
        tapTimeoutRef.current = setTimeout(() => {
          onOpenPost();
        }, 300);
      }

      lastTapRef.current = currentTime;
    };

    return (
      <div 
        className="relative aspect-square cursor-pointer overflow-hidden"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
      >
        <OptimizedImage
          key={`post-image-${post.id}`}
          src={post.image_url}
          variants={{
            blur: post.image_blur_url || undefined,
            small: post.image_small_url || undefined,
            medium: post.image_medium_url || undefined,
            large: post.image_large_url || undefined,
          }}
          alt={post.title || ''}
          variant="feed"
          className="w-full h-full"
          aspectRatio="square"
        />
        {/* Double tap heart animation */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <Heart className="h-20 w-20 fill-red-500 text-red-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

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
        .select('id, title, description, image_url, image_asset_id, image_blur_url, image_small_url, image_medium_url, image_large_url, user_id, created_at, category, tools_used, hashtags')
        .in('id', postIds);

      if (!postsData) {
        setLikedPosts([]);
        return;
      }

      // Get unique user IDs
      const uniqueUserIds = [...new Set(postsData.map(p => p.user_id))];

      // Batch fetch profiles and artist profiles
      const [profilesResult, artistProfilesResult, commentsCountsResult, likesCountsResult, sharesCountsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, display_name, display_id')
          .in('id', uniqueUserIds),
        supabase
          .from('artist_profiles')
          .select('user_id, artist_name, is_verified, avatar_url')
          .in('user_id', uniqueUserIds),
        supabase
          .from('community_comments')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('community_likes')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('shared_posts')
          .select('post_id')
          .in('post_id', postIds)
      ]);

      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p]));
      const artistProfilesMap = new Map((artistProfilesResult.data || []).map(a => [a.user_id, a]));

      // Count comments, likes, shares per post
      const commentsCounts = new Map<string, number>();
      const likesCounts = new Map<string, number>();
      const sharesCounts = new Map<string, number>();

      (commentsCountsResult.data || []).forEach(c => {
        commentsCounts.set(c.post_id, (commentsCounts.get(c.post_id) || 0) + 1);
      });
      (likesCountsResult.data || []).forEach(l => {
        likesCounts.set(l.post_id, (likesCounts.get(l.post_id) || 0) + 1);
      });
      (sharesCountsResult.data || []).forEach(s => {
        sharesCounts.set(s.post_id, (sharesCounts.get(s.post_id) || 0) + 1);
      });

      // Map data in memory (fast)
      const postsWithDetails = postsData.map((post) => {
        const userProfile = profilesMap.get(post.user_id);
        const artistProfile = artistProfilesMap.get(post.user_id);
        
        return {
          ...post,
          user_profile: userProfile ? {
            full_name: userProfile.full_name,
            avatar_url: userProfile.avatar_url,
            display_name: userProfile.display_name,
            display_id: userProfile.display_id,
          } : undefined,
          artist_profile: artistProfile ? {
            artist_name: artistProfile.artist_name,
            is_verified: artistProfile.is_verified,
            avatar_url: artistProfile.avatar_url || undefined,
          } : null,
          comments_count: commentsCounts.get(post.id) || 0,
          likes_count: likesCounts.get(post.id) || 0,
          shares_count: sharesCounts.get(post.id) || 0,
          is_liked: true // User has liked this post
        };
      });

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
        .select('id, title, description, image_url, image_asset_id, image_blur_url, image_small_url, image_medium_url, image_large_url, user_id, created_at, category, tools_used, hashtags')
        .in('id', postIds);

      if (!postsData) {
        setSavedPostsList([]);
        return;
      }

      // Get unique user IDs
      const uniqueUserIds = [...new Set(postsData.map(p => p.user_id))];

      // Batch fetch profiles and artist profiles
      const [profilesResult, artistProfilesResult, commentsCountsResult, likesCountsResult, sharesCountsResult, userLikesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, display_name, display_id')
          .in('id', uniqueUserIds),
        supabase
          .from('artist_profiles')
          .select('user_id, artist_name, is_verified, avatar_url')
          .in('user_id', uniqueUserIds),
        supabase
          .from('community_comments')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('community_likes')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('shared_posts')
          .select('post_id')
          .in('post_id', postIds),
        user ? supabase
          .from('community_likes')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', user.id) : Promise.resolve({ data: [] })
      ]);

      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p]));
      const artistProfilesMap = new Map((artistProfilesResult.data || []).map(a => [a.user_id, a]));

      // Count comments, likes, shares per post
      const commentsCounts = new Map<string, number>();
      const likesCounts = new Map<string, number>();
      const sharesCounts = new Map<string, number>();
      const userLikedPosts = new Set((userLikesResult.data || []).map(l => l.post_id));

      (commentsCountsResult.data || []).forEach(c => {
        commentsCounts.set(c.post_id, (commentsCounts.get(c.post_id) || 0) + 1);
      });
      (likesCountsResult.data || []).forEach(l => {
        likesCounts.set(l.post_id, (likesCounts.get(l.post_id) || 0) + 1);
      });
      (sharesCountsResult.data || []).forEach(s => {
        sharesCounts.set(s.post_id, (sharesCounts.get(s.post_id) || 0) + 1);
      });

      // Map data in memory (fast)
      const postsWithDetails = postsData.map((post) => {
        const userProfile = profilesMap.get(post.user_id);
        const artistProfile = artistProfilesMap.get(post.user_id);
        
        return {
          ...post,
          user_profile: userProfile ? {
            full_name: userProfile.full_name,
            avatar_url: userProfile.avatar_url,
            display_name: userProfile.display_name,
            display_id: userProfile.display_id,
          } : undefined,
          artist_profile: artistProfile ? {
            artist_name: artistProfile.artist_name,
            is_verified: artistProfile.is_verified,
            avatar_url: artistProfile.avatar_url || undefined,
          } : null,
          comments_count: commentsCounts.get(post.id) || 0,
          likes_count: likesCounts.get(post.id) || 0,
          shares_count: sharesCounts.get(post.id) || 0,
          is_liked: userLikedPosts.has(post.id),
          is_saved: true
        };
      });

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

      // Fetch artworks if artist exists
      let artworksData: any[] | null = null;
      if (artistData) {
        const { data: fetchedArtworks, error: artworksError } = await supabase
          .from('artworks')
          .select('id, title, image_url, image_asset_id, post_id, price, is_sold, created_at')
          .eq('artist_id', artistData.id)
          .order('created_at', { ascending: false });
        
        if (artworksError) {
          console.error('Error fetching artworks:', artworksError);
        } else {
          artworksData = fetchedArtworks || [];
          console.log('Fetched artworks:', artworksData.length, 'for artist_id:', artistData.id);
          // Debug: Log artworks with post_id
          if (artworksData.length > 0) {
            const artworksWithPostId = artworksData.filter(a => a.post_id);
            console.log('Artworks with post_id:', artworksWithPostId.length, 'out of', artworksData.length);
            artworksWithPostId.forEach(a => {
              console.log('  - Artwork:', a.id, '→ Post:', a.post_id);
            });
          }
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
        setArtworks([]);
        setProfileArtworks([]);
      }

      // Fetch community posts with additional data
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('id, title, description, image_url, image_asset_id, image_blur_url, image_small_url, image_medium_url, image_large_url, user_id, likes_count, created_at, category, tools_used, hashtags')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // ✅ OPTIMIZED: Batch fetch all counts and likes status
      const postIds = (postsData || []).map(p => p.id);
      
      const [likesCountsResult, commentsCountsResult, sharesCountsResult, userLikesResult] = await Promise.all([
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
        
        // Shares counts
        postIds.length > 0 ? supabase
          .from('shared_posts')
          .select('post_id')
          .in('post_id', postIds)
          .then(({ data }) => {
            const counts: Record<string, number> = {};
            (data || []).forEach(share => {
              counts[share.post_id] = (counts[share.post_id] || 0) + 1;
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

      // Fetch user profiles and artist profiles for all posts
      const uniqueUserIds = [...new Set((postsData || []).map(p => p.user_id))];
      const [profilesResult, artistProfilesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, display_name, display_id')
          .in('id', uniqueUserIds),
        supabase
          .from('artist_profiles')
          .select('user_id, artist_name, is_verified, avatar_url')
          .in('user_id', uniqueUserIds)
      ]);

      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p]));
      const artistProfilesMap = new Map((artistProfilesResult.data || []).map(a => [a.user_id, a]));

      // Map data in memory (fast)
      const postsWithDetails = (postsData || []).map((post) => {
        const userProfile = profilesMap.get(post.user_id);
        const artistProfile = artistProfilesMap.get(post.user_id);
        
        return {
        ...post,
          user_profile: userProfile ? {
            full_name: userProfile.full_name,
            avatar_url: userProfile.avatar_url,
            display_name: userProfile.display_name,
            display_id: userProfile.display_id,
          } : undefined,
          artist_profile: artistProfile ? {
            artist_name: artistProfile.artist_name,
            is_verified: artistProfile.is_verified,
            avatar_url: (artistProfile as any).avatar_url || undefined,
          } : null,
        likes_count: likesCountsResult[post.id] || 0,
        comments_count: commentsCountsResult[post.id] || 0,
        shares_count: sharesCountsResult[post.id] || 0,
          is_liked: userLikesResult.has(post.id),
          tools_used: post.tools_used || [],
        };
      });
      
      setPosts(postsWithDetails);

      // Create mapping between artworks and community posts using post_id
      // Artworks now have post_id field that directly links to the post
      if (artworksData && postsData) {
        const mapping = new Map<string, string>();
        
        console.log('Creating mapping - Artworks:', artworksData.length, 'Posts:', postsData.length);
        
        // Match artworks to posts using post_id field
        artworksData.forEach((artwork) => {
          if (artwork.post_id) {
            // Check if the post exists in postsData
            const post = postsData.find(p => p.id === artwork.post_id);
            if (post) {
              mapping.set(artwork.id, post.id);
              console.log('Matched by post_id:', artwork.id, '<->', post.id);
            } else {
              console.warn('Artwork has post_id but post not found:', artwork.id, 'post_id:', artwork.post_id);
            }
          }
        });
        
        console.log('Artwork to Post mapping created:', Array.from(mapping.entries()));
        console.log('Mapping size:', mapping.size, 'out of', artworksData.length, 'artworks with post_id');
        setArtworkToPostMap(mapping);
      } else {
        console.log('Cannot create mapping - missing data:', { artworksData: !!artworksData, postsData: !!postsData });
        setArtworkToPostMap(new Map());
      }

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
        console.log('Checking follow status:', { follower_id: user.id, following_id: userId });
        const { data: followData, error: followError } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        
        if (followError) {
          console.error('Error checking follow status:', followError);
        }
        
        console.log('Follow status check result:', { followData, isFollowing: !!followData });
        setIsFollowing(!!followData);
      } else {
        // Reset if viewing own profile or not logged in
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    console.log('handleFollow called', { user: user?.id, userId, isFollowing });
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "กรุณาเข้าสู่ระบบ",
        description: "เข้าสู่ระบบเพื่อติดตามผู้ใช้"
      });
      return;
    }

    if (!userId || user.id === userId) {
      console.log('Invalid follow request:', { userId, currentUserId: user.id });
      return;
    }

    const previousIsFollowing = isFollowing;
    const previousFollowersCount = followersCount;

    try {
      if (isFollowing) {
        console.log('Unfollowing user:', userId);
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        
        if (error) throw error;
        
        // Verify deletion
        const { data: verifyData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        
        if (verifyData) {
          throw new Error('Failed to unfollow user');
        }
        
        setIsFollowing(false);
        
        // Refresh followers count from database
        const { count: newFollowersCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId);
        
        if (newFollowersCount !== null) {
          setFollowersCount(newFollowersCount);
          console.log('Followers count refreshed after unfollow:', newFollowersCount);
        } else {
          setFollowersCount(prev => Math.max(0, prev - 1));
        }
        
        // Dispatch event to sync state across pages
        window.dispatchEvent(new CustomEvent('followStatusChanged', {
          detail: { userId, isFollowing: false }
        }));
        
        toast({
          title: "ยกเลิกการติดตามแล้ว",
          description: "คุณไม่ได้ติดตามผู้ใช้นี้แล้ว"
        });
      } else {
        console.log('Following user:', userId);
        
        // Optimistically update UI
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        
        const { data: insertData, error: insertError } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error inserting follow:', insertError);
          
          // Revert optimistic update
          setIsFollowing(previousIsFollowing);
          setFollowersCount(previousFollowersCount);
          
          // Check if it's a duplicate key error (already following)
          if (insertError.code === '23505') {
            // Already following - refresh state from database
            const { data: followCheck } = await supabase
              .from('follows')
              .select('id')
              .eq('follower_id', user.id)
              .eq('following_id', userId)
              .maybeSingle();
            
            if (followCheck) {
              setIsFollowing(true);
              // Refresh followers count
              const { count: countResult } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', userId);
              if (countResult !== null) {
                setFollowersCount(countResult);
              }
            }
            
            toast({
              title: "ติดตามแล้ว",
              description: "คุณติดตามผู้ใช้นี้อยู่แล้ว"
            });
            return;
          }
          
          toast({
            variant: "destructive",
            title: "เกิดข้อผิดพลาด",
            description: insertError.message || "ไม่สามารถติดตามผู้ใช้ได้"
          });
          return;
        }
        
        // Only update state if insert was successful
        if (!insertData) {
          console.error('Insert returned no data');
          // Revert optimistic update
          setIsFollowing(previousIsFollowing);
          setFollowersCount(previousFollowersCount);
          toast({
            variant: "destructive",
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถติดตามผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง"
          });
          return;
        }
        
        console.log('Follow inserted successfully:', insertData);
        
        // Verify follow was created successfully by querying again
        // Wait a bit for database to commit
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verify follow was created successfully
        const { data: followCheck, error: verifyError } = await supabase
          .from('follows')
          .select('id, follower_id, following_id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        
        console.log('Follow verification result:', { followCheck, verifyError });
        
        if (verifyError) {
          console.error('Error verifying follow:', verifyError);
          // Don't revert - insert was successful, verification might just be a timing issue
        }
        
        if (!followCheck) {
          console.warn('Follow record not found after insert, but insertData exists:', insertData);
          // Even if verification fails, if insertData exists, the insert was successful
          // The record might just not be immediately visible due to replication lag
          // Keep the optimistic update
        } else {
          console.log('Follow verified successfully:', followCheck.id);
        }
        
        // Refresh followers count from database to ensure accuracy
        const { count: verifiedFollowersCount, error: countError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId);
        
        if (countError) {
          console.error('Error counting followers:', countError);
        } else if (verifiedFollowersCount !== null) {
          setFollowersCount(verifiedFollowersCount);
          console.log('Followers count refreshed:', verifiedFollowersCount);
        }

        // Get profile for notification
        const { data: followerProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, display_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching follower profile:', profileError);
        }

        const { data: artistProfile, error: artistError } = await supabase
          .from('artist_profiles')
          .select('artist_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (artistError) {
          console.error('Error fetching artist profile:', artistError);
        }

        const followerName = artistProfile?.artist_name || followerProfile?.display_name || followerProfile?.full_name || 'ผู้ใช้';

        // Check if follower is muted by the user being followed
        const { data: isMuted, error: muteError } = await supabase
          .from('user_mutes')
          .select('id')
          .eq('muter_id', userId)
          .eq('muted_id', user.id)
          .maybeSingle();

        if (muteError) {
          console.error('Error checking mute status:', muteError);
        }

        // Only send notification if not muted
        if (!isMuted) {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              title: 'มีผู้ติดตามใหม่! 🎉',
              message: `${followerName} เริ่มติดตามคุณแล้ว`,
              type: 'follow',
              reference_id: user.id,
              actor_id: user.id
            });

          if (notificationError) {
            console.error('Error creating notification:', notificationError);
            // Don't throw - notification is not critical
          } else {
            console.log('Notification created successfully for user:', userId);
          }
        } else {
          console.log('Notification skipped - follower is muted');
        }

        // Dispatch event to sync state across pages
        window.dispatchEvent(new CustomEvent('followStatusChanged', {
          detail: { userId, isFollowing: true }
        }));
        
        toast({
          title: "ติดตามแล้ว! 🎉",
          description: "คุณจะเห็นผลงานใหม่ๆ จากผู้ใช้นี้"
        });
      }
    } catch (error: any) {
      console.error('Error following user:', error);
      
      // Revert state on error
      setIsFollowing(previousIsFollowing);
      setFollowersCount(previousFollowersCount);
      
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถติดตามผู้ใช้ได้"
      });
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
            .select('full_name, avatar_url, display_name')
            .eq('id', comment.user_id)
            .maybeSingle();
          
          const { data: commentArtistProfile } = await supabase
            .from('artist_profiles')
            .select('artist_name, is_verified, avatar_url')
            .eq('user_id', comment.user_id)
            .maybeSingle();
          
          return { 
            ...comment, 
            user_profile: profile,
            artist_profile: commentArtistProfile || null
          };
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
        {/* Cover Image - Full width, 750px height, flush with edges */}
        <div className="relative w-screen h-[750px] bg-gradient-to-b from-muted to-background overflow-hidden" style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}>
          {displayCover ? (
            <img
              src={normalizeCoverUrl(displayCover) || displayCover}
              alt="Cover"
              className="w-full h-full object-cover"
              style={{ objectPosition: `center ${displayCoverPositionY}%` }}
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
                      src={normalizeAvatarUrl(displayAvatar, 128) || displayAvatar}
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

            {/* Portfolio Tab - Justified Grid (Google Photos style) - Shows only posts that were added to Portfolio */}
            <TabsContent value="portfolio" className="mt-8">
              <AnimatePresence mode="wait">
                  {(() => {
                    // Method 1: Use artworks with post_id to find portfolio posts
                    // Get all post IDs from artworks that have post_id (these are portfolio items)
                    const portfolioPostIdsFromArtworks = new Set(
                      artworks
                        .filter(artwork => artwork.post_id)
                        .map(artwork => artwork.post_id!)
                    );
                    
                    // Method 2: Also use the mapping (backup)
                    const portfolioPostIdsFromMap = new Set(Array.from(artworkToPostMap.values()));
                    
                    // Combine both methods
                    const allPortfolioPostIds = new Set([
                      ...Array.from(portfolioPostIdsFromArtworks),
                      ...Array.from(portfolioPostIdsFromMap)
                    ]);
                    
                    // Filter posts that have corresponding artworks (posts that were added to Portfolio)
                    const portfolioPosts = posts.filter(post => allPortfolioPostIds.has(post.id));

                    // Debug logging
                    console.log('Portfolio Tab Debug:', {
                      totalPosts: posts.length,
                      totalArtworks: artworks.length,
                      artworksWithPostId: artworks.filter(a => a.post_id).length,
                      portfolioPostIdsFromArtworks: Array.from(portfolioPostIdsFromArtworks),
                      portfolioPostIdsFromMap: Array.from(portfolioPostIdsFromMap),
                      allPortfolioPostIds: Array.from(allPortfolioPostIds),
                      portfolioPostsCount: portfolioPosts.length,
                      portfolioPostIdsList: portfolioPosts.map(p => p.id),
                      sampleArtwork: artworks.find(a => a.post_id),
                      samplePost: posts.find(p => allPortfolioPostIds.has(p.id))
                    });

                    return portfolioPosts.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                      <JustifiedGrid
                        items={portfolioPosts.map((post): JustifiedItem => ({
                          id: post.id,
                          imageUrl: post.image_url,
                          alt: post.title,
                          // JustifiedGrid will calculate aspect ratio from image dimensions
                      }))}
                      onItemClick={(item) => {
                          // Open post dialog instead of navigating
                          const post = portfolioPosts.find(p => p.id === item.id);
                          if (post) {
                            console.log('Opening post dialog:', post);
                            handleOpenPost(post);
                          } else {
                            console.error('Post not found:', item.id, 'Available posts:', portfolioPosts.map(p => p.id));
                          }
                      }}
                      renderOverlay={(item) => {
                          const post = portfolioPosts.find(p => p.id === item.id);
                          if (!post) return null;
                        return (
                          <div className="w-full">
                            <p className="font-medium text-sm text-white line-clamp-2 mb-1">
                                {post.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-white/90">
                                <span>❤️ {post.likes_count.toLocaleString()}</span>
                                <span>💬 {post.comments_count || 0}</span>
                              </div>
                          </div>
                        );
                      }}
                        gap={8}
                        fixedSize={{
                          desktop: 300,
                          tablet: 260,
                          mobile: 200,
                        }}
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
                  );
                })()}
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
                        <div className="flex items-center justify-between p-4">
                          <Link to={`/profile/${post.user_id || userId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                              <AvatarImage src={
                                normalizeAvatarUrl(
                                  post.artist_profile?.avatar_url || 
                                  post.user_profile?.avatar_url || 
                                  displayAvatar,
                                  64
                                )
                              } />
                              <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                                {getDisplayName(post.user_profile, post.artist_profile)[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">
                                  {getDisplayName(post.user_profile, post.artist_profile)}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                  @{post.user_profile?.display_id || post.user_id?.slice(0, 8) || userId?.slice(0, 8)}
                                </span>
                                {post.artist_profile?.is_verified && (
                                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">
                                    ✓
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(post.created_at)}
                                </span>
                                {post.category && (
                                  <span className="text-xs text-muted-foreground">
                                    • {post.category}
                                  </span>
                                )}
                                {post.tools_used && post.tools_used.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    • {post.tools_used.slice(0, 3).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </div>

                        {/* Post Content */}
                        {post.title && (
                          <div className="px-4 pb-2">
                            <p className="text-foreground font-medium">{post.title}</p>
                            {post.description && (
                              <p className="text-muted-foreground text-sm mt-1">{post.description}</p>
                            )}
                          </div>
                        )}

                        {/* Post Image */}
                        <DoubleTapImage
                          post={post}
                          onOpenPost={() => handleOpenPost(post)}
                          onLike={() => handleLike(post.id, post.is_liked || false)}
                        />

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
                                onClick={() => user ? setRepostDialogPost(post) : toast({ variant: "destructive", title: "กรุณาเข้าสู่ระบบ" })}
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
                        {post.likes_count > 0 && (
                          <div className="px-4 pb-2">
                            <span className="font-semibold text-sm">
                              {post.likes_count.toLocaleString()} ถูกใจ
                            </span>
                          </div>
                        )}

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

                        {/* Hashtags */}
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="px-4 pb-3 flex flex-wrap gap-1">
                            {post.hashtags.map((tag) => (
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
                              <AvatarImage src={normalizeAvatarUrl(
                                post.artist_profile?.avatar_url || 
                                postDisplayAvatar,
                                64
                              )} />
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
                          <div className="relative bg-muted cursor-pointer" onClick={() => handleOpenPost(post)}>
                            <DoubleTapImage
                              post={post}
                              onOpenPost={() => handleOpenPost(post)}
                              onLike={() => handleLikeInLikedTab(post.id, post.is_liked || false)}
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
                              <AvatarImage src={normalizeAvatarUrl(
                                post.artist_profile?.avatar_url || 
                                postDisplayAvatar,
                                64
                              )} />
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
                          <div className="relative bg-muted cursor-pointer" onClick={() => handleOpenPost(post)}>
                            <DoubleTapImage
                              post={post}
                              onOpenPost={() => handleOpenPost(post)}
                              onLike={() => handleLikeInSavedTab(post.id, post.is_liked || false)}
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

      {/* Post Detail Dialog */}
      <PostDetailDialog
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        user={user}
        comments={comments}
        commentsLoading={commentsLoading}
        newComment={newComment}
        onNewCommentChange={setNewComment}
        onSubmitComment={handleSubmitComment}
        submittingComment={submittingComment}
        onLike={(postId, isLiked, e) => handleLike(postId, isLiked)}
        onFollow={(userId, isFollowing, e) => {
          // Handle follow in dialog context
          if (userId === profile?.id) {
            handleFollow();
          }
        }}
        followingUsers={followingUsers}
        savedPosts={savedPosts}
        repostedPosts={repostedPosts}
        onSavePost={(postId) => handleSave(postId)}
        onUnsavePost={(postId) => handleSave(postId)}
        onTagSelect={(tag) => setSelectedPostsTag(tag)}
        onShareDialogOpen={setShareDialogPost}
        editingComment={editingComment}
        editCommentContent={editCommentContent}
        onEditCommentContentChange={setEditCommentContent}
        onEditComment={async () => {
          if (!editingComment || !editCommentContent.trim()) return;
          setSavingCommentEdit(true);
          try {
            const { error } = await supabase
              .from('community_comments')
              .update({ content: editCommentContent.trim() })
              .eq('id', editingComment.id)
              .eq('user_id', user?.id);
            
            if (error) throw error;
            
            setComments(comments.map(c => 
              c.id === editingComment.id 
                ? { ...c, content: editCommentContent.trim() }
                : c
            ));
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
        }}
        onCancelEditComment={() => { setEditingComment(null); setEditCommentContent(""); }}
        savingCommentEdit={savingCommentEdit}
        onStartEditComment={(comment) => { setEditingComment(comment); setEditCommentContent(comment.content); }}
        onDeleteComment={async (commentId) => {
          setDeletingCommentId(commentId);
          try {
            // Admin can delete any comment, users can only delete their own
            const deleteQuery = supabase
              .from('community_comments')
              .delete()
              .eq('id', commentId);
            
            // Only add user_id check if not admin
            if (!isAdmin && user?.id) {
              deleteQuery.eq('user_id', user.id);
            }
            
            const { error } = await deleteQuery;
            
            console.log('Delete comment from profile result:', { error, commentId, isAdmin, userId: user?.id });
            
            if (error) {
              console.error('Error deleting comment:', error);
              throw error;
            }
            
            setComments(comments.filter(c => c.id !== commentId));
            if (selectedPost) {
              setPosts(posts.map(p => 
                p.id === selectedPost.id
                  ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) }
                  : p
              ));
            }
          } catch (error: any) {
            toast({
              variant: "destructive",
              title: "เกิดข้อผิดพลาด",
              description: error.message
            });
          } finally {
            setDeletingCommentId(null);
          }
        }}
        deletingCommentId={deletingCommentId}
        replyingToComment={replyingToComment}
        replyContent={replyContent}
        onReplyContentChange={setReplyContent}
        onSubmitReply={async () => {
          if (!replyingToComment || !replyContent.trim() || !user || !selectedPost) return;
          setSubmittingReply(true);
          try {
            const { error } = await supabase
              .from('community_comments')
              .insert({
                post_id: selectedPost.id,
                user_id: user.id,
                content: replyContent.trim(),
                parent_id: replyingToComment.id
              });
            
            if (error) throw error;
            
            setReplyContent("");
            setReplyingToComment(null);
            fetchComments(selectedPost.id);
          } catch (error: any) {
            toast({
              variant: "destructive",
              title: "เกิดข้อผิดพลาด",
              description: error.message
            });
          } finally {
            setSubmittingReply(false);
          }
        }}
        submittingReply={submittingReply}
        onStartReply={(comment) => { setReplyingToComment(comment); setReplyContent(""); }}
        onCancelReply={() => setReplyingToComment(null)}
        expandedReplies={expandedReplies}
        onToggleReplies={(commentId, expanded) => {
          if (expanded) {
            setExpandedReplies(prev => new Set([...prev, commentId]));
          } else {
            setExpandedReplies(prev => {
              const next = new Set(prev);
              next.delete(commentId);
              return next;
            });
          }
        }}
        onLikeComment={async (commentId) => {
          // Handle comment like
          // Implementation can be added later if needed
        }}
        isAdmin={isAdmin}
      />

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
                      <AvatarImage src={normalizeAvatarUrl(displayAvatar, 64)} />
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