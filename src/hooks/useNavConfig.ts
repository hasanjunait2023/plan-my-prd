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
  maxMobile: number;
  maxDesktop: number;
}

const DEFAULT_PRIMARY_URLS = [
  '/dashboard',
  '/journal',
  '/new-trade',
  '/analytics',
  '/currency-strength',
];

const DEFAULT_MAX_MOBILE = 5;
const DEFAULT_MAX_DESKTOP = 6;

function loadConfig(): NavConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.primaryUrls) && parsed.primaryUrls.length >= 3) {
        return {
          primaryUrls: parsed.primaryUrls,
          maxMobile: parsed.maxMobile ?? DEFAULT_MAX_MOBILE,
          maxDesktop: parsed.maxDesktop ?? DEFAULT_MAX_DESKTOP,
        };
      }
    }
  } catch {}
  return { primaryUrls: DEFAULT_PRIMARY_URLS, maxMobile: DEFAULT_MAX_MOBILE, maxDesktop: DEFAULT_MAX_DESKTOP };
}

function saveConfig(config: NavConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useNavConfig(allItems: NavItem[]) {
  const [config, setConfig] = useState<NavConfig>(loadConfig);

  const primaryItems = config.primaryUrls
    .map(url => allItems.find(i => i.url === url))
    .filter(Boolean) as NavItem[];

  const toolsItems = allItems.filter(i => !config.primaryUrls.includes(i.url));

  const updateConfig = useCallback((updates: Partial<NavConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    const newConfig = { primaryUrls: DEFAULT_PRIMARY_URLS, maxMobile: DEFAULT_MAX_MOBILE, maxDesktop: DEFAULT_MAX_DESKTOP };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, []);

  return {
    primaryItems,
    toolsItems,
    primaryUrls: config.primaryUrls,
    maxMobile: config.maxMobile,
    maxDesktop: config.maxDesktop,
    updateConfig,
    resetToDefault,
    defaultUrls: DEFAULT_PRIMARY_URLS,
  };
}
