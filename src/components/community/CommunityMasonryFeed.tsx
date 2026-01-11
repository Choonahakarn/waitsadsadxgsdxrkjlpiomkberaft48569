import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, UserPlus, UserCheck, Pencil, Trash2, Flag, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// =============================================
// COMMUNITY MASONRY FEED COMPONENT
// =============================================
// Pinterest/Cara-style masonry layout for community posts
// =============================================

interface CommunityPost {
  id: string;
  original_post_id?: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
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

interface CommunityMasonryFeedProps {
  posts: CommunityPost[];
  savedPosts: Set<string>;
  repostedPosts: Set<string>;
  followingUsers: Set<string>;
  currentUserId?: string;
  onPostClick: (post: CommunityPost) => void;
  onLike: (postId: string, isLiked: boolean, event?: React.MouseEvent, originalPostId?: string) => void;
  onSave: (postId: string, originalPostId?: string) => void;
  onFollow: (userId: string, isFollowing: boolean, event?: React.MouseEvent) => void;
  onShare: (post: CommunityPost) => void;
  onRepost: (post: CommunityPost) => void;
  onEditPost?: (post: CommunityPost) => void;
  onDeletePost?: (post: CommunityPost) => void;
  onReportPost?: (post: CommunityPost) => void;
  onTagClick?: (tag: string) => void;
  className?: string;
}

// Calculate column count based on container width
const getColumnCount = (containerWidth: number): number => {
  if (containerWidth < 640) return 2;
  if (containerWidth < 1024) return 3;
  if (containerWidth < 1280) return 3;
  return 4;
};

// Get column width based on screen size
const getColumnWidth = (containerWidth: number, gap: number): number => {
  const columnCount = getColumnCount(containerWidth);
  return (containerWidth - (gap * (columnCount - 1))) / columnCount;
};

// Helper functions
const getDisplayName = (
  userProfile?: { full_name: string | null; display_name: string | null } | null,
  artistProfile?: { artist_name: string; is_verified: boolean } | null
) => {
  if (artistProfile?.artist_name) {
    return artistProfile.artist_name;
  }
  return userProfile?.display_name || userProfile?.full_name || "ผู้ใช้";
};

const isBuyerUser = (artistProfile?: { artist_name: string; is_verified: boolean } | null) => {
  return !artistProfile;
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

export default function CommunityMasonryFeed({
  posts,
  savedPosts,
  repostedPosts,
  followingUsers,
  currentUserId,
  onPostClick,
  onLike,
  onSave,
  onFollow,
  onShare,
  onRepost,
  onEditPost,
  onDeletePost,
  onReportPost,
  onTagClick,
  className,
}: CommunityMasonryFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const gap = 16;

  // Observe container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate layout
  const layout = useMemo(() => {
    if (!containerWidth || posts.length === 0) {
      return { columns: [] as CommunityPost[][], columnWidth: 0, columnCount: 0 };
    }

    const columnCount = getColumnCount(containerWidth);
    const columnWidth = getColumnWidth(containerWidth, gap);
    
    // Initialize columns with heights
    const columnHeights = new Array(columnCount).fill(0);
    const columnItems: CommunityPost[][] = Array.from({ length: columnCount }, () => []);

    // Distribute items using shortest-column algorithm
    posts.forEach((post) => {
      // Estimate item height (image + content)
      const baseHeight = columnWidth; // Square image default
      const contentHeight = 120; // Estimated content height
      const itemHeight = baseHeight + contentHeight;

      // Find shortest column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      // Add item to shortest column
      columnItems[shortestColumnIndex].push(post);
      
      // Update column height (include gap)
      columnHeights[shortestColumnIndex] += itemHeight + gap;
    });

    return {
      columns: columnItems,
      columnWidth,
      columnCount,
    };
  }, [containerWidth, posts]);

  return (
    <div ref={containerRef} className={cn('w-full', className)}>
      <div className="flex justify-center" style={{ gap: `${gap}px` }}>
        {layout.columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className="flex flex-col"
            style={{ 
              width: layout.columnWidth,
              gap: `${gap}px`,
            }}
          >
            <AnimatePresence>
              {column.map((post, itemIndex) => (
                <MasonryPostCard
                  key={post.id}
                  post={post}
                  columnWidth={layout.columnWidth}
                  columnIndex={columnIndex}
                  itemIndex={itemIndex}
                  isSaved={savedPosts.has(post.original_post_id || post.id)}
                  isReposted={repostedPosts.has(post.original_post_id || post.id)}
                  isFollowing={followingUsers.has(post.user_id)}
                  isOwnPost={currentUserId === post.user_id}
                  currentUserId={currentUserId}
                  onPostClick={() => onPostClick(post)}
                  onLike={(e) => onLike(post.id, post.is_liked || false, e, post.original_post_id)}
                  onSave={() => onSave(post.id, post.original_post_id)}
                  onFollow={(e) => onFollow(post.user_id, followingUsers.has(post.user_id), e)}
                  onShare={() => onShare(post)}
                  onRepost={() => onRepost(post)}
                  onEdit={onEditPost ? () => onEditPost(post) : undefined}
                  onDelete={onDeletePost ? () => onDeletePost(post) : undefined}
                  onReport={onReportPost ? () => onReportPost(post) : undefined}
                  onTagClick={onTagClick}
                />
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// Individual masonry post card
interface MasonryPostCardProps {
  post: CommunityPost;
  columnWidth: number;
  columnIndex: number;
  itemIndex: number;
  isSaved: boolean;
  isReposted: boolean;
  isFollowing: boolean;
  isOwnPost: boolean;
  currentUserId?: string;
  onPostClick: () => void;
  onLike: (e?: React.MouseEvent) => void;
  onSave: () => void;
  onFollow: (e?: React.MouseEvent) => void;
  onShare: () => void;
  onRepost: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onTagClick?: (tag: string) => void;
}

function MasonryPostCard({
  post,
  columnWidth,
  columnIndex,
  itemIndex,
  isSaved,
  isReposted,
  isFollowing,
  isOwnPost,
  currentUserId,
  onPostClick,
  onLike,
  onSave,
  onFollow,
  onShare,
  onRepost,
  onEdit,
  onDelete,
  onReport,
  onTagClick,
}: MasonryPostCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        delay: (columnIndex + itemIndex) * 0.03,
        duration: 0.3,
        ease: 'easeOut'
      }}
      className="bg-card border border-border rounded-xl overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Repost indicator */}
      {post.is_repost && post.repost_user_id && (
        <Link 
          to={`/profile/${post.repost_user_id}`} 
          className="px-3 py-2 flex items-center gap-2 text-muted-foreground text-xs border-b border-border/50 hover:bg-muted/30 transition-colors"
        >
          <Repeat2 className="h-3 w-3" />
          <span className="font-medium text-foreground truncate">
            {getDisplayName(post.repost_user_profile, post.repost_artist_profile)}
          </span>
          <span className="shrink-0">รีโพสต์</span>
        </Link>
      )}

      {/* Image with hover overlay */}
      <div 
        className="relative cursor-pointer overflow-hidden"
        onClick={onPostClick}
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
          variant="feed"
          className="w-full transition-transform duration-300 group-hover:scale-105"
          aspectRatio="auto"
        />

        {/* Hover overlay */}
        <motion.div
          initial={false}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"
        />

        {/* Quick actions on hover */}
        <motion.div
          initial={false}
          animate={{ 
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 10,
          }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onLike(e);
              }}
            >
              <Heart className={cn(
                "h-5 w-5",
                post.is_liked && "fill-red-500 text-red-500"
              )} />
            </Button>
            <span className="text-white text-sm font-medium">{post.likes_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
            >
              <Bookmark className={cn(
                "h-5 w-5",
                isSaved && "fill-white"
              )} />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* User info */}
        <div className="flex items-center justify-between">
          <Link 
            to={`/profile/${post.user_id}`} 
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={post.user_profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getDisplayName(post.user_profile, post.artist_profile)[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-medium text-sm truncate">
                  {getDisplayName(post.user_profile, post.artist_profile)}
                </span>
                {post.artist_profile?.is_verified && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-blue-500 text-white border-0 shrink-0">
                    ✓
                  </Badge>
                )}
              </div>
            </div>
          </Link>

          {/* Dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRepost}>
                <Repeat2 className="h-4 w-4 mr-2" />
                แชร์โพสต์ภายใน
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" />
                แชร์ลิงก์
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSave}>
                <Bookmark className="h-4 w-4 mr-2" />
                {isSaved ? "ยกเลิกบันทึก" : "บันทึก"}
              </DropdownMenuItem>
              {currentUserId && !isOwnPost && (
                <DropdownMenuItem onClick={(e) => onFollow(e)}>
                  {isFollowing ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      เลิกติดตาม
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      ติดตาม
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {isOwnPost && !post.is_repost && onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  แก้ไขโพสต์
                </DropdownMenuItem>
              )}
              {isOwnPost && !post.is_repost && onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบโพสต์
                </DropdownMenuItem>
              )}
              {currentUserId && !isOwnPost && onReport && (
                <DropdownMenuItem onClick={onReport} className="text-destructive focus:text-destructive">
                  <Flag className="h-4 w-4 mr-2" />
                  รายงานโพสต์
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <h3 
          className="font-semibold text-sm line-clamp-2 cursor-pointer hover:text-primary transition-colors"
          onClick={onPostClick}
        >
          {post.title}
        </h3>

        {/* Tags */}
        {(post.hashtags && post.hashtags.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.slice(0, 3).map((tag, i) => (
              <button
                key={`tag-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(tag);
                }}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1">
            <Heart className={cn("h-3.5 w-3.5", post.is_liked && "fill-red-500 text-red-500")} />
            {post.likes_count}
          </span>
          {(post.comments_count || 0) > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {post.comments_count}
            </span>
          )}
          <span className="ml-auto">{formatTimeAgo(post.created_at)}</span>
        </div>
      </div>
    </motion.article>
  );
}
