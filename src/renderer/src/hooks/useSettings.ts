import { useState, useEffect, useCallback } from 'react';
import type { GlobalSettings } from '../../../shared/types';

export function useSettings() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const s = await window.api.getSettings();
      setSettings(s);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (data: Partial<GlobalSettings>) => {
    try {
      const updated = await window.api.updateSettings(data);
      setSettings(updated);
      return updated;
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  };

  return { settings, updateSettings, loadSettings };
}
