import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, PlusCircle, BarChart3, Brain, Settings, Gauge, TrendingUp, Bell, TrendingDown, AlertTriangle, CheckCircle2, Info
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const initialNotifications = [
  { id: 1, icon: TrendingUp, color: 'text-green-400', title: 'EUR/USD +2.3%', desc: 'Take profit hit — $124 profit', time: '5m ago', unread: true },
  { id: 2, icon: AlertTriangle, color: 'text-yellow-400', title: 'GBP weakening', desc: 'Strength dropped below 3.0', time: '12m ago', unread: true },
  { id: 3, icon: TrendingDown, color: 'text-red-400', title: 'USD/JPY -1.1%', desc: 'Stop loss triggered — $45 loss', time: '1h ago', unread: false },
  { id: 4, icon: CheckCircle2, color: 'text-primary', title: 'Journal saved', desc: 'Trade #47 entry added', time: '2h ago', unread: false },
  { id: 5, icon: Info, color: 'text-blue-400', title: 'Weekly report ready', desc: 'Win rate 68% — view analytics', time: '5h ago', unread: false },
];

const navItems = [
  { title: 'Dashboard', short: 'Home', url: '/', icon: LayoutDashboard },
  { title: 'Journal', short: 'Jrnl', url: '/journal', icon: BookOpen },
  { title: 'New Trade', short: 'New', url: '/new-trade', icon: PlusCircle },
  { title: 'Analytics', short: 'Ana', url: '/analytics', icon: BarChart3 },
  { title: 'Psychology', short: 'Psy', url: '/psychology', icon: Brain },
  { title: 'Strength', short: 'Str', url: '/currency-strength', icon: Gauge },
  { title: 'Settings', short: 'Set', url: '/settings', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => n.unread).length;

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
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
        <div className="flex items-center h-14 gap-6 max-w-[1400px] mx-auto w-full justify-between">
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

          {/* Desktop Nav Tabs — hidden on mobile */}
          <nav className="flex-1 overflow-x-auto scrollbar-hide hidden md:block">
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end={item.url === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 relative ${
                      isActive
                        ? 'text-primary bg-primary/10 shadow-[0_0_8px_hsla(145,63%,49%,0.15)]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Right side — Bell + Avatar */}
          <div className="flex items-center gap-2 shrink-0">
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
                    {notifications.map((n) => (
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
                            {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.desc}</p>
                          <span className="text-[10px] text-muted-foreground/60 mt-1 block">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border/30 px-4 py-2.5">
                    <button className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors w-full text-center">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Avatar className="w-8 h-8 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
              <AvatarFallback className="bg-card text-xs font-semibold text-foreground">
                TV
              </AvatarFallback>
            </Avatar>
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
          {navItems.map((item) => (
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
                  {/* Top glow indicator */}
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
        </div>
      </nav>
    </div>
  );
}
