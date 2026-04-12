import { useState, useCallback } from 'react';

const STORAGE_KEY = 'tradevault-nav-config';

export interface NavItem {
  title: string;
  short: string;
  url: string;
  icon: any;
}

interface NavConfig {
  primaryUrls: string[];
}

const DEFAULT_PRIMARY_URLS = [
  '/dashboard',
  '/journal',
  '/new-trade',
  '/analytics',
  '/currency-strength',
];

function loadConfig(): NavConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.primaryUrls) && parsed.primaryUrls.length >= 3) {
        return parsed;
      }
    }
  } catch {}
  return { primaryUrls: DEFAULT_PRIMARY_URLS };
}

function saveConfig(config: NavConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useNavConfig(allItems: NavItem[]) {
  const [config, setConfig] = useState<NavConfig>(loadConfig);

  const primaryItems = config.primaryUrls
    .map(url => allItems.find(i => i.url === url))
    .filter(Boolean) as NavItem[];

  // Items not in primary = tools
  const toolsItems = allItems.filter(i => !config.primaryUrls.includes(i.url));

  const updatePrimaryUrls = useCallback((urls: string[]) => {
    const newConfig = { primaryUrls: urls };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, []);

  const resetToDefault = useCallback(() => {
    const newConfig = { primaryUrls: DEFAULT_PRIMARY_URLS };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, []);

  return {
    primaryItems,
    toolsItems,
    primaryUrls: config.primaryUrls,
    updatePrimaryUrls,
    resetToDefault,
    defaultUrls: DEFAULT_PRIMARY_URLS,
  };
}
