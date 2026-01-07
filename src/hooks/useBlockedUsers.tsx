import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchBlockedAndMutedUsers = useCallback(async () => {
    if (!user) {
      setBlockedUsers(new Set());
      setMutedUsers(new Set());
      setLoading(false);
      return;
    }

    try {
      // Fetch blocked users
      const { data: blockedData } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      // Fetch muted users
      const { data: mutedData } = await supabase
        .from('user_mutes')
        .select('muted_id')
        .eq('muter_id', user.id);

      if (blockedData) {
        setBlockedUsers(new Set(blockedData.map(b => b.blocked_id)));
      }

      if (mutedData) {
        setMutedUsers(new Set(mutedData.map(m => m.muted_id)));
      }
    } catch (error) {
      console.error('Error fetching blocked/muted users:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBlockedAndMutedUsers();
  }, [fetchBlockedAndMutedUsers]);

  const isUserHidden = useCallback((userId: string) => {
    return blockedUsers.has(userId) || mutedUsers.has(userId);
  }, [blockedUsers, mutedUsers]);

  const isUserBlocked = useCallback((userId: string) => {
    return blockedUsers.has(userId);
  }, [blockedUsers]);

  const isUserMuted = useCallback((userId: string) => {
    return mutedUsers.has(userId);
  }, [mutedUsers]);

  const refetch = useCallback(() => {
    fetchBlockedAndMutedUsers();
  }, [fetchBlockedAndMutedUsers]);

  return {
    blockedUsers,
    mutedUsers,
    isUserHidden,
    isUserBlocked,
    isUserMuted,
    loading,
    refetch
  };
}
