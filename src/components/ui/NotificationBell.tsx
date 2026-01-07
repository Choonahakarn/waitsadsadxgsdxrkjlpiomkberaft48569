import { useState, useEffect, useCallback, useMemo } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  reference_id: string | null;
  created_at: string;
  actor_id?: string | null;
}

interface AggregatedNotification {
  key: string;
  type: string;
  reference_id: string | null;
  ids: string[];
  count: number;
  latestCreatedAt: string;
  hasUnread: boolean;
  // For display
  displayTitle: string;
  displayMessage: string;
}

// Types that can be aggregated (same type + same reference_id)
const AGGREGATABLE_TYPES = ['like', 'comment', 'share'];

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  // Aggregate notifications by type + reference_id
  const aggregatedNotifications = useMemo(() => {
    const groups = new Map<string, Notification[]>();
    const result: AggregatedNotification[] = [];

    for (const notif of notifications) {
      // Only aggregate certain types that have a reference_id
      if (AGGREGATABLE_TYPES.includes(notif.type) && notif.reference_id) {
        const key = `${notif.type}:${notif.reference_id}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(notif);
      } else {
        // Non-aggregatable: treat as single item
        result.push({
          key: notif.id,
          type: notif.type,
          reference_id: notif.reference_id,
          ids: [notif.id],
          count: 1,
          latestCreatedAt: notif.created_at,
          hasUnread: !notif.is_read,
          displayTitle: notif.title,
          displayMessage: notif.message,
        });
      }
    }

    // Process aggregated groups
    for (const [key, items] of groups.entries()) {
      // Sort by created_at desc to get latest first
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const latest = items[0];
      const count = items.length;
      const hasUnread = items.some(n => !n.is_read);
      const ids = items.map(n => n.id);

      let displayTitle = latest.title;
      let displayMessage = latest.message;

      if (count > 1) {
        // Create aggregated display text
        const type = latest.type;
        if (type === 'like') {
          displayTitle = `มีคนถูกใจโพสต์ของคุณ ❤️`;
          displayMessage = `${count} คนถูกใจโพสต์ของคุณ`;
        } else if (type === 'comment') {
          displayTitle = `มีคนแสดงความคิดเห็น 💬`;
          displayMessage = `${count} ความคิดเห็นใหม่`;
        } else if (type === 'share') {
          displayTitle = `โพสต์ของคุณถูกแชร์! 🔁`;
          displayMessage = `${count} คนแชร์โพสต์ของคุณ`;
        }
      }

      result.push({
        key,
        type: latest.type,
        reference_id: latest.reference_id,
        ids,
        count,
        latestCreatedAt: latest.created_at,
        hasUnread,
        displayTitle,
        displayMessage,
      });
    }

    // Sort all by latest created_at
    result.sort((a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime());

    return result;
  }, [notifications]);

  const unreadCount = aggregatedNotifications.filter((n) => n.hasUnread).length;

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const deleted = payload.old as { id: string; user_id?: string };
          if (deleted.user_id && deleted.user_id !== user.id) return;
          setNotifications(prev => prev.filter(n => n.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
    }
  }, [user]);

  // Refresh when opening (and lightly poll while open)
  useEffect(() => {
    if (!open) return;

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [open, fetchNotifications]);

  const markAsRead = async (ids: string[]) => {
    // Mark all IDs in the aggregated group as read
    for (const id of ids) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
    }

    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "like":
        return "bg-pink-500";
      case "comment":
        return "bg-blue-500";
      case "share":
        return "bg-purple-500";
      case "follow":
        return "bg-teal-500";
      default:
        return "bg-blue-500";
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">การแจ้งเตือน</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary"
              onClick={markAllAsRead}
            >
              อ่านทั้งหมด
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {aggregatedNotifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              ไม่มีการแจ้งเตือน
            </p>
          ) : (
            <div className="divide-y">
              {aggregatedNotifications.map((notif) => (
                <div
                  key={notif.key}
                  className={`cursor-pointer p-4 transition-colors hover:bg-muted/50 ${
                    notif.hasUnread ? "bg-primary/5" : ""
                  }`}
                  onClick={() => markAsRead(notif.ids)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative mt-1">
                      <div
                        className={`h-2 w-2 rounded-full ${getTypeColor(notif.type)}`}
                      />
                      {notif.count > 1 && (
                        <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {notif.count > 9 ? '9+' : notif.count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notif.displayTitle}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notif.displayMessage}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notif.latestCreatedAt), {
                          addSuffix: true,
                          locale: th,
                        })}
                      </p>
                    </div>
                    {notif.hasUnread && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
