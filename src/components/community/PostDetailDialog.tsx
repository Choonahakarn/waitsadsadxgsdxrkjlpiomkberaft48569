import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, MessageCircle, Send, X, Loader2, 
  Share2, Bookmark, MoreHorizontal, Repeat2, Link2,
  ChevronDown, ChevronUp, ZoomIn
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MentionInput, renderTextWithMentions } from "@/components/ui/MentionInput";
import OptimizedImage from "@/components/ui/OptimizedImage";
import ImageViewer from "@/components/ui/ImageViewer";
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
}: PostDetailDialogProps) {
  const { toast } = useToast();
  const [imgAspect, setImgAspect] = useState<'normal' | 'tall'>('normal');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  useEffect(() => {
    if (post?.image_url) {
      const img = new Image();
      img.onload = () => {
        // If height is more than 1.5x width, it's a tall image (Pixiv style)
        setImgAspect(img.height > img.width * 1.5 ? 'tall' : 'normal');
      };
      img.src = post.image_url;
    }
  }, [post?.image_url]);

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

  // Pixiv-style layout for very tall images
  if (imgAspect === 'tall') {
    return (
      <Dialog open={!!post} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 overflow-hidden bg-transparent border-0 rounded-none [&>button]:hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Semi-transparent dark overlay with blur */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

          {/* Main Image - Clickable for full-screen zoom */}
            <div 
              className="relative z-10 w-full h-full overflow-y-auto flex justify-center items-start py-4 cursor-zoom-in"
              onClick={() => setIsImageViewerOpen(true)}
            >
              <OptimizedImage
                src={post.image_url}
                variants={{
                  blur: post.image_blur_url || undefined,
                  small: post.image_small_url || undefined,
                  medium: post.image_medium_url || undefined,
                  large: post.image_large_url || undefined,
                }}
                alt={post.title}
                variant="fullscreen"
                className="w-auto max-w-[95vw] h-auto"
                priority
              />
              {/* Zoom hint */}
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 text-white/80 text-sm opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                <ZoomIn className="h-4 w-4" />
                <span>คลิกเพื่อซูม</span>
              </div>
            </div>

            {/* Full-screen Image Viewer for zoom */}
            <ImageViewer
              isOpen={isImageViewerOpen}
              onClose={() => setIsImageViewerOpen(false)}
              imageUrl={post.image_url}
              variants={{
                blur: post.image_blur_url || undefined,
                small: post.image_small_url || undefined,
                medium: post.image_medium_url || undefined,
                large: post.image_large_url || undefined,
              }}
              alt={post.title}
              imageAssetId={post.image_asset_id || undefined}
              title={post.title}
              artist={getDisplayName(post.user_profile, post.artist_profile)}
            />

            {/* Bottom Action Bar - Pixiv Style */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6">
              <div className="max-w-4xl mx-auto">
                {/* Title */}
                <h2 className="text-white text-xl font-bold mb-2">{post.title}</h2>
                
                {/* Artist */}
                <Link 
                  to={`/profile/${post.user_id}`}
                  onClick={onClose}
                  className="flex items-center gap-2 mb-4 hover:opacity-80"
                >
                  <Avatar className="h-8 w-8 border border-white/30">
                    <AvatarImage src={post.user_profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getDisplayName(post.user_profile, post.artist_profile)[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white/90 text-sm font-medium">
                    {getDisplayName(post.user_profile, post.artist_profile)}
                  </span>
                  {post.artist_profile?.is_verified && (
                    <Badge className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">✓</Badge>
                  )}
                </Link>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Like */}
                    <button
                      onClick={(e) => onLike(post.id, post.is_liked || false, e)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      <Heart className={`h-5 w-5 ${post.is_liked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{post.likes_count}</span>
                    </button>
                    
                    {/* Comment */}
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80">
                      <MessageCircle className="h-5 w-5" />
                      <span>{post.comments_count || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Save */}
                    <button
                      onClick={() => isSaved ? onUnsavePost(post.original_post_id || post.id) : onSavePost(post.original_post_id || post.id)}
                      className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-primary text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                      <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                    </button>

                    {/* Share */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                          <Share2 className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleShareFacebook}>Facebook</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleShareTwitter}>X (Twitter)</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleShareLine}>LINE</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCopyLink}>คัดลอกลิงก์</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* More */}
                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Cara-style layout for normal/wide images
  return (
    <Dialog open={!!post} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 overflow-hidden gap-0 border-0 rounded-none bg-transparent [&>button]:hidden">
        <div className="flex flex-col lg:flex-row h-full w-full">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Image Section - Center - Clickable for full-screen zoom */}
          <div 
            className="flex-1 flex items-center justify-center min-h-[40vh] lg:min-h-0 lg:h-full overflow-auto relative cursor-zoom-in group"
            onClick={() => setIsImageViewerOpen(true)}
          >
            {/* Semi-transparent dark overlay */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <OptimizedImage
              src={post.image_url}
              variants={{
                blur: post.image_blur_url || undefined,
                small: post.image_small_url || undefined,
                medium: post.image_medium_url || undefined,
                large: post.image_large_url || undefined,
              }}
              alt={post.title}
              variant="fullscreen"
              className="relative z-10 w-auto h-auto max-w-full object-contain"
              priority
            />
            {/* Zoom hint on hover */}
            <div className="absolute z-20 bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 text-white/80 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="h-4 w-4" />
              <span>คลิกเพื่อซูม</span>
            </div>
          </div>

          {/* Full-screen Image Viewer for zoom */}
          <ImageViewer
            isOpen={isImageViewerOpen}
            onClose={() => setIsImageViewerOpen(false)}
            imageUrl={post.image_url}
            variants={{
              blur: post.image_blur_url || undefined,
              small: post.image_small_url || undefined,
              medium: post.image_medium_url || undefined,
              large: post.image_large_url || undefined,
            }}
            alt={post.title}
            imageAssetId={post.image_asset_id || undefined}
            title={post.title}
            artist={getDisplayName(post.user_profile, post.artist_profile)}
          />

          {/* Content Section - Right - Fixed width panel */}
          <div className="w-full lg:w-[420px] xl:w-[480px] flex flex-col bg-background border-l border-border max-h-[55vh] lg:max-h-full lg:h-full shrink-0">
            {/* Header with User Info */}
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-center justify-between">
                <Link 
                  to={`/profile/${post.user_id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.user_profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {getDisplayName(post.user_profile, post.artist_profile)[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm">
                        {getDisplayName(post.user_profile, post.artist_profile)}
                      </span>
                      {post.artist_profile?.is_verified && (
                        <Badge className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">✓</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      @{post.user_profile?.display_name || post.user_id.slice(0, 8)}
                    </span>
                  </div>
                </Link>
                {user && user.id !== post.user_id && (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className="rounded-full"
                    onClick={(e) => onFollow(post.user_id, isFollowing, e)}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
            </div>

            {/* Title, Description, Tags */}
            <div className="p-4 border-b border-border shrink-0">
              <h2 className="font-bold text-lg leading-tight">{post.title}</h2>
              {post.description && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {renderTextWithMentions(post.description)}
                </p>
              )}
              
              {/* Tools & Tags */}
              {((post.tools_used && post.tools_used.length > 0) || (post.hashtags && post.hashtags.length > 0)) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {post.tools_used?.map((tool) => (
                    <Badge key={`tool-${tool}`} variant="outline" className="text-xs">
                      ✦ {tool}
                    </Badge>
                  ))}
                  {post.hashtags?.map((tag) => (
                    <button
                      key={`tag-${tag}`}
                      onClick={() => {
                        onTagSelect(tag);
                        onClose();
                      }}
                      className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Date */}
              <p className="text-xs text-muted-foreground mt-3">
                {new Date(post.created_at).toLocaleDateString('th-TH', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Action Icons Row - Cara Style */}
            <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                {/* Like */}
                <button
                  onClick={(e) => onLike(post.id, post.is_liked || false, e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <Heart className={`h-5 w-5 ${post.is_liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium">{post.likes_count}</span>
                </button>
                {/* Comment */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-muted-foreground">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{post.comments_count || 0}</span>
                </div>
              </div>
              
              {/* Right icons */}
              <div className="flex items-center gap-0.5">
                {/* Repost */}
                <button
                  onClick={() => onShareDialogOpen(post)}
                  className={`p-2 rounded-full hover:bg-muted transition-colors ${isReposted ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Repost"
                >
                  <Repeat2 className="h-5 w-5" />
                </button>
                {/* Save */}
                <button
                  onClick={() => isSaved ? onUnsavePost(post.original_post_id || post.id) : onSavePost(post.original_post_id || post.id)}
                  className={`p-2 rounded-full hover:bg-muted transition-colors ${isSaved ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="บันทึก"
                >
                  <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                </button>
                {/* Share dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Share2 className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleShareFacebook}>
                      <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareTwitter}>
                      <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X (Twitter)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareLine}>
                      <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                      </svg>
                      LINE
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <Link2 className="h-4 w-4 mr-2" />
                      คัดลอกลิงก์
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {commentsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
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
                          <div className="space-y-2">
                            <Textarea
                              value={editCommentContent}
                              onChange={(e) => onEditCommentContentChange(e.target.value)}
                              className="min-h-[60px] text-sm"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={onEditComment} disabled={!editCommentContent.trim() || savingCommentEdit}>
                                {savingCommentEdit && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                บันทึก
                              </Button>
                              <Button size="sm" variant="ghost" onClick={onCancelEditComment}>
                                ยกเลิก
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm">
                              <span className="font-semibold mr-1">
                                {getDisplayName(comment.user_profile, comment.artist_profile)}
                              </span>
                              {comment.artist_profile?.is_verified && (
                                <Badge className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0 mr-1">✓</Badge>
                              )}
                              {isBuyerUser(comment.artist_profile) && (
                                <Badge className="h-4 px-1.5 text-[10px] bg-sky-500 text-white border-0 mr-2">Buyer</Badge>
                              )}
                              {renderTextWithMentions(comment.content)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.created_at)}</span>
                              {user && (
                                <button onClick={() => onStartReply(comment)} className="text-xs text-muted-foreground hover:text-foreground font-medium">
                                  ตอบกลับ
                                </button>
                              )}
                              {user && user.id === comment.user_id && (
                                <button onClick={() => onStartEditComment(comment)} className="text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  แก้ไข
                                </button>
                              )}
                              {user && (user.id === comment.user_id || user.id === post.user_id) && (
                                <button onClick={() => onDeleteComment(comment.id)} disabled={deletingCommentId === comment.id} className="text-xs text-destructive hover:text-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            className="ml-11 text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ChevronDown className="h-3 w-3" />
                            ดูการตอบกลับ {comment.replies.length} รายการ
                          </button>
                        ) : (
                          <div className="ml-8 pl-3 border-l-2 border-muted space-y-3">
                            <button
                              onClick={() => onToggleReplies(comment.id, false)}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <ChevronUp className="h-3 w-3" />
                              ซ่อนการตอบกลับ
                            </button>
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="group flex gap-2">
                                <Avatar className="h-6 w-6 shrink-0">
                                  <AvatarImage src={reply.user_profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {getDisplayName(reply.user_profile, reply.artist_profile)[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm">
                                    <span className="font-semibold mr-1 text-xs">
                                      {getDisplayName(reply.user_profile, reply.artist_profile)}
                                    </span>
                                    {reply.artist_profile?.is_verified && (
                                      <Badge className="h-3 px-1 text-[8px] bg-blue-500 text-white border-0 mr-1">✓</Badge>
                                    )}
                                    <span className="text-xs">{renderTextWithMentions(reply.content)}</span>
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground">{formatTimeAgo(reply.created_at)}</span>
                                    {user && (user.id === reply.user_id || user.id === post.user_id) && (
                                      <button onClick={() => onDeleteComment(reply.id)} disabled={deletingCommentId === reply.id} className="text-[10px] text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <div className="ml-8 pl-3 border-l-2 border-primary/30">
                        <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                          <span>ตอบกลับ {getDisplayName(comment.user_profile, comment.artist_profile)}</span>
                          <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
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
                          <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => onReplyContentChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && replyContent.trim() && !submittingReply) {
                                e.preventDefault();
                                onSubmitReply(comment);
                              }
                            }}
                            placeholder="เขียนการตอบกลับ..."
                            className="flex-1 bg-background border border-border rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                            disabled={submittingReply}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onSubmitReply(comment)} disabled={!replyContent.trim() || submittingReply}>
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
              <div className="p-4 border-t border-border shrink-0">
                <div className="flex gap-2 items-center">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={user?.user_metadata?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(user?.user_metadata?.full_name || user?.email || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <MentionInput
                      value={newComment}
                      onChange={onNewCommentChange}
                      placeholder="เขียนความคิดเห็น... พิมพ์ @ เพื่อแท็กผู้ใช้"
                      rows={1}
                      className="min-h-[40px] resize-none rounded-full"
                    />
                  </div>
                  <Button
                    size="icon"
                    className="shrink-0 rounded-full"
                    onClick={onSubmitComment}
                    disabled={!newComment.trim() || submittingComment}
                  >
                    {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
