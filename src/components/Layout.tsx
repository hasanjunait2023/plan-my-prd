import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, PlusCircle, BarChart3, Brain, Settings, Gauge, TrendingUp, Bell, TrendingDown, AlertTriangle, CheckCircle2, Info, Crosshair, Zap, LogOut, Gem, Bitcoin, GitCompareArrows, Sun, Moon, Cable, LineChart, Shield, Newspaper, Target, Grid3X3, Pencil
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavConfig, type NavItem } from '@/hooks/useNavConfig';
import { NavEditDialog } from '@/components/NavEditDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { formatPairWithFlags } from '@/lib/pairFlags';
import { useIsMobile } from '@/hooks/use-mobile';

interface NotificationItem {
  id: string;
  icon: typeof TrendingUp;
  color: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  source: 'local' | 'db' | 'alert';
  url?: string;
  badge?: string;
  badgeColor?: string;
}

const staticNotifications: NotificationItem[] = [];

// All available nav items
const ALL_NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', short: 'Home', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Journal', short: 'Jrnl', url: '/journal', icon: BookOpen },
  { title: 'New Trade', short: 'New', url: '/new-trade', icon: PlusCircle },
  { title: 'Analytics', short: 'Ana', url: '/analytics', icon: BarChart3 },
  { title: 'Strength', short: 'Str', url: '/currency-strength', icon: Gauge },
  { title: 'Charts', short: 'Chart', url: '/charts', icon: LineChart },
  { title: 'EMA Scan', short: 'EMA', url: '/ema-scanner', icon: Crosshair },
  { title: 'Correlation', short: 'Corr', url: '/correlation-pairs', icon: GitCompareArrows },
  { title: 'News', short: 'News', url: '/news', icon: Newspaper },
  { title: 'Spike Alerts', short: 'Spike', url: '/spike-alerts', icon: AlertTriangle },
  { title: 'Intel', short: 'Intel', url: '/trade-intelligence', icon: Zap },
  { title: 'Psychology', short: 'Psych', url: '/psychology', icon: Brain },
  { title: 'Rules', short: 'Rules', url: '/rules', icon: Shield },
  { title: 'MT5', short: 'MT5', url: '/mt5', icon: Cable },
  { title: 'Commodities', short: 'Cmdty', url: '/commodities', icon: Gem },
  { title: 'Crypto', short: 'Crypto', url: '/crypto', icon: Bitcoin },
  { title: 'Habits', short: 'Habit', url: '/habits', icon: Target },
  { title: 'Settings', short: 'Set', url: '/settings', icon: Settings },
];

// Tools categories for the dropdown/sheet display
const toolsCategoryDefs = [
  {
    label: 'Market',
    icon: LineChart,
    urls: ['/charts', '/ema-scanner', '/correlation-pairs', '/news', '/spike-alerts'],
  },
  {
    label: 'Analysis',
    icon: Brain,
    urls: ['/trade-intelligence', '/psychology', '/rules'],
  },
  {
    label: 'Other',
    icon: Settings,
    urls: ['/mt5', '/commodities', '/crypto', '/habits', '/settings'],
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all duration-200"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
    </button>
  );
};

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { primaryItems, toolsItems, primaryUrls, maxMobile, maxDesktop, updateConfig, resetToDefault, defaultUrls } = useNavConfig(ALL_NAV_ITEMS);
  const [navEditOpen, setNavEditOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(staticNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => n.unread).length;

  // Check if any tools sub-page is active
  const isToolsActive = toolsItems.some(item => location.pathname === item.url);

  // Build tools categories from toolsItems only
  const toolsCategories = toolsCategoryDefs.map(cat => ({
    label: cat.label,
    icon: cat.icon,
    items: cat.urls
      .map(url => toolsItems.find(i => i.url === url))
      .filter(Boolean) as NavItem[],
  })).filter(cat => cat.items.length > 0);

  // Alert type config
  const alertTypeConfig: Record<string, { icon: typeof TrendingUp; color: string; badge: string; badgeColor: string; url: string }> = {
    news_alert: { icon: Newspaper, color: 'text-orange-400', badge: 'News', badgeColor: 'bg-orange-500/15 text-orange-400', url: '/news' },
    confluence: { icon: Zap, color: 'text-yellow-400', badge: 'Conf', badgeColor: 'bg-yellow-500/15 text-yellow-400', url: '/trade-intelligence' },
    ema_shift: { icon: Crosshair, color: 'text-blue-400', badge: 'EMA', badgeColor: 'bg-blue-500/15 text-blue-400', url: '/ema-scanner' },
    strength_threshold: { icon: Gauge, color: 'text-purple-400', badge: 'STR', badgeColor: 'bg-purple-500/15 text-purple-400', url: '/currency-strength' },
    spike: { icon: AlertTriangle, color: 'text-red-400', badge: 'Spike', badgeColor: 'bg-red-500/15 text-red-400', url: '/spike-alerts' },
    risk_breach: { icon: AlertTriangle, color: 'text-red-500', badge: 'Risk', badgeColor: 'bg-red-500/15 text-red-500', url: '/analytics' },
    session_reminder: { icon: Bell, color: 'text-cyan-400', badge: 'Session', badgeColor: 'bg-cyan-500/15 text-cyan-400', url: '/chart-analysis' },
    mt5_trade: { icon: Cable, color: 'text-indigo-400', badge: 'MT5', badgeColor: 'bg-indigo-500/15 text-indigo-400', url: '/mt5' },
    habit_reminder: { icon: Target, color: 'text-primary', badge: 'Habit', badgeColor: 'bg-primary/15 text-primary', url: '/habits' },
  };

  function parseAlertTitle(alertType: string, message: string, pair: string | null, metadata: any): string {
    if (metadata?.title) return metadata.title;
    if (pair) return pair;
    // Extract from Telegram-formatted message
    const boldMatch = message.match(/<b>([^<]+)<\/b>/);
    if (boldMatch) return boldMatch[1];
    return alertType.replace(/_/g, ' ');
  }

  function parseAlertDesc(message: string): string {
    // Strip HTML tags and emojis, take first ~80 chars
    return message.replace(/<[^>]+>/g, '').replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim().substring(0, 80);
  }

  // Fetch all notifications from DB
  const fetchAllNotifications = useCallback(async () => {
    try {
      // Fetch EMA scan notifications and alert_log in parallel
      const [emaRes, alertRes] = await Promise.all([
        supabase
          .from('ema_scan_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('alert_log')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(30),
      ]);

      const notifs: NotificationItem[] = [];

      // EMA notifications
      if (emaRes.data) {
        for (const n of emaRes.data) {
          notifs.push({
            id: n.id,
            icon: n.direction === 'BUY' ? TrendingUp : TrendingDown,
            color: n.direction === 'BUY' ? 'text-green-400' : 'text-red-400',
            title: `${formatPairWithFlags(n.pair)} ${n.direction}`,
            desc: n.message,
            time: timeAgo(n.created_at),
            unread: !n.is_read,
            source: 'db',
            url: '/ema-scanner',
            badge: 'EMA',
            badgeColor: 'bg-primary/10 text-primary',
          });
        }
      }

      // Alert log notifications
      if (alertRes.data) {
        for (const a of alertRes.data) {
          const config = alertTypeConfig[a.alert_type] || { icon: Bell, color: 'text-muted-foreground', badge: 'Alert', badgeColor: 'bg-muted text-muted-foreground', url: '/' };
          notifs.push({
            id: `alert-${a.id}`,
            icon: config.icon,
            color: config.color,
            title: parseAlertTitle(a.alert_type, a.message, a.pair, a.metadata),
            desc: parseAlertDesc(a.message),
            time: timeAgo(a.sent_at),
            unread: false, // alert_log doesn't have is_read — show as read
            source: 'alert',
            url: config.url,
            badge: config.badge,
            badgeColor: config.badgeColor,
          });
        }
      }

      // Sort all by most recent
      notifs.sort((a, b) => {
        // Use unread first, then by time string (approximate)
        if (a.unread !== b.unread) return a.unread ? -1 : 1;
        return 0; // Keep existing order within groups
      });

      setNotifications(notifs);
    } catch (e) {
      console.error('Fetch notifications error:', e);
    }
  }, []);

  useEffect(() => {
    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchAllNotifications]);

  useEffect(() => {
    const channel = supabase
      .channel('ema-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ema_scan_notifications',
      }, () => {
        fetchAllNotifications();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alert_log',
      }, () => {
        fetchAllNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAllNotifications]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    const notif = notifications.find(n => n.id === id);
    if (notif?.source === 'db') {
      await supabase
        .from('ema_scan_notifications')
        .update({ is_read: true })
        .eq('id', id);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    await supabase
      .from('ema_scan_notifications')
      .update({ is_read: true })
      .eq('is_read', false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Top Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/30 px-4 md:px-6">
        <div className="flex items-center h-14 gap-4 max-w-[1400px] mx-auto w-full justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-[0_0_12px_hsla(145,63%,49%,0.3)]">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">TradeVault</h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase leading-none">Pro</p>
            </div>
          </div>

          {/* Desktop Nav — Dynamic Primary Tabs + Tools Dropdown */}
          <nav className="flex-1 hidden md:flex items-center justify-center gap-1">
            {primaryItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                    isActive
                      ? 'text-primary bg-primary/15 border-primary/30 shadow-[0_0_12px_hsla(145,63%,49%,0.2)]'
                      : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-card/60'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            ))}

            {/* Tools Dropdown — only shows non-primary items */}
            {toolsItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 border relative ${
                      isToolsActive
                        ? 'text-primary bg-primary/15 border-primary/30 shadow-[0_0_12px_hsla(145,63%,49%,0.2)]'
                        : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-card/60'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4 shrink-0" />
                    <span>Tools</span>
                    {isToolsActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_hsla(145,63%,49%,0.5)]" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="w-[420px] p-4 bg-card/95 backdrop-blur-xl border-border/40 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                >
                  <div className="grid grid-cols-3 gap-4">
                    {toolsCategories.map((category) => (
                      <div key={category.label}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <category.icon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            {category.label}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {category.items.map((item) => {
                            const isActive = location.pathname === item.url;
                            return (
                              <button
                                key={item.url}
                                onClick={() => navigate(item.url)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 text-left w-full ${
                                  isActive
                                    ? 'text-primary bg-primary/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                }`}
                              >
                                <item.icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{item.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Edit Nav Button */}
            <button
              onClick={() => setNavEditOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-card/50 transition-all duration-200"
              title="Customize navigation"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </nav>

          {/* Right side — Theme Toggle + Bell + Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggleButton />
            <div className="relative">
              <button
                ref={bellRef}
                onClick={() => setShowNotifications(prev => !prev)}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all duration-200"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_hsla(145,63%,49%,0.5)]" />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div
                  ref={panelRef}
                  className="absolute right-0 top-full mt-2 w-80 max-h-[420px] overflow-y-auto rounded-xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-[60] animate-in fade-in-0 slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="py-1">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-muted-foreground">No notifications yet</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (n.unread) markAsRead(n.id);
                            if (n.url) {
                              navigate(n.url);
                              setShowNotifications(false);
                            }
                          }}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${
                            n.unread ? 'bg-primary/[0.03]' : ''
                          }`}
                        >
                          <div className={`mt-0.5 p-1.5 rounded-lg bg-muted/50 ${n.color}`}>
                            <n.icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground truncate">{n.title}</span>
                              {n.source === 'db' && (
                                <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-primary/10 text-primary shrink-0">EMA</span>
                              )}
                              {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.desc}</p>
                            <span className="text-[10px] text-muted-foreground/60 mt-1 block">{n.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-border/30 px-4 py-2.5">
                    <button className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors w-full text-center">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <Avatar className="w-8 h-8 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
                    <AvatarFallback className="bg-card text-xs font-semibold text-foreground">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card border-border/40">
                <div className="px-3 py-2 border-b border-border/30">
                  <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem
                  onClick={async () => { await signOut(); navigate('/auth'); }}
                  className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-md bg-background/90 border-t border-border/30"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around px-1 h-16 overflow-x-auto">
          {primaryItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded-xl min-w-[44px] transition-all duration-200 relative ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:scale-95'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full shadow-[0_0_8px_hsla(145,63%,49%,0.4)]" />
                  )}
                  <item.icon
                    className={`w-5 h-5 transition-all duration-200 ${
                      isActive ? 'drop-shadow-[0_0_6px_hsla(145,63%,49%,0.5)]' : ''
                    }`}
                  />
                  <span className={`text-[10px] font-medium leading-none ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {item.short}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* Tools Button — opens bottom sheet */}
          <button
            onClick={() => setMobileToolsOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded-xl min-w-[44px] transition-all duration-200 relative ${
              isToolsActive ? 'text-primary' : 'text-muted-foreground active:scale-95'
            }`}
          >
            {isToolsActive && (
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full shadow-[0_0_8px_hsla(145,63%,49%,0.4)]" />
            )}
            <div className="relative">
              <Grid3X3 className={`w-5 h-5 transition-all duration-200 ${
                isToolsActive ? 'drop-shadow-[0_0_6px_hsla(145,63%,49%,0.5)]' : ''
              }`} />
              {isToolsActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_hsla(145,63%,49%,0.5)]" />
              )}
            </div>
            <span className={`text-[10px] font-medium leading-none ${
              isToolsActive ? 'text-primary' : 'text-muted-foreground'
            }`}>
              Tools
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Tools Bottom Sheet */}
      <Sheet open={mobileToolsOpen} onOpenChange={setMobileToolsOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
          <SheetHeader className="pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-semibold text-foreground">Tools</SheetTitle>
              <button
                onClick={() => { setMobileToolsOpen(false); setNavEditOpen(true); }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Edit Nav
              </button>
            </div>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 pt-2 pb-4">
            {toolsCategories.map((category) => (
              <div key={category.label}>
                <div className="flex items-center gap-1.5 mb-2">
                  <category.icon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {category.label}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {category.items.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <button
                        key={item.url}
                        onClick={() => { navigate(item.url); setMobileToolsOpen(false); }}
                        className={`flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium transition-all duration-150 text-left w-full ${
                          isActive
                            ? 'text-primary bg-primary/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Nav Edit Dialog */}
      <NavEditDialog
        open={navEditOpen}
        onOpenChange={setNavEditOpen}
        allItems={ALL_NAV_ITEMS}
        primaryUrls={primaryUrls}
        onSave={(urls) => updateConfig({ primaryUrls: urls })}
        onReset={resetToDefault}
        defaultUrls={defaultUrls}
        maxItems={isMobile ? maxMobile : maxDesktop}
        currentMaxMobile={maxMobile}
        currentMaxDesktop={maxDesktop}
        onMaxChange={(mobile, desktop) => updateConfig({ maxMobile: mobile, maxDesktop: desktop })}
        isMobile={isMobile}
      />
    </div>
  );
}
