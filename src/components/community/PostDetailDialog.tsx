import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, MessageCircle, Send, X, Loader2, 
  Share2, Bookmark, MoreHorizontal, Repeat2, Link2,
  ChevronDown, ChevronUp, ZoomIn, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MentionInput, renderTextWithMentions } from "@/components/ui/MentionInput";
import OptimizedImage from "@/components/ui/OptimizedImage";
import ImageViewer from "@/components/ui/ImageViewer";
import JustifiedGrid, { JustifiedItem } from "@/components/ui/JustifiedGrid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  display_name: string | null;
  display_id: string | null;
}

interface ArtistProfile {
  artist_name: string;
  is_verified: boolean;
}

interface CommunityPost {
  id: string;
  original_post_id?: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  // Cloudinary optimized image variants
  image_blur_url?: string | null;
  image_small_url?: string | null;
  image_medium_url?: string | null;
  image_large_url?: string | null;
  image_asset_id?: string | null;
  tools_used: string[];
  hashtags?: string[];
  category: string | null;
  likes_count: number;
  created_at: string;
  user_profile?: UserProfile;
  artist_profile?: ArtistProfile | null;
  is_liked?: boolean;
  comments_count?: number;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  user_profile?: UserProfile;
  artist_profile?: ArtistProfile | null;
  replies?: Comment[];
  is_liked?: boolean;
  likes_count?: number;
}

interface PostDetailDialogProps {
  post: CommunityPost | null;
  onClose: () => void;
  user: any;
  comments: Comment[];
  commentsLoading: boolean;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onSubmitComment: () => void;
  submittingComment: boolean;
  onLike: (postId: string, isLiked: boolean, e: React.MouseEvent) => void;
  onFollow: (userId: string, isFollowing: boolean, e: React.MouseEvent) => void;
  followingUsers: Set<string>;
  savedPosts: Set<string>;
  repostedPosts: Set<string>;
  onSavePost: (postId: string) => void;
  onUnsavePost: (postId: string) => void;
  onTagSelect: (tag: string) => void;
  onShareDialogOpen: (post: CommunityPost) => void;
  // Comment actions
  editingComment: Comment | null;
  editCommentContent: string;
  onEditCommentContentChange: (value: string) => void;
  onEditComment: () => void;
  onCancelEditComment: () => void;
  savingCommentEdit: boolean;
  onStartEditComment: (comment: Comment) => void;
  onDeleteComment: (commentId: string) => void;
  deletingCommentId: string | null;
  // Reply actions
  replyingToComment: Comment | null;
  replyContent: string;
  onReplyContentChange: (value: string) => void;
  onSubmitReply: (parentComment: Comment) => void;
  submittingReply: boolean;
  onStartReply: (comment: Comment) => void;
  onCancelReply: () => void;
  expandedReplies: Set<string>;
  onToggleReplies: (commentId: string, expanded: boolean) => void;
  onLikeComment: (commentId: string, isLiked: boolean) => void;
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'เมื่อสักครู่';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชม.ที่แล้ว`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

const getDisplayName = (userProfile?: UserProfile, artistProfile?: ArtistProfile | null) => {
  return artistProfile?.artist_name || userProfile?.full_name || 'ผู้ใช้';
};

const isBuyerUser = (artistProfile?: ArtistProfile | null) => {
  return !artistProfile;
};

export function PostDetailDialog({
  post,
  onClose,
  user,
  comments,
  commentsLoading,
  newComment,
  onNewCommentChange,
  onSubmitComment,
  submittingComment,
  onLike,
  onFollow,
  followingUsers,
  savedPosts,
  repostedPosts,
  onSavePost,
  onUnsavePost,
  onTagSelect,
  onShareDialogOpen,
  editingComment,
  editCommentContent,
  onEditCommentContentChange,
  onEditComment,
  onCancelEditComment,
  savingCommentEdit,
  onStartEditComment,
  onDeleteComment,
  deletingCommentId,
  replyingToComment,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  submittingReply,
  onStartReply,
  onCancelReply,
  expandedReplies,
  onToggleReplies,
  onLikeComment,
}: PostDetailDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [imgAspect, setImgAspect] = useState<'normal' | 'tall'>('normal');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  // Zoom states: 0 = normal, 1 = fit to screen, 2 = 1:1 (original size)
  // Start with fit to screen by default
  const [zoomLevel, setZoomLevel] = useState<0 | 1 | 2>(1);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [ownerArtworks, setOwnerArtworks] = useState<Array<{ id: string; image_url: string; title: string }>>([]);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const [artworkToPostMap, setArtworkToPostMap] = useState<Map<string, string>>(new Map());
  
  // Check if image needs to be fit to screen (if either dimension > 1800px)
  const shouldFitToScreen = imageNaturalSize 
    ? imageNaturalSize.width > 1800 || imageNaturalSize.height > 1800
    : true; // Default to fit if size not known yet

  useEffect(() => {
    if (post?.image_url) {
      const img = new Image();
      img.onload = () => {
        // If height is more than 1.5x width, it's a tall image (Pixiv style)
        setImgAspect(img.height > img.width * 1.5 ? 'tall' : 'normal');
      };
      img.src = post.image_url;
    }
    // Reset all states when post changes
    setZoomLevel(1); // Start with fit to screen (show full image)
    setOriginalUrl(null);
    setIsLoadingOriginal(false);
    setImageNaturalSize(null);
    setImagePosition({ x: 0, y: 0 }); // Reset image position
    setIsDragging(false);
    setHasDragged(false);
  }, [post?.id]); // Only depend on post.id to reset when switching posts

  // Global mouse events for dragging when zoomed to 1:1
  useEffect(() => {
    if (!isDragging || zoomLevel !== 2) return;

    const handleMouseMove = (e: MouseEvent) => {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setHasDragged(true); // Mark that user has dragged
        // Snap back to center horizontally (x-axis only), keep vertical position
        setImagePosition(prev => ({ x: 0, y: prev.y }));
      }
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, zoomLevel]);

  // Fetch signed URL for original image when dialog opens (Pixiv-style)
  const fetchOriginalImage = useCallback(async () => {
    // If no image_asset_id, skip (use fallback variants)
    if (!post?.image_asset_id) {
      setIsLoadingOriginal(false);
      return;
    }

    // If already loaded, skip
    if (originalUrl) {
      setIsLoadingOriginal(false);
      return;
    }

    setIsLoadingOriginal(true);
    
    // Set timeout to prevent infinite loading (10 seconds)
    const timeoutId = setTimeout(() => {
      console.warn('Original image fetch timeout, using large variant');
      setIsLoadingOriginal(false);
    }, 10000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Fall back to large variant if not logged in
        clearTimeout(timeoutId);
        setIsLoadingOriginal(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-signed-url`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageAssetId: post.image_asset_id }),
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.signedUrl) {
        setOriginalUrl(data.signedUrl);
      } else {
        console.warn('Failed to get signed URL:', data.error || 'Unknown error');
        // Fall back to large variant - loading will stop
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Failed to fetch original image:', error);
      // Fall back to large variant on error
    } finally {
      setIsLoadingOriginal(false);
    }
  }, [post?.image_asset_id, originalUrl]);

  // Auto-fetch original when dialog opens (Pixiv-style: load original immediately)
  useEffect(() => {
    if (post && !originalUrl && !isLoadingOriginal) {
      fetchOriginalImage();
    }
  }, [post?.id, originalUrl, isLoadingOriginal, fetchOriginalImage]);

  // Fetch owner's portfolio artworks
  useEffect(() => {
    const fetchOwnerArtworks = async () => {
      if (!post?.artist_profile?.id || !post?.user_id) {
        setOwnerArtworks([]);
        setArtworkToPostMap(new Map());
        return;
      }

      setLoadingArtworks(true);
      try {
        // Fetch artworks
        const { data: artworksData, error: artworksError } = await supabase
          .from('artworks')
          .select('id, image_url, title')
          .eq('artist_id', post.artist_profile.id)
          .order('created_at', { ascending: false })
          .limit(6); // Show max 6 artworks

        if (artworksError) throw artworksError;
        setOwnerArtworks(artworksData || []);

        // Fetch community posts by the same user to create mapping
        const { data: postsData } = await supabase
          .from('community_posts')
          .select('id, image_url, title')
          .eq('user_id', post.user_id);

        // Create mapping between artworks and posts
        if (artworksData && postsData) {
          const mapping = new Map<string, string>();
          artworksData.forEach((artwork) => {
            // Find matching post by image_url or title
            const matchingPost = postsData.find(
              (p) => p.image_url === artwork.image_url || p.title === artwork.title
            );
            if (matchingPost) {
              mapping.set(artwork.id, matchingPost.id);
            }
          });
          setArtworkToPostMap(mapping);
        }
      } catch (error) {
        console.error('Error fetching owner artworks:', error);
        setOwnerArtworks([]);
        setArtworkToPostMap(new Map());
      } finally {
        setLoadingArtworks(false);
      }
    };

    fetchOwnerArtworks();
  }, [post?.artist_profile?.id, post?.user_id]);

  if (!post) return null;

  const isSaved = savedPosts.has(post.original_post_id || post.id);
  const isReposted = repostedPosts.has(post.original_post_id || post.id);
  const isFollowing = followingUsers.has(post.user_id);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/community?post=${post.id}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "คัดลอกลิงก์แล้ว!" });
  };

  const handleShareFacebook = () => {
    const url = `${window.location.origin}/community?post=${post.id}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const handleShareTwitter = () => {
    const url = `${window.location.origin}/community?post=${post.id}`;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`, '_blank');
  };

  const handleShareLine = () => {
    const url = `${window.location.origin}/community?post=${post.id}`;
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`, '_blank');
  };

  // Pixiv-style artwork viewer modal
    return (
      <Dialog open={!!post} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 overflow-hidden bg-transparent border-0 rounded-none [&>button]:hidden fixed inset-0 left-0 top-0 translate-x-0 translate-y-0"
        onOpenAutoFocus={(e) => e.preventDefault()} // Prevent layout shift
      >
        {/* ArtStation/Cara-style: Split view modal with image left, comments right */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full bg-black flex"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
        >
          {/* Close button - Top Left */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
              onClick={onClose}
            className="absolute top-4 left-4 z-50 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-all backdrop-blur-sm"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </motion.button>

          {/* Left Side - Image Container (ArtStation/Cara style) */}
          <div 
            className="relative flex-1 h-full overflow-y-auto overflow-x-hidden bg-black"
            onClick={(e) => {
              // Don't zoom if clicking on scrollbar
              if ((e.target as HTMLElement).closest('.comment-section')) {
                return;
              }
              
              // Don't zoom if user just finished dragging (prevent click after drag)
              if (isDragging || hasDragged) {
                setHasDragged(false); // Reset flag
                return;
              }
              
              // Cycle through zoom states: 1 (fit) → 2 (1:1) → 1
              // Only allow 1:1 zoom if original image is loaded
              if (zoomLevel === 1) {
                // Click when fit to screen: Zoom to 1:1 (original size) if available
                if (originalUrl && imageNaturalSize) {
                  setZoomLevel(2);
                  setImagePosition({ x: 0, y: 0 }); // Reset position when zooming in
                }
              } else if (zoomLevel === 2) {
                // Click when 1:1: Back to fit to screen
                setZoomLevel(1);
                setImagePosition({ x: 0, y: 0 }); // Reset position when zooming out
              } else {
                // Click when normal: Fit to screen
                setZoomLevel(1);
              }
            }}
            onWheel={(e) => {
              // Allow scrolling when zoomed to 1:1
              if (zoomLevel === 2) {
                // Normal scroll behavior
                return;
              }
              // Prevent zoom on wheel when not in 1:1 mode
              e.stopPropagation();
            }}
          >
            {/* Image wrapper - ArtStation/Cara style: Full height, centered */}
            <div className={`relative w-full flex items-center justify-center transition-all duration-300 ${
              zoomLevel === 1 
                ? shouldFitToScreen 
                  ? 'h-screen' // Full screen height when fit to screen (for large images)
                  : 'min-h-full py-4' // Natural size for small images (<= 2400px)
                : zoomLevel === 2
                  ? 'min-h-full py-4' // 1:1 zoom, allow scrolling for tall/wide images
                  : 'min-h-full py-4' // Normal view
            }`}>
              {/* Image container with smooth zoom animation */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, // No scaling, just fit to screen
                  x: zoomLevel === 2 ? imagePosition.x : 0,
                  y: zoomLevel === 2 ? imagePosition.y : 0,
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: isDragging ? 0 : 0.3, ease: "easeOut" }}
                className={`relative ${
                  zoomLevel === 1 
                    ? shouldFitToScreen
                      ? 'w-full h-full cursor-zoom-in' // Full container size when fit to screen
                      : 'w-auto h-auto cursor-zoom-in' // Natural size for small images
                    : zoomLevel === 2 
                      ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') 
                      : 'cursor-zoom-in'
                }`}
                onMouseDown={(e) => {
                  if (zoomLevel === 2 && e.button === 0) { // Left mouse button only
                    setIsDragging(true);
                    setHasDragged(false); // Reset drag flag when starting new drag
                    setDragStart({
                      x: e.clientX - imagePosition.x,
                      y: e.clientY - imagePosition.y,
                    });
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {/* Pixiv-style: Load original high-resolution image immediately */}
                {originalUrl ? (
                  // Show original image when loaded (Pixiv: always show original in viewer)
                  <img
                    src={originalUrl}
                    alt={post.title}
                    className={zoomLevel === 1 
                      ? shouldFitToScreen 
                        ? 'w-full h-full object-contain' 
                        : 'w-auto h-auto'
                      : 'w-auto h-auto'}
                    style={{ 
                      objectFit: 'contain',
                      width: zoomLevel === 2 && imageNaturalSize 
                        ? `${imageNaturalSize.width}px` 
                        : zoomLevel === 1
                          ? shouldFitToScreen
                            ? '100%' // Fit to container when fit to screen (large images)
                            : imageNaturalSize 
                              ? `${imageNaturalSize.width}px` // Natural size for small images
                              : 'auto'
                          : 'auto',
                      height: zoomLevel === 2 && imageNaturalSize 
                        ? `${imageNaturalSize.height}px` 
                        : zoomLevel === 1
                          ? shouldFitToScreen
                            ? '100%' // Fit to container when fit to screen (large images)
                            : imageNaturalSize 
                              ? `${imageNaturalSize.height}px` // Natural size for small images
                              : 'auto'
                          : 'auto',
                      maxWidth: zoomLevel === 2 
                        ? 'none' 
                        : zoomLevel === 1 && shouldFitToScreen
                          ? '100%' // Max width when fit to screen
                          : 'none', // No max width for natural size
                      maxHeight: zoomLevel === 2 
                        ? 'none' 
                        : zoomLevel === 1 && shouldFitToScreen
                          ? '100%' // Max height when fit to screen
                          : 'none', // No max height for natural size
                      display: 'block', // Prevent inline spacing
                    }}
                    loading="eager"
                    onLoad={(e) => {
                      // Store natural size for 1:1 zoom
                      const img = e.target as HTMLImageElement;
                      setImageNaturalSize({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                      img.style.opacity = '1';
                    }}
                  />
                ) : (
                  // Fallback: Show VIEW_IMAGE (2400px) while loading original or if no image_asset_id
                  <>
                    <div
                      className={zoomLevel === 1 && shouldFitToScreen ? 'w-full h-full' : ''}
                      style={{
                        width: zoomLevel === 1 && shouldFitToScreen ? '100%' : 'auto',
                        height: zoomLevel === 1 && shouldFitToScreen ? '100vh' : 'auto',
                        maxWidth: zoomLevel === 1 && shouldFitToScreen ? '100vw' : 'none',
                        maxHeight: zoomLevel === 1 && shouldFitToScreen ? '100vh' : undefined, // No limit for natural size
                      }}
            >
              <OptimizedImage
                src={post.image_url}
                variants={{
                  blur: post.image_blur_url || undefined,
                  small: post.image_small_url || undefined,
                  medium: post.image_medium_url || undefined,
                          large: post.image_large_url || undefined, // VIEW_IMAGE: 2400px
                }}
                alt={post.title}
                variant="fullscreen"
                        className={zoomLevel === 1 && shouldFitToScreen 
                          ? 'w-full h-full' 
                          : 'max-w-none w-auto h-auto'}
                        containerClassName={zoomLevel === 1 && shouldFitToScreen ? 'w-full h-full' : ''}
                priority
                        objectFit="contain"
                        onLoad={(e) => {
                          // Store natural size for fit-to-screen decision
                          const img = e.currentTarget;
                          const naturalSize = {
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                          };
                          setImageNaturalSize(naturalSize);
                        }}
              />
              </div>
                    {/* Loading indicator when fetching original (only if image_asset_id exists) */}
                    {isLoadingOriginal && post.image_asset_id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                          <span className="text-white/80 text-sm">กำลังโหลดภาพความละเอียดสูง...</span>
            </div>
          </div>
                    )}
                  </>
                )}
              </motion.div>
              
              {/* Zoom hint - Show when normal view */}
              {zoomLevel === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 text-white/90 text-sm backdrop-blur-sm pointer-events-none"
                >
                  <ZoomIn className="h-4 w-4" />
                  <span>คลิกเพื่อดูภาพเต็มหน้าจอ</span>
                </motion.div>
              )}
              
              {/* Fit to screen hint - Show when fit to screen */}
              {zoomLevel === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 text-white/90 text-sm backdrop-blur-sm pointer-events-none"
                >
                  <ZoomIn className="h-4 w-4" />
                  <span>คลิกเพื่อซูม 1:1</span>
                </motion.div>
              )}
              
              {/* 1:1 zoom hint - Show when zoomed to 1:1 */}
              {zoomLevel === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 text-white/90 text-sm backdrop-blur-sm pointer-events-none z-50"
                >
                  <ZoomIn className="h-4 w-4 rotate-180" />
                  <span>คลิกเพื่อซูมออก | เลื่อนเพื่อดูภาพ</span>
                </motion.div>
              )}
              
                  </div>
                </div>

          {/* Right Side - Comments & Info Panel (ArtStation/Cara style) */}
          <div className="w-[400px] h-full bg-neutral-900 border-l border-neutral-800 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Artist */}
                <div>
                <Link 
                  to={`/profile/${post.user_id}`}
                  onClick={onClose}
                    className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
                >
                    <Avatar className="h-10 w-10 border-2 border-white/30">
                    <AvatarImage src={post.user_profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-white/20 text-white">
                      {getDisplayName(post.user_profile, post.artist_profile)[0]}
                    </AvatarFallback>
                  </Avatar>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-lg font-medium">
                        {getDisplayName(post.user_profile, post.artist_profile)}
                      </span>
                      <span className="text-white/60 text-sm">
                        @{post.user_profile?.display_id || post.user_id.slice(0, 8)}
                      </span>
                      {post.artist_profile?.is_verified && (
                        <Badge className="h-5 px-1.5 text-xs bg-blue-500 text-white border-0">✓ Verified</Badge>
                      )}
                  </div>
                </Link>
            </div>

                {/* Description */}
              {post.description && (
                  <div className="text-white/80 text-sm leading-relaxed">
                  {renderTextWithMentions(post.description)}
                  </div>
              )}
              
              {/* Tools */}
              {post.tools_used && post.tools_used.length > 0 && (
                <div>
                  <p className="text-white/60 text-xs mb-2">Software Used</p>
                  <div className="flex flex-wrap gap-2">
                    {post.tools_used.map((tool) => (
                      <Badge key={`tool-${tool}`} className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLike(post.id, post.is_liked || false, e);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <Heart className={`h-5 w-5 ${post.is_liked ? 'fill-red-500 text-red-500' : ''}`} />
                    <span className="font-medium">{post.likes_count}</span>
                </button>
                  
                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      isSaved ? onUnsavePost(post.original_post_id || post.id) : onSavePost(post.original_post_id || post.id);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      isSaved 
                        ? 'bg-primary text-white hover:bg-primary/80' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                >
                  <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-neutral-800 border-neutral-700">
                      <DropdownMenuItem onClick={handleShareFacebook} className="text-white hover:bg-neutral-700">
                      Facebook
                    </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShareTwitter} className="text-white hover:bg-neutral-700">
                      X (Twitter)
                    </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShareLine} className="text-white hover:bg-neutral-700">
                      LINE
                    </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyLink} className="text-white hover:bg-neutral-700">
                      <Link2 className="h-4 w-4 mr-2" />
                      คัดลอกลิงก์
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>

                {/* Follow Button */}
                {user && user.id !== post.user_id && (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className="w-full rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFollow(post.user_id, isFollowing, e);
                    }}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}

                {/* Date */}
                <p className="text-white/60 text-xs">
                  {new Date(post.created_at).toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>

                {/* Title - Moved to bottom */}
                <div>
                  <h2 className="text-white text-2xl font-bold">{post.title}</h2>
                </div>

                {/* Hashtags - Moved to bottom */}
                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag) => (
                      <button
                        key={`tag-${tag}`}
                        onClick={() => {
                          onTagSelect(tag);
                          onClose();
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Portfolio Gallery - Show owner's artworks */}
                {post.artist_profile && (
                  <div className="pt-6 border-t border-neutral-700">
                    <h3 className="text-white text-sm font-semibold mb-3">Portfolio</h3>
                    {loadingArtworks ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                      </div>
                    ) : ownerArtworks.length > 0 ? (
                      <JustifiedGrid
                        items={ownerArtworks.map((artwork): JustifiedItem => ({
                          id: artwork.id,
                          imageUrl: artwork.image_url,
                          alt: artwork.title,
                        }))}
                        onItemClick={(item) => {
                          // Check if this artwork has a corresponding community post
                          const postId = artworkToPostMap.get(item.id);
                          if (postId) {
                            // Link to community post page
                            navigate(`/community?post=${postId}`);
                          } else {
                            // Fallback to artwork page if no post found
                            navigate(`/artwork/${item.id}`);
                          }
                          onClose();
                        }}
                        targetRowHeight={120}
                        gap={2}
                        maxRowHeight={200}
                        minRowHeight={80}
                      />
                    ) : (
                      <p className="text-white/50 text-xs py-2">ยังไม่มีผลงานใน Portfolio</p>
                    )}
                  </div>
                )}

                {/* Comments Section - ArtStation/Cara Style */}
                <div id="comments-section" className="comment-section pt-6 border-t border-neutral-700">
                  <h3 className="text-white text-lg font-semibold mb-4">Comments ({post.comments_count || 0})</h3>
                  
                  {/* Comments List */}
                  <div className="space-y-4 mb-4 pr-2">
              {commentsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                </div>
              ) : comments.length === 0 ? (
                      <p className="text-center text-white/60 py-8 text-sm">
                  ยังไม่มีความคิดเห็น
                </p>
              ) : (
                comments.map((comment) => (
                        <div key={comment.id} className="space-y-2">
                          {/* Comment */}
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8 shrink-0 border border-white/30">
                        <AvatarImage src={comment.user_profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-white/20 text-white text-xs">
                          {getDisplayName(comment.user_profile, comment.artist_profile)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        {editingComment?.id === comment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editCommentContent}
                              onChange={(e) => onEditCommentContentChange(e.target.value)}
                                    className="min-h-[60px] text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              autoFocus
                            />
                            <div className="flex gap-2">
                                    <Button size="sm" onClick={onEditComment} disabled={!editCommentContent.trim() || savingCommentEdit} className="bg-primary hover:bg-primary/80">
                                {savingCommentEdit && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                บันทึก
                              </Button>
                                    <Button size="sm" variant="ghost" onClick={onCancelEditComment} className="text-white hover:bg-white/10">
                                ยกเลิก
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-semibold text-sm">
                                {getDisplayName(comment.user_profile, comment.artist_profile)}
                              </span>
                              {comment.artist_profile?.is_verified && (
                                      <Badge className="h-3 px-1 text-[8px] bg-blue-500 text-white border-0">✓</Badge>
                              )}
                              {isBuyerUser(comment.artist_profile) && (
                                      <Badge className="h-3 px-1.5 text-[8px] bg-sky-500 text-white border-0">Buyer</Badge>
                              )}
                                    <span className="text-white/50 text-xs">
                                      {formatTimeAgo(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-white/80 text-sm">
                              {renderTextWithMentions(comment.content)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {user && (
                                <button 
                                  onClick={() => onLikeComment(comment.id, comment.is_liked || false)}
                                  className={`text-xs flex items-center gap-1 ${
                                    comment.is_liked 
                                      ? "text-pink-400 hover:text-pink-300" 
                                      : "text-white/60 hover:text-white"
                                  }`}
                                >
                                  <Heart className={`h-3 w-3 ${comment.is_liked ? "fill-current" : ""}`} />
                                  {comment.likes_count || 0}
                                </button>
                              )}
                              {user && (
                                      <button 
                                        onClick={() => onStartReply(comment)}
                                        className="text-xs text-white/60 hover:text-white"
                                      >
                                  ตอบกลับ
                                </button>
                              )}
                              {user && user.id === comment.user_id && (
                                      <button 
                                        onClick={() => onStartEditComment(comment)}
                                        className="text-xs text-white/60 hover:text-white"
                                      >
                                  แก้ไข
                                </button>
                              )}
                              {user && (user.id === comment.user_id || user.id === post.user_id) && (
                                      <button 
                                        onClick={() => onDeleteComment(comment.id)} 
                                        disabled={deletingCommentId === comment.id}
                                        className="text-xs text-red-400 hover:text-red-300"
                                      >
                                  {deletingCommentId === comment.id ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "ลบ"}
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
                        {!expandedReplies.has(comment.id) ? (
                          <button
                            onClick={() => onToggleReplies(comment.id, true)}
                                  className="ml-11 text-xs text-white/60 hover:text-white flex items-center gap-1"
                          >
                            <ChevronDown className="h-3 w-3" />
                            ดูการตอบกลับ {comment.replies.length} รายการ
                          </button>
                        ) : (
                                <div className="ml-8 pl-3 border-l-2 border-white/20 space-y-3">
                            <button
                              onClick={() => onToggleReplies(comment.id, false)}
                                    className="text-xs text-white/60 hover:text-white flex items-center gap-1"
                            >
                              <ChevronUp className="h-3 w-3" />
                              ซ่อนการตอบกลับ
                            </button>
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2">
                                <Avatar className="h-6 w-6 shrink-0 border border-white/30">
                                  <AvatarImage src={reply.user_profile?.avatar_url || undefined} />
                                  <AvatarFallback className="bg-white/20 text-white text-[10px]">
                                    {getDisplayName(reply.user_profile, reply.artist_profile)[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white/80">
                                    <span className="font-semibold mr-1 text-xs">
                                      {getDisplayName(reply.user_profile, reply.artist_profile)}
                                    </span>
                                    {reply.artist_profile?.is_verified && (
                                      <Badge className="h-3 px-1 text-[8px] bg-blue-500 text-white border-0 mr-1">✓</Badge>
                                    )}
                                    <span className="text-xs">{renderTextWithMentions(reply.content)}</span>
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {user && (
                                      <button 
                                        onClick={() => onLikeComment(reply.id, reply.is_liked || false)}
                                        className={`text-[10px] flex items-center gap-1 ${
                                          reply.is_liked 
                                            ? "text-pink-400 hover:text-pink-300" 
                                            : "text-white/60 hover:text-white"
                                        }`}
                                      >
                                        <Heart className={`h-2.5 w-2.5 ${reply.is_liked ? "fill-current" : ""}`} />
                                        {reply.likes_count || 0}
                                      </button>
                                    )}
                                    <span className="text-[10px] text-white/50">{formatTimeAgo(reply.created_at)}</span>
                                    {user && (
                                      <button
                                        onClick={() => onStartReply(comment)}
                                        className="text-[10px] text-white/60 hover:text-white"
                                      >
                                        ตอบกลับ
                                      </button>
                                    )}
                                    {user && (user.id === reply.user_id || user.id === post.user_id) && (
                                      <button 
                                        onClick={() => onDeleteComment(reply.id)} 
                                        disabled={deletingCommentId === reply.id}
                                        className="text-[10px] text-red-400 hover:text-red-300"
                                      >
                                        {deletingCommentId === reply.id ? <Loader2 className="h-2 w-2 animate-spin inline" /> : "ลบ"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Reply Input */}
                    {replyingToComment?.id === comment.id && user && (
                            <div className="ml-8 pl-3 border-l-2 border-white/30">
                              <div className="text-xs text-white/60 mb-2 flex items-center justify-between">
                          <span>ตอบกลับ {getDisplayName(comment.user_profile, comment.artist_profile)}</span>
                                <button onClick={onCancelReply} className="text-white/60 hover:text-white">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex gap-2 items-center">
                                <Avatar className="h-6 w-6 shrink-0 border border-white/30">
                            <AvatarImage src={user?.user_metadata?.avatar_url || undefined} />
                                  <AvatarFallback className="bg-white/20 text-white text-[10px]">
                              {(user?.user_metadata?.full_name || user?.email || "U")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <MentionInput
                              value={replyContent}
                              onChange={onReplyContentChange}
                              placeholder="เขียนการตอบกลับ..."
                              rows={1}
                              className="min-h-[32px] resize-none rounded-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                              onSubmit={() => {
                                if (replyContent.trim() && !submittingReply) {
                                  onSubmitReply(comment);
                                }
                              }}
                            />
                          </div>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 shrink-0 text-white hover:bg-white/10" 
                                  onClick={() => onSubmitReply(comment)} 
                                  disabled={!replyContent.trim() || submittingReply}
                                >
                            {submittingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            {user && (
                <div className="flex gap-2 items-center">
                      <Avatar className="h-8 w-8 shrink-0 border border-white/30">
                    <AvatarImage src={user?.user_metadata?.avatar_url || undefined} />
                        <AvatarFallback className="bg-white/20 text-white text-xs">
                      {(user?.user_metadata?.full_name || user?.email || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <MentionInput
                      value={newComment}
                      onChange={onNewCommentChange}
                          placeholder="เขียนความคิดเห็น..."
                      rows={1}
                          className="min-h-[40px] resize-none rounded-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      onSubmit={onSubmitComment}
                    />
                  </div>
                  <Button
                    size="icon"
                        className="shrink-0 rounded-lg bg-primary hover:bg-primary/80"
                    onClick={onSubmitComment}
                    disabled={!newComment.trim() || submittingComment}
                  >
                    {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
              </div>
            )}
          </div>
        </div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
