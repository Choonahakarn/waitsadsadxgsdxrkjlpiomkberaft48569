import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Hash, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxTags?: number;
}

const DEFAULT_MAX_TAGS = 20;

interface PopularTag {
  tag: string;
  count: number;
}

export function TagInput({ value, onChange, placeholder, maxTags = DEFAULT_MAX_TAGS }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current tags from value
  const currentTags = useMemo(() => {
    if (!value) return [];
    return value.split(/[,\s]+/)
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0);
  }, [value]);

  // Fetch popular tags on mount
  useEffect(() => {
    const fetchPopularTags = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('community_posts')
          .select('hashtags')
          .not('hashtags', 'is', null);

        if (data) {
          const tagCounts = new Map<string, number>();
          data.forEach(post => {
            if (post.hashtags && Array.isArray(post.hashtags)) {
              post.hashtags.forEach((tag: string) => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
              });
            }
          });

          const sortedTags = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([tag, count]) => ({ tag, count }));

          setPopularTags(sortedTags);
        }
      } catch (error) {
        console.error('Error fetching popular tags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularTags();
  }, []);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    const query = inputValue.toLowerCase().replace(/^#/, '');
    if (!query) {
      // Show popular tags when no input
      return popularTags.filter(pt => !currentTags.includes(pt.tag));
    }
    return popularTags
      .filter(pt => 
        pt.tag.toLowerCase().includes(query) && 
        !currentTags.includes(pt.tag)
      );
  }, [inputValue, popularTags, currentTags]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAtMaxTags = currentTags.length >= maxTags;

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().replace(/^#/, '');
    if (!cleanTag || currentTags.includes(cleanTag)) return;
    
    // Check max tags limit
    if (currentTags.length >= maxTags) {
      return;
    }

    const newTags = [...currentTags, cleanTag];
    onChange(newTags.join(', '));
    setInputValue('');
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = currentTags.filter(t => t !== tagToRemove);
    onChange(newTags.join(', '));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);

    // Check if user typed a separator (comma or space)
    if (newValue.endsWith(',') || newValue.endsWith(' ')) {
      const tag = newValue.slice(0, -1).trim();
      if (tag) {
        addTag(tag);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && currentTags.length > 0) {
      removeTag(currentTags[currentTags.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Tag count indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-wrap gap-1 flex-1">
          {currentTags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 pr-1"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-purple-500/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        {currentTags.length > 0 && (
          <span className={`text-xs ml-2 shrink-0 ${isAtMaxTags ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            {currentTags.length}/{maxTags}
          </span>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={isAtMaxTags ? `ถึงขีดจำกัด ${maxTags} Tags แล้ว` : (placeholder || "พิมพ์แล้วกด Enter หรือ , เพื่อเพิ่ม Tag")}
          className="pl-9"
          disabled={isAtMaxTags}
        />
      </div>

      {/* Suggestions dropdown - hide when at max tags */}
      {showSuggestions && !isAtMaxTags && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
          <div className="p-2">
            {/* Show "create new tag" option when user is typing */}
            {inputValue.trim() && !currentTags.includes(inputValue.trim().replace(/^#/, '')) && (
              <button
                type="button"
                onClick={() => {
                  addTag(inputValue);
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-primary/10 transition-colors flex items-center gap-2 border-b border-border mb-2 pb-2"
              >
                <span className="text-sm font-medium text-primary">
                  + สร้าง Tag ใหม่ "#{inputValue.trim().replace(/^#/, '')}"
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  กด Enter
                </span>
              </button>
            )}

            {/* Popular tags suggestions */}
            {filteredSuggestions.length > 0 && (
              <>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 px-2">
                  <TrendingUp className="h-3 w-3" />
                  <span>Tags ยอดนิยม</span>
                </div>
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.tag}
                    type="button"
                    onClick={() => {
                      addTag(suggestion.tag);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm text-purple-600 dark:text-purple-400">
                      #{suggestion.tag}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {suggestion.count} โพสต์
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Empty state */}
            {!inputValue && filteredSuggestions.length === 0 && (
              <div className="p-3 text-xs text-muted-foreground text-center">
                พิมพ์เพื่อสร้าง Tag ใหม่หรือค้นหา
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
