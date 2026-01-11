import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface UserSuggestion {
  id: string;
  name: string;
  avatar_url: string | null;
  is_artist: boolean;
  is_verified: boolean;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onMentionsChange?: (mentions: string[]) => void;
  onSubmit?: () => void;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  onMentionsChange,
  onSubmit
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Extract mentions from text (supports Thai names with spaces)
  const extractMentions = useCallback((text: string): string[] => {
    const mentionRegex = /@([\w\u0E00-\u0E7F_]+(?:\s[\w\u0E00-\u0E7F_]+)*)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(m => m.slice(1)) : [];
  }, []);

  // Search for users
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      // Search in profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${query}%`)
        .limit(5);

      // Search in artist profiles
      const { data: artists } = await supabase
        .from('artist_profiles')
        .select('user_id, artist_name, avatar_url, is_verified')
        .ilike('artist_name', `%${query}%`)
        .limit(5);

      const userSuggestions: UserSuggestion[] = [];

      // Add profiles
      profiles?.forEach(p => {
        if (p.full_name) {
          userSuggestions.push({
            id: p.id,
            name: p.full_name,
            avatar_url: p.avatar_url,
            is_artist: false,
            is_verified: false
          });
        }
      });

      // Add artists (avoid duplicates)
      artists?.forEach(a => {
        if (!userSuggestions.find(u => u.id === a.user_id)) {
          userSuggestions.push({
            id: a.user_id,
            name: a.artist_name,
            avatar_url: a.avatar_url,
            is_artist: true,
            is_verified: a.is_verified || false
          });
        }
      });

      setSuggestions(userSuggestions);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }, []);

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(newCursorPos);

    // Check if we're typing a mention (supports Thai and other Unicode characters)
    const textBeforeCursor = newValue.slice(0, newCursorPos);
    const mentionMatch = textBeforeCursor.match(/@([\w\u0E00-\u0E7F_]*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowSuggestions(true);
      searchUsers(mentionMatch[1]);
    } else {
      setShowSuggestions(false);
      setMentionQuery("");
    }

    // Update mentions list
    if (onMentionsChange) {
      onMentionsChange(extractMentions(newValue));
    }
  };

  // Select a suggestion
  const selectSuggestion = (user: UserSuggestion) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    
    // Replace the @query with @username (supports Thai and other Unicode characters)
    const mentionMatch = textBeforeCursor.match(/@([\w\u0E00-\u0E7F_]*)$/);
    if (mentionMatch) {
      const newTextBefore = textBeforeCursor.slice(0, -mentionMatch[0].length);
      const mentionText = `@${user.name.replace(/\s/g, '_')} `;
      const newValue = newTextBefore + mentionText + textAfterCursor;
      
      onChange(newValue);
      setShowSuggestions(false);
      setMentionQuery("");
      
      // Update mentions list
      if (onMentionsChange) {
        onMentionsChange(extractMentions(newValue));
      }

      // Focus back on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = newTextBefore.length + mentionText.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key
    if (e.key === 'Enter') {
      // If suggestions are open, select the suggestion
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
        return;
      }
      
      // If no suggestions and onSubmit is provided, submit on Enter (without Shift)
      if (!e.shiftKey && onSubmit) {
        e.preventDefault();
        onSubmit();
        return;
      }
      // If Shift+Enter, allow default behavior (new line)
    }
    
    // Handle suggestion navigation
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
        >
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              onClick={() => selectSuggestion(user)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {user.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{user.name}</span>
                  {user.is_verified && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500 text-white border-0">
                      ✓
                    </Badge>
                  )}
                </div>
                {user.is_artist && (
                  <span className="text-xs text-muted-foreground">ศิลปิน</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Utility to render text with highlighted mentions (supports Thai names with spaces)
export function renderTextWithMentions(text: string, className?: string) {
  if (!text) return null;
  
  // Match @followed by Thai/word characters, including spaces between name parts
  // Pattern: @ + (Thai chars or word chars or underscores) + optionally (space + Thai chars or word chars)+
  const mentionPattern = /@([\w\u0E00-\u0E7F_]+(?:\s[\w\u0E00-\u0E7F_]+)*)/g;
  
  const parts: { text: string; isMention: boolean }[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = mentionPattern.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isMention: false });
    }
    // Add the mention
    parts.push({ text: match[0], isMention: true });
    lastIndex = mentionPattern.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isMention: false });
  }
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.isMention) {
          return (
            <span
              key={index}
              className="text-primary font-medium hover:underline cursor-pointer"
            >
              {part.text}
            </span>
          );
        }
        return part.text;
      })}
    </span>
  );
}

// Extract user IDs from mentions (for notifications, supports Thai names with spaces)
export async function getMentionedUserIds(text: string): Promise<string[]> {
  const mentionRegex = /@([\w\u0E00-\u0E7F_]+(?:\s[\w\u0E00-\u0E7F_]+)*)/g;
  const matches = text.match(mentionRegex);
  if (!matches) return [];

  const usernames = matches.map(m => m.slice(1).replace(/_/g, ' '));
  const userIds: string[] = [];

  for (const username of usernames) {
    // Check profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', username)
      .maybeSingle();
    
    if (profile) {
      userIds.push(profile.id);
      continue;
    }

    // Check artist profiles
    const { data: artist } = await supabase
      .from('artist_profiles')
      .select('user_id')
      .ilike('artist_name', username)
      .maybeSingle();
    
    if (artist) {
      userIds.push(artist.user_id);
    }
  }

  return [...new Set(userIds)];
}
