import { useCallback } from 'react';
import { useSyncedPreference } from '@/contexts/PreferencesContext';

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

const DEFAULT_CONFIG: NavConfig = {
  primaryUrls: DEFAULT_PRIMARY_URLS,
  maxMobile: DEFAULT_MAX_MOBILE,
  maxDesktop: DEFAULT_MAX_DESKTOP,
};

export function useNavConfig(allItems: NavItem[]) {
  // Cloud-synced via PreferencesContext (mirrors across devices in realtime)
  const [config, setConfig] = useSyncedPreference<NavConfig>('nav', DEFAULT_CONFIG);

  // Defensive normalisation — older cached configs may be missing fields
  const safeConfig: NavConfig = {
    primaryUrls: Array.isArray(config?.primaryUrls) && config.primaryUrls.length >= 3
      ? config.primaryUrls
      : DEFAULT_PRIMARY_URLS,
    maxMobile: typeof config?.maxMobile === 'number' ? config.maxMobile : DEFAULT_MAX_MOBILE,
    maxDesktop: typeof config?.maxDesktop === 'number' ? config.maxDesktop : DEFAULT_MAX_DESKTOP,
  };

  const primaryItems = safeConfig.primaryUrls
    .map(url => allItems.find(i => i.url === url))
    .filter(Boolean) as NavItem[];

  const toolsItems = allItems.filter(i => !safeConfig.primaryUrls.includes(i.url));

  const updateConfig = useCallback((updates: Partial<NavConfig>) => {
    setConfig({ ...safeConfig, ...updates });
  }, [safeConfig, setConfig]);

  const resetToDefault = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, [setConfig]);

  return {
    primaryItems,
    toolsItems,
    primaryUrls: safeConfig.primaryUrls,
    maxMobile: safeConfig.maxMobile,
    maxDesktop: safeConfig.maxDesktop,
    updateConfig,
    resetToDefault,
    defaultUrls: DEFAULT_PRIMARY_URLS,
  };
}
