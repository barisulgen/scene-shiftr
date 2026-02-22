import { useState, useEffect, useCallback } from 'react';
import type { GlobalSettings } from '../../../shared/types';

export function useSettings() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  const loadSettings = useCallback(async () => {
    const s = await window.api.getSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (data: Partial<GlobalSettings>) => {
    const updated = await window.api.updateSettings(data);
    setSettings(updated);
    return updated;
  };

  return { settings, updateSettings, loadSettings };
}
