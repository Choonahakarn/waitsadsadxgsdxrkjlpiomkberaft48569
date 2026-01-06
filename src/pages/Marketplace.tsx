import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Check, UserCheck, Loader2, X, Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Artwork {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  price: number;
  medium: string | null;
  category: string | null;
  type: string | null;
  is_verified: boolean | null;
  is_sold: boolean | null;
  artist_id: string;
  created_at: string;
  artist_profiles?: {
    id: string;
    artist_name: string;
    avatar_url: string | null;
    is_verified: boolean | null;
    identity_verified: boolean | null;
    user_id: string;
  };
}

const ITEMS_PER_PAGE = 5;

export default function Marketplace() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [likedArtworks, setLikedArtworks] = useState<Set<string>>(new Set());
  const [savedArtworks, setSavedArtworks] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch artworks with pagination
  const fetchArtworks = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setArtworks([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = reset ? 0 : artworks.length;
      
      let query = supabase
        .from("artworks")
        .select(`
          *,
          artist_profiles (id, artist_name, avatar_url, is_verified, identity_verified, user_id)
        `)
        .eq("is_sold", false)
        .eq("is_verified", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (reset) {
        setArtworks(data || []);
      } else {
        setArtworks(prev => [...prev, ...(data || [])]);
      }
      
      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching artworks:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [artworks.length, searchQuery]);

  // Initial fetch
  useEffect(() => {
    fetchArtworks(true);
  }, [searchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchArtworks(false);
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
  }, [loading, hasMore, loadingMore, fetchArtworks]);

  // Handle like
  const handleLike = (artworkId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "กรุณาเข้าสู่ระบบ",
        description: "เข้าสู่ระบบเพื่อกดถูกใจ"
      });
      return;
    }
    
    setLikedArtworks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(artworkId)) {
        newSet.delete(artworkId);
      } else {
        newSet.add(artworkId);
      }
      return newSet;
    });
  };

  // Handle save/bookmark
  const handleSave = (artworkId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "กรุณาเข้าสู่ระบบ",
        description: "เข้าสู่ระบบเพื่อบันทึก"
      });
      return;
    }
    
    setSavedArtworks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(artworkId)) {
        newSet.delete(artworkId);
        toast({ title: "ยกเลิกการบันทึกแล้ว" });
      } else {
        newSet.add(artworkId);
        toast({ title: "บันทึกแล้ว ✓" });
      }
      return newSet;
    });
  };

  // Handle share
  const handleShare = async (artwork: Artwork) => {
    const url = `${window.location.origin}/artwork/${artwork.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: artwork.title,
          text: `ดูผลงาน "${artwork.title}" โดย ${artwork.artist_profiles?.artist_name}`,
          url: url
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: "คัดลอกลิงก์แล้ว!",
        description: "ลิงก์ผลงานถูกคัดลอกไปยังคลิปบอร์ด"
      });
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

  return (
    <Layout>
      {/* Sticky Search Header */}
      <div className="sticky top-20 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-2xl px-4 py-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('marketplace.searchPlaceholder')}
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
      </div>

      {/* Feed Content */}
      <div className="container mx-auto max-w-2xl px-4 py-4">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
          </div>
        ) : artworks.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">ไม่พบผลงาน</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "ลองค้นหาด้วยคำอื่น" : "ยังไม่มีผลงานในตลาด"}
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
              {artworks.map((artwork, index) => (
                <motion.article
                  key={artwork.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between p-4">
                    <Link 
                      to={`/artist/${artwork.artist_id}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        <AvatarImage src={artwork.artist_profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {artwork.artist_profiles?.artist_name?.[0]?.toUpperCase() || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">
                            {artwork.artist_profiles?.artist_name || "Unknown Artist"}
                          </span>
                          {artwork.artist_profiles?.is_verified && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-green-500 text-white border-0">
                              <Check className="h-2.5 w-2.5" />
                            </Badge>
                          )}
                          {artwork.artist_profiles?.identity_verified && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">
                              <UserCheck className="h-2.5 w-2.5" />
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(artwork.created_at)}
                        </span>
                      </div>
                    </Link>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleShare(artwork)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          แชร์
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSave(artwork.id)}>
                          <Bookmark className="h-4 w-4 mr-2" />
                          {savedArtworks.has(artwork.id) ? "ยกเลิกบันทึก" : "บันทึก"}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/artist/${artwork.artist_id}`}>
                            ดูโปรไฟล์ศิลปิน
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Image */}
                  <Link to={`/artwork/${artwork.id}`}>
                    <div className="relative aspect-square bg-muted">
                      <img
                        src={artwork.image_url}
                        alt={artwork.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {artwork.is_verified && (
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                          <Check className="h-3 w-3" />
                          Human Verified
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => handleLike(artwork.id)}
                      >
                        <Heart 
                          className={`h-6 w-6 transition-colors ${
                            likedArtworks.has(artwork.id) 
                              ? "fill-red-500 text-red-500" 
                              : "text-foreground"
                          }`} 
                        />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
                        <Link to={`/artwork/${artwork.id}`}>
                          <MessageCircle className="h-6 w-6" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => handleShare(artwork)}
                      >
                        <Share2 className="h-6 w-6" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => handleSave(artwork.id)}
                    >
                      <Bookmark 
                        className={`h-6 w-6 transition-colors ${
                          savedArtworks.has(artwork.id) 
                            ? "fill-foreground" 
                            : ""
                        }`} 
                      />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="px-4 pb-4 space-y-2">
                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-primary">
                        ฿{artwork.price.toLocaleString()}
                      </span>
                      <Button size="sm" asChild>
                        <Link to={`/artwork/${artwork.id}`}>
                          ดูรายละเอียด
                        </Link>
                      </Button>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <Link to={`/artwork/${artwork.id}`}>
                        <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                          {artwork.title}
                        </h3>
                      </Link>
                      {artwork.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {artwork.description}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    {(artwork.medium || artwork.category) && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {artwork.category && (
                          <Badge variant="secondary" className="text-xs">
                            {artwork.category}
                          </Badge>
                        )}
                        {artwork.medium && (
                          <Badge variant="outline" className="text-xs">
                            {artwork.medium}
                          </Badge>
                        )}
                      </div>
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
              {!hasMore && artworks.length > 0 && (
                <p className="text-muted-foreground text-sm">
                  คุณดูผลงานทั้งหมดแล้ว ✨
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
