import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppSettings {
  community_enabled: boolean;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    community_enabled: true,
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['community_enabled']);

      if (error) throw error;

      const newSettings: AppSettings = {
        community_enabled: true,
      };

      data?.forEach((row) => {
        if (row.key === 'community_enabled') {
          newSettings.community_enabled = (row.value as any)?.enabled ?? true;
        }
      });

      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching app settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (key: keyof AppSettings, value: boolean) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: { enabled: value } })
        .eq('key', key);

      if (error) throw error;

      setSettings((prev) => ({ ...prev, [key]: value }));
      return true;
    } catch (error) {
      console.error('Error updating app setting:', error);
      return false;
    }
  };

  return {
    settings,
    loading,
    updateSetting,
    refetch: fetchSettings,
  };
}
