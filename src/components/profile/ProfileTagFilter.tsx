import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Hash, Settings2, GripVertical, X, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CommunityPost {
  id: string;
  tools_used?: string[] | null;
  hashtags?: string[] | null;
  description?: string | null;
}

interface PinnedTag {
  id: string;
  tag: string;
  display_order: number;
}

interface ProfileTagFilterProps {
  userId: string;
  posts: CommunityPost[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

// Get all unique hashtags from posts (only from hashtags field, not tools_used)
const getAllTagsFromPosts = (posts: CommunityPost[]): Map<string, number> => {
  const tagCounts = new Map<string, number>();
  
  posts.forEach(post => {
    // Only add hashtags from the hashtags field
    if (post.hashtags) {
      post.hashtags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }
  });
  
  return tagCounts;
};

export function ProfileTagFilter({ userId, posts, selectedTag, onTagSelect }: ProfileTagFilterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.id === userId;
  
  const [pinnedTags, setPinnedTags] = useState<PinnedTag[]>([]);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [tempPinnedTags, setTempPinnedTags] = useState<string[]>([]);
  const [draggedTag, setDraggedTag] = useState<string | null>(null);
  
  // Get all tags from posts with counts
  const allTagsWithCounts = useMemo(() => getAllTagsFromPosts(posts), [posts]);
  const allTags = useMemo(() => 
    Array.from(allTagsWithCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
  , [allTagsWithCounts]);
  
  // Fetch pinned tags
  useEffect(() => {
    const fetchPinnedTags = async () => {
      const { data, error } = await supabase
        .from('user_pinned_tags')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      
      if (!error && data) {
        setPinnedTags(data);
      }
    };
    
    if (userId) {
      fetchPinnedTags();
    }
  }, [userId]);
  
  // Tags to display: pinned tags first, then remaining popular tags (up to 20)
  const displayTags = useMemo(() => {
    const pinnedTagNames = pinnedTags.map(pt => pt.tag);
    const unpinnedTags = allTags.filter(tag => !pinnedTagNames.includes(tag));
    const combined = [...pinnedTagNames, ...unpinnedTags];
    return combined.slice(0, 20);
  }, [pinnedTags, allTags]);
  
  const handleOpenManageDialog = () => {
    setTempPinnedTags(pinnedTags.map(pt => pt.tag));
    setManageDialogOpen(true);
  };
  
  const handleTogglePinTag = (tag: string) => {
    setTempPinnedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else if (prev.length < 20) {
        return [...prev, tag];
      }
      return prev;
    });
  };
  
  const handleDragStart = (tag: string) => {
    setDraggedTag(tag);
  };
  
  const handleDragOver = (e: React.DragEvent, targetTag: string) => {
    e.preventDefault();
    if (!draggedTag || draggedTag === targetTag) return;
    
    setTempPinnedTags(prev => {
      const draggedIndex = prev.indexOf(draggedTag);
      const targetIndex = prev.indexOf(targetTag);
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      const newOrder = [...prev];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedTag);
      return newOrder;
    });
  };
  
  const handleDragEnd = () => {
    setDraggedTag(null);
  };
  
  const handleSavePinnedTags = async () => {
    if (!user || user.id !== userId) return;
    
    setSavingTags(true);
    try {
      // Delete existing pinned tags
      await supabase
        .from('user_pinned_tags')
        .delete()
        .eq('user_id', userId);
      
      // Insert new pinned tags with order
      if (tempPinnedTags.length > 0) {
        const tagsToInsert = tempPinnedTags.map((tag, index) => ({
          user_id: userId,
          tag,
          display_order: index,
        }));
        
        await supabase
          .from('user_pinned_tags')
          .insert(tagsToInsert);
      }
      
      // Update local state
      const { data } = await supabase
        .from('user_pinned_tags')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      
      if (data) {
        setPinnedTags(data);
      }
      
      setManageDialogOpen(false);
      toast({
        title: "บันทึกสำเร็จ",
        description: "อัปเดต Tags ที่ปักหมุดแล้ว"
      });
    } catch (error) {
      console.error('Error saving pinned tags:', error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกได้"
      });
    } finally {
      setSavingTags(false);
    }
  };
  
  if (displayTags.length === 0) {
    return null;
  }
  
  const pinnedTagNames = new Set(pinnedTags.map(pt => pt.tag));
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Tags</span>
          <span className="text-xs text-muted-foreground">({displayTags.length})</span>
        </div>
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleOpenManageDialog}
          >
            <Settings2 className="w-3 h-3 mr-1" />
            จัดการ Tags
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedTag === null ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs rounded-full"
          onClick={() => onTagSelect(null)}
        >
          ทั้งหมด
        </Button>
        {displayTags.map((tag, index) => {
          const isPinned = pinnedTagNames.has(tag);
          const count = allTagsWithCounts.get(tag) || 0;
          
          return (
            <motion.div
              key={tag}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
            >
              <Button
                variant={selectedTag === tag ? "default" : isPinned ? "secondary" : "outline"}
                size="sm"
                className={`h-7 text-xs rounded-full ${isPinned ? 'bg-primary/20 border-primary/30 hover:bg-primary/30' : ''}`}
                onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
              >
                #{tag}
                <span className="ml-1 text-[10px] opacity-70">({count})</span>
              </Button>
            </motion.div>
          );
        })}
      </div>
      
      {/* Manage Tags Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>จัดการ Tags</DialogTitle>
            <DialogDescription>
              เลือก Tags ที่ต้องการแสดง (สูงสุด 20) และลากเพื่อจัดเรียงลำดับ
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Pinned Tags - Draggable */}
            {tempPinnedTags.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Tags ที่ปักหมุด ({tempPinnedTags.length}/20)</label>
                <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg min-h-[60px]">
                  {tempPinnedTags.map((tag) => (
                    <div
                      key={tag}
                      draggable
                      onDragStart={() => handleDragStart(tag)}
                      onDragOver={(e) => handleDragOver(e, tag)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs cursor-move transition-transform ${
                        draggedTag === tag ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <GripVertical className="w-3 h-3" />
                      #{tag}
                      <button
                        onClick={() => handleTogglePinTag(tag)}
                        className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Available Tags */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tags ทั้งหมด</label>
              <ScrollArea className="h-[200px] pr-3">
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const isPinned = tempPinnedTags.includes(tag);
                    const count = allTagsWithCounts.get(tag) || 0;
                    
                    return (
                      <button
                        key={tag}
                        onClick={() => handleTogglePinTag(tag)}
                        disabled={!isPinned && tempPinnedTags.length >= 20}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                          isPinned
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-foreground'
                        } ${!isPinned && tempPinnedTags.length >= 20 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isPinned ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        #{tag}
                        <span className="opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSavePinnedTags} disabled={savingTags}>
                {savingTags ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
