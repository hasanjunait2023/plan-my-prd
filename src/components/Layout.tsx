import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, PlusCircle, BarChart3, Brain, Settings, Gauge, TrendingUp, Bell, TrendingDown, AlertTriangle, CheckCircle2, Info, Crosshair, Zap, LogOut, Gem, Bitcoin, GitCompareArrows, Sun, Moon, Cable, LineChart, Shield, Newspaper, Target, Grid3X3
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { formatPairWithFlags } from '@/lib/pairFlags';

interface NotificationItem {
  id: string;
  icon: typeof TrendingUp;
  color: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  source: 'local' | 'db';
}

const staticNotifications: NotificationItem[] = [
  { id: 'local-1', icon: CheckCircle2, color: 'text-primary', title: 'Journal saved', desc: 'Trade #47 entry added', time: '2h ago', unread: false, source: 'local' },
  { id: 'local-2', icon: Info, color: 'text-blue-400', title: 'Weekly report ready', desc: 'Win rate 68% — view analytics', time: '5h ago', unread: false, source: 'local' },
];

// Primary nav items — always visible
const primaryNavItems = [
  { title: 'Dashboard', short: 'Home', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Journal', short: 'Jrnl', url: '/journal', icon: BookOpen },
  { title: 'New Trade', short: 'New', url: '/new-trade', icon: PlusCircle },
  { title: 'Analytics', short: 'Ana', url: '/analytics', icon: BarChart3 },
  { title: 'Strength', short: 'Str', url: '/currency-strength', icon: Gauge },
];

// Tools dropdown — categorized
const toolsCategories = [
  {
    label: 'Market',
    icon: LineChart,
    items: [
      { title: 'Charts', url: '/charts', icon: LineChart },
      { title: 'EMA Scan', url: '/ema-scanner', icon: Crosshair },
      { title: 'Correlation', url: '/correlation-pairs', icon: GitCompareArrows },
      { title: 'News', url: '/news', icon: Newspaper },
      { title: 'Spike Alerts', url: '/spike-alerts', icon: AlertTriangle },
    ],
  },
  {
    label: 'Analysis',
    icon: Brain,
    items: [
      { title: 'Intel', url: '/trade-intelligence', icon: Zap },
      { title: 'Psychology', url: '/psychology', icon: Brain },
      { title: 'Rules', url: '/rules', icon: Shield },
    ],
  },
  {
    label: 'Other',
    icon: Settings,
    items: [
      { title: 'MT5', url: '/mt5', icon: Cable },
      { title: 'Commodities', url: '/commodities', icon: Gem },
      { title: 'Crypto', url: '/crypto', icon: Bitcoin },
      { title: 'Habits', url: '/habits', icon: Target },
      { title: 'Settings', url: '/settings', icon: Settings },
    ],
  },
];

const allToolsItems = toolsCategories.flatMap(c => c.items);
const allNavItems = [...primaryNavItems, ...allToolsItems];

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
  const [notifications, setNotifications] = useState<NotificationItem[]>(staticNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => n.unread).length;

  // Check if any tools sub-page is active
  const isToolsActive = allToolsItems.some(item => location.pathname === item.url);

  // Fetch EMA scan notifications from DB
  const fetchDbNotifications = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('ema_scan_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!data) return;

      const dbNotifs: NotificationItem[] = data.map((n: any) => ({
        id: n.id,
        icon: n.direction === 'BUY' ? TrendingUp : n.direction === 'SELL' ? TrendingDown : AlertTriangle,
        color: n.direction === 'BUY' ? 'text-green-400' : n.direction === 'SELL' ? 'text-red-400' : 'text-yellow-400',
        title: `${formatPairWithFlags(n.pair)} ${n.direction}`,
        desc: n.message,
        time: timeAgo(n.created_at),
        unread: !n.is_read,
        source: 'db' as const,
      }));

      setNotifications([...dbNotifs, ...staticNotifications]);
    } catch (e) {
      console.error('Fetch notifications error:', e);
    }
  }, []);

  useEffect(() => {
    fetchDbNotifications();
    const interval = setInterval(fetchDbNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchDbNotifications]);

  useEffect(() => {
    const channel = supabase
      .channel('ema-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ema_scan_notifications',
      }, () => {
        fetchDbNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDbNotifications]);

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

          {/* Desktop Nav — Primary Tabs + Tools Dropdown */}
          <nav className="flex-1 hidden md:flex items-center justify-center gap-1">
            {primaryNavItems.map((item) => (
              <NavLink
                key={item.title}
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

            {/* Tools Dropdown */}
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
                              key={item.title}
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
                          onClick={() => n.unread && markAsRead(n.id)}
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
        <div className="flex items-center justify-around px-1 h-16">
          {primaryNavItems.slice(0, 4).map((item) => (
            <NavLink
              key={item.title}
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
            <SheetTitle className="text-sm font-semibold text-foreground">Tools</SheetTitle>
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
                        key={item.title}
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
    </div>
  );
}
